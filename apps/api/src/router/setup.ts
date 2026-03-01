import { randomBytes } from "node:crypto";
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
				setupKey: z.string(),
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

			const token = `initial-setup-${randomBytes(16).toString("hex")}`;
			const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours
			const id = `inv_${randomBytes(8).toString("hex")}`;

			await ctx.prisma.$executeRaw`
				INSERT INTO invitations (id, email, "schoolId", role, token, "expiresAt", "createdAt")
				VALUES (${id}, ${input.adminEmail}, ${school.id}, 'ADMIN', ${token}, ${expiresAt}, NOW())
			`;

			return { success: true, schoolId: school.id };
		}),
});
