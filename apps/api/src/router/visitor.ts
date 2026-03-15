import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { router, schoolFeatureProcedure } from "../trpc";

const visitPurposeEnum = z.enum([
	"MEETING",
	"MAINTENANCE",
	"DELIVERY",
	"VOLUNTEERING",
	"INSPECTION",
	"PARENT_VISIT",
	"CONTRACTOR",
	"OTHER",
]);

const dbsTypeEnum = z.enum(["BASIC", "STANDARD", "ENHANCED", "ENHANCED_BARRED"]);

function computeDbsStatus(
	expiryDate: Date | null | undefined,
): "VALID" | "EXPIRING_SOON" | "EXPIRED" {
	if (!expiryDate) return "VALID";
	const now = new Date();
	const diffMs = expiryDate.getTime() - now.getTime();
	const diffDays = diffMs / (1000 * 60 * 60 * 24);
	if (diffDays < 0) return "EXPIRED";
	if (diffDays < 60) return "EXPIRING_SOON";
	return "VALID";
}

export const visitorRouter = router({
	signIn: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				name: z.string().min(1),
				organisation: z.string().optional(),
				phone: z.string().optional(),
				email: z.string().optional(),
				isRegular: z.boolean().default(false),
				purpose: visitPurposeEnum,
				visitingStaff: z.string().optional(),
				badgeNumber: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "visitorManagement");

			let visitor = await ctx.prisma.visitor.findFirst({
				where: { schoolId: input.schoolId, name: input.name },
			});

			if (visitor) {
				visitor = await ctx.prisma.visitor.update({
					where: { id: visitor.id },
					data: {
						organisation: input.organisation ?? undefined,
						phone: input.phone ?? undefined,
						email: input.email ?? undefined,
						isRegular: input.isRegular,
					},
				});
			} else {
				visitor = await ctx.prisma.visitor.create({
					data: {
						schoolId: input.schoolId,
						name: input.name,
						organisation: input.organisation ?? null,
						phone: input.phone ?? null,
						email: input.email ?? null,
						isRegular: input.isRegular,
					},
				});
			}

			const log = await ctx.prisma.visitorLog.create({
				data: {
					schoolId: input.schoolId,
					visitorId: visitor.id,
					purpose: input.purpose,
					visitingStaff: input.visitingStaff ?? null,
					badgeNumber: input.badgeNumber ?? null,
					signInAt: new Date(),
					signedInBy: ctx.user.id,
				},
			});

			let dbsWarning = false;
			if (input.purpose === "VOLUNTEERING") {
				const validDbs = await ctx.prisma.volunteerDbs.findFirst({
					where: {
						visitorId: visitor.id,
						status: "VALID",
					},
				});
				if (!validDbs) {
					dbsWarning = true;
				}
			}

			return { log, dbsWarning };
		}),

	signOut: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				logId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "visitorManagement");

			return ctx.prisma.visitorLog.update({
				where: { id: input.logId },
				data: {
					signOutAt: new Date(),
					signedOutBy: ctx.user.id,
				},
			});
		}),

	searchVisitors: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				query: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "visitorManagement");

			return ctx.prisma.visitor.findMany({
				where: {
					schoolId: input.schoolId,
					name: { contains: input.query, mode: "insensitive" },
				},
				orderBy: [{ isRegular: "desc" }, { name: "asc" }],
				take: 10,
			});
		}),

	getOnSite: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "visitorManagement");

			return ctx.prisma.visitorLog.findMany({
				where: {
					schoolId: input.schoolId,
					signOutAt: null,
				},
				include: { visitor: true },
				orderBy: { signInAt: "desc" },
			});
		}),

	addOrUpdateDbs: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				name: z.string().min(1),
				dbsNumber: z.string().min(1),
				dbsType: dbsTypeEnum,
				issueDate: z.date(),
				expiryDate: z.date().optional(),
				visitorId: z.string().optional(),
				userId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "visitorManagement");

			const status = computeDbsStatus(input.expiryDate ?? null);

			return ctx.prisma.volunteerDbs.create({
				data: {
					schoolId: input.schoolId,
					name: input.name,
					dbsNumber: input.dbsNumber,
					dbsType: input.dbsType,
					issueDate: input.issueDate,
					expiryDate: input.expiryDate ?? null,
					visitorId: input.visitorId ?? null,
					userId: input.userId ?? null,
					verifiedBy: ctx.user.id,
					verifiedAt: new Date(),
					status,
				},
			});
		}),

	getDbsRegister: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "visitorManagement");

			return ctx.prisma.volunteerDbs.findMany({
				where: { schoolId: input.schoolId },
				orderBy: { createdAt: "desc" },
			});
		}),

	getVisitorHistory: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				limit: z.number().min(1).max(100).default(20),
				cursor: z.string().optional(),
				startDate: z.date().optional(),
				endDate: z.date().optional(),
				name: z.string().optional(),
				purpose: visitPurposeEnum.optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "visitorManagement");

			// biome-ignore lint/suspicious/noExplicitAny: dynamic Prisma where clause
			const where: any = { schoolId: input.schoolId };

			if (input.startDate || input.endDate) {
				where.signInAt = {};
				if (input.startDate) where.signInAt.gte = input.startDate;
				if (input.endDate) where.signInAt.lte = input.endDate;
			}

			if (input.name) {
				where.visitor = {
					name: { contains: input.name, mode: "insensitive" },
				};
			}

			if (input.purpose) {
				where.purpose = input.purpose;
			}

			const logs = await ctx.prisma.visitorLog.findMany({
				where,
				include: { visitor: true },
				orderBy: { signInAt: "desc" },
				take: input.limit + 1,
				...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
			});

			let nextCursor: string | undefined;
			if (logs.length > input.limit) {
				const next = logs.pop();
				nextCursor = next?.id;
			}

			return { logs, nextCursor };
		}),

	getFireRegister: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "visitorManagement");

			const visitors = await ctx.prisma.visitorLog.findMany({
				where: {
					schoolId: input.schoolId,
					signOutAt: null,
				},
				include: { visitor: true },
				orderBy: { signInAt: "desc" },
			});

			const staffCount = await ctx.prisma.staffMember.count({
				where: { schoolId: input.schoolId },
			});

			return { visitors, staffCount };
		}),
});
