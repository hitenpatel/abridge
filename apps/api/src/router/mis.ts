import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { getAdapter } from "../lib/mis/adapter-factory";
import { router, schoolAdminProcedure, schoolFeatureProcedure } from "../trpc";

export const misRouter = router({
	setupConnection: schoolAdminProcedure
		.input(
			z.object({
				schoolId: z.string(),
				provider: z.enum(["SIMS", "ARBOR", "BROMCOM", "SCHOLARPACK", "CSV_MANUAL"]),
				apiUrl: z.string().url().max(2048).optional(),
				credentials: z.string().min(1).max(4096),
				syncFrequency: z.enum(["HOURLY", "TWICE_DAILY", "DAILY", "MANUAL"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// schoolAdminProcedure doesn't load features, load manually
			const school = await ctx.prisma.school.findUnique({
				where: { id: input.schoolId },
				select: { misIntegrationEnabled: true },
			});
			if (!school) {
				throw new TRPCError({ code: "NOT_FOUND", message: "School not found" });
			}
			if (!school.misIntegrationEnabled) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "MIS Integration is disabled for this school",
				});
			}

			const connection = await ctx.prisma.misConnection.upsert({
				where: { schoolId: input.schoolId },
				create: {
					schoolId: input.schoolId,
					provider: input.provider,
					apiUrl: input.apiUrl ?? null,
					credentials: input.credentials,
					syncFrequency: input.syncFrequency,
					status: "CONNECTED",
				},
				update: {
					provider: input.provider,
					apiUrl: input.apiUrl ?? null,
					credentials: input.credentials,
					syncFrequency: input.syncFrequency,
					status: "CONNECTED",
				},
			});

			// Never return credentials to the client
			return {
				id: connection.id,
				schoolId: connection.schoolId,
				provider: connection.provider,
				apiUrl: connection.apiUrl,
				syncFrequency: connection.syncFrequency,
				status: connection.status,
			};
		}),

	testConnection: schoolFeatureProcedure
		.input(z.object({ schoolId: z.string() }))
		.query(async ({ ctx }) => {
			assertFeatureEnabled(ctx, "misIntegration");

			const connection = await ctx.prisma.misConnection.findUnique({
				where: { schoolId: ctx.schoolId },
			});

			if (!connection) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No MIS connection configured",
				});
			}

			const adapter = getAdapter(connection.provider, connection.apiUrl, connection.credentials);
			const success = await adapter.testConnection();
			return { success };
		}),

	uploadStudentsCsv: schoolFeatureProcedure
		.input(z.object({ schoolId: z.string(), csvData: z.string().min(1).max(5_000_000) }))
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "misIntegration");

			const connection = await ctx.prisma.misConnection.findUnique({
				where: { schoolId: ctx.schoolId },
			});

			if (!connection) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No MIS connection configured",
				});
			}

			const startedAt = new Date();
			const syncLog = await ctx.prisma.misSyncLog.create({
				data: {
					connectionId: connection.id,
					syncType: "STUDENTS",
					status: "STARTED",
					startedAt,
				},
			});

			try {
				const adapter = getAdapter(connection.provider, connection.apiUrl, connection.credentials);
				const result = await adapter.syncStudents(input.csvData);

				let created = 0;
				let updated = 0;
				let skipped = 0;

				for (const record of result.records) {
					// Match by firstName + lastName + DOB within the school
					const existing = await ctx.prisma.child.findFirst({
						where: {
							schoolId: ctx.schoolId,
							firstName: record.firstName,
							lastName: record.lastName,
							dateOfBirth: record.dateOfBirth,
						},
					});

					if (existing) {
						await ctx.prisma.child.update({
							where: { id: existing.id },
							data: {
								yearGroup: record.yearGroup,
								className: record.className ?? existing.className,
							},
						});
						updated++;
					} else {
						await ctx.prisma.child.create({
							data: {
								schoolId: ctx.schoolId,
								firstName: record.firstName,
								lastName: record.lastName,
								dateOfBirth: record.dateOfBirth,
								yearGroup: record.yearGroup,
								className: record.className ?? null,
							},
						});
						created++;
					}
				}

				skipped = result.errors.length;
				const completedAt = new Date();

				await ctx.prisma.misSyncLog.update({
					where: { id: syncLog.id },
					data: {
						status: result.errors.length > 0 ? "PARTIAL" : "SUCCESS",
						recordsProcessed: result.records.length + result.errors.length,
						recordsCreated: created,
						recordsUpdated: updated,
						recordsSkipped: skipped,
						errors: result.errors.length > 0 ? result.errors : undefined,
						completedAt,
						durationMs: completedAt.getTime() - startedAt.getTime(),
					},
				});

				await ctx.prisma.misConnection.update({
					where: { id: connection.id },
					data: {
						lastSyncAt: completedAt,
						lastSyncStatus: result.errors.length > 0 ? "PARTIAL" : "SUCCESS",
						lastSyncError: null,
					},
				});

				return {
					created,
					updated,
					skipped,
					errors: result.errors,
					total: result.records.length + result.errors.length,
				};
			} catch (error) {
				const completedAt = new Date();
				const errorMessage = error instanceof Error ? error.message : "Unknown error";

				await ctx.prisma.misSyncLog.update({
					where: { id: syncLog.id },
					data: {
						status: "FAILED",
						errors: [{ message: errorMessage }],
						completedAt,
						durationMs: completedAt.getTime() - startedAt.getTime(),
					},
				});

				await ctx.prisma.misConnection.update({
					where: { id: connection.id },
					data: {
						lastSyncAt: completedAt,
						lastSyncStatus: "FAILED",
						lastSyncError: errorMessage,
					},
				});

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Student sync failed: ${errorMessage}`,
				});
			}
		}),

	uploadAttendanceCsv: schoolFeatureProcedure
		.input(z.object({ schoolId: z.string(), csvData: z.string().min(1).max(5_000_000) }))
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "misIntegration");

			const connection = await ctx.prisma.misConnection.findUnique({
				where: { schoolId: ctx.schoolId },
			});

			if (!connection) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No MIS connection configured",
				});
			}

			const startedAt = new Date();
			const syncLog = await ctx.prisma.misSyncLog.create({
				data: {
					connectionId: connection.id,
					syncType: "ATTENDANCE",
					status: "STARTED",
					startedAt,
				},
			});

			try {
				const adapter = getAdapter(connection.provider, connection.apiUrl, connection.credentials);
				const result = await adapter.syncAttendance(input.csvData);

				let created = 0;
				const updated = 0;
				let skipped = 0;

				for (const record of result.records) {
					// Find the child by name + DOB
					const child = await ctx.prisma.child.findFirst({
						where: {
							schoolId: ctx.schoolId,
							firstName: record.studentFirstName,
							lastName: record.studentLastName,
							dateOfBirth: record.studentDob,
						},
					});

					if (!child) {
						skipped++;
						continue;
					}

					// Upsert attendance record
					await ctx.prisma.attendanceRecord.upsert({
						where: {
							childId_date_session: {
								childId: child.id,
								date: record.date,
								session: record.session,
							},
						},
						create: {
							childId: child.id,
							schoolId: ctx.schoolId,
							date: record.date,
							session: record.session,
							mark: record.mark,
						},
						update: {
							mark: record.mark,
						},
					});

					// Count as created for simplicity (upsert doesn't tell us which)
					created++;
				}

				skipped += result.errors.length;
				const completedAt = new Date();

				await ctx.prisma.misSyncLog.update({
					where: { id: syncLog.id },
					data: {
						status: result.errors.length > 0 ? "PARTIAL" : "SUCCESS",
						recordsProcessed: result.records.length + result.errors.length,
						recordsCreated: created,
						recordsUpdated: updated,
						recordsSkipped: skipped,
						errors: result.errors.length > 0 ? result.errors : undefined,
						completedAt,
						durationMs: completedAt.getTime() - startedAt.getTime(),
					},
				});

				await ctx.prisma.misConnection.update({
					where: { id: connection.id },
					data: {
						lastSyncAt: completedAt,
						lastSyncStatus: result.errors.length > 0 ? "PARTIAL" : "SUCCESS",
						lastSyncError: null,
					},
				});

				return {
					created,
					updated,
					skipped,
					errors: result.errors,
					total: result.records.length + result.errors.length,
				};
			} catch (error) {
				const completedAt = new Date();
				const errorMessage = error instanceof Error ? error.message : "Unknown error";

				await ctx.prisma.misSyncLog.update({
					where: { id: syncLog.id },
					data: {
						status: "FAILED",
						errors: [{ message: errorMessage }],
						completedAt,
						durationMs: completedAt.getTime() - startedAt.getTime(),
					},
				});

				await ctx.prisma.misConnection.update({
					where: { id: connection.id },
					data: {
						lastSyncAt: completedAt,
						lastSyncStatus: "FAILED",
						lastSyncError: errorMessage,
					},
				});

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Attendance sync failed: ${errorMessage}`,
				});
			}
		}),

	getConnectionStatus: schoolFeatureProcedure
		.input(z.object({ schoolId: z.string() }))
		.query(async ({ ctx }) => {
			assertFeatureEnabled(ctx, "misIntegration");

			const connection = await ctx.prisma.misConnection.findUnique({
				where: { schoolId: ctx.schoolId },
			});

			if (!connection) {
				return null;
			}

			return {
				id: connection.id,
				provider: connection.provider,
				status: connection.status,
				syncFrequency: connection.syncFrequency,
				lastSyncAt: connection.lastSyncAt,
				lastSyncStatus: connection.lastSyncStatus,
				lastSyncError: connection.lastSyncError,
			};
		}),

	getSyncHistory: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				limit: z.number().int().min(1).max(100).default(20),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "misIntegration");

			const connection = await ctx.prisma.misConnection.findUnique({
				where: { schoolId: ctx.schoolId },
			});

			if (!connection) {
				return [];
			}

			const logs = await ctx.prisma.misSyncLog.findMany({
				where: { connectionId: connection.id },
				orderBy: { startedAt: "desc" },
				take: input.limit,
			});

			return logs;
		}),

	disconnect: schoolAdminProcedure
		.input(z.object({ schoolId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// schoolAdminProcedure doesn't load features, check manually
			const school = await ctx.prisma.school.findUnique({
				where: { id: input.schoolId },
				select: { misIntegrationEnabled: true },
			});
			if (!school) {
				throw new TRPCError({ code: "NOT_FOUND", message: "School not found" });
			}
			if (!school.misIntegrationEnabled) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "MIS Integration is disabled for this school",
				});
			}

			const connection = await ctx.prisma.misConnection.findUnique({
				where: { schoolId: input.schoolId },
			});

			if (!connection) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No MIS connection configured",
				});
			}

			const updated = await ctx.prisma.misConnection.update({
				where: { id: connection.id },
				data: { status: "DISCONNECTED" },
			});

			return updated;
		}),
});
