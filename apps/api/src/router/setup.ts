import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../trpc";

export const setupRouter = router({
	createInitialSchool: publicProcedure
		.input(
			z.object({
				name: z.string().min(1),
				urn: z.string().min(1),
				adminEmail: z.string().email(),
				setupKey: z.string(), // Simple protection
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (input.setupKey !== process.env.SETUP_KEY) {
				throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid setup key" });
			}

			// Check if school already exists
			const existing = await ctx.prisma.school.findUnique({
				where: { urn: input.urn },
			});

			if (existing) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "School already exists" });
			}

			const school = await ctx.prisma.school.create({
				data: {
					name: input.name,
					urn: input.urn,
				},
			});

			// Create a special invitation for the admin
			// Using raw SQL to bypass Prisma client generation issues in this environment
			const token = `initial-setup-${Math.random().toString(36).substring(7)}`;
			const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours
			const id = `inv_${Math.random().toString(36).substring(2, 11)}`;

			await ctx.prisma.$executeRawUnsafe(
				`INSERT INTO invitations (id, email, "schoolId", role, token, "expiresAt", "createdAt") 
				 VALUES ($1, $2, $3, 'ADMIN', $4, $5, NOW())`,
				id,
				input.adminEmail,
				school.id,
				token,
				expiresAt,
			);

			return { success: true, schoolId: school.id };
		}),
});
