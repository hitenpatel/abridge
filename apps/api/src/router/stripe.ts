import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, schoolAdminProcedure } from "../trpc";
import { stripe } from "../lib/stripe";

export const stripeRouter = router({
	createOnboardingLink: schoolAdminProcedure
		.input(z.object({ schoolId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const school = await ctx.prisma.school.findUnique({
				where: { id: input.schoolId },
				select: { name: true, email: true, stripeAccountId: true } as any,
			});

			if (!school) {
				throw new TRPCError({ code: "NOT_FOUND", message: "School not found" });
			}

			let stripeAccountId = (school as any).stripeAccountId;

			if (!stripeAccountId) {
				// Create a new connected account
				const account = await (stripe.accounts.create as any)({
					type: "express",
					country: "GB",
					email: school.email || undefined,
					capabilities: {
						card_payments: { requested: true },
						transfers: { requested: true },
					},
					business_type: "non_profit",
					company: {
						name: school.name,
					},
				});

				stripeAccountId = account.id;

				await (ctx.prisma.school as any).update({
					where: { id: input.schoolId },
					data: { stripeAccountId },
				});
			}

			// Create onboarding link
			const accountLink = await (stripe.accountLinks.create as any)({
				account: stripeAccountId,
				refresh_url: `${process.env.WEB_URL}/dashboard/settings/payments`,
				return_url: `${process.env.WEB_URL}/dashboard/settings/payments`,
				type: "account_onboarding",
			});

			return { url: (accountLink as any).url };
		}),

	getStripeStatus: schoolAdminProcedure
		.input(z.object({ schoolId: z.string() }))
		.query(async ({ ctx, input }) => {
			const school = await ctx.prisma.school.findUnique({
				where: { id: input.schoolId },
				select: { stripeAccountId: true } as any,
			});

			if (!(school as any)?.stripeAccountId) {
				return { isConnected: false };
			}

			const account = await (stripe.accounts.retrieve as any)((school as any).stripeAccountId);

			return {
				isConnected: true,
				detailsSubmitted: (account as any).details_submitted,
				chargesEnabled: (account as any).charges_enabled,
				payoutsEnabled: (account as any).payouts_enabled,
			};
		}),
});
