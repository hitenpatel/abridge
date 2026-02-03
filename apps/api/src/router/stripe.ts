import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { stripe } from "../lib/stripe";
import { router, schoolAdminProcedure } from "../trpc";

export const stripeRouter = router({
	createOnboardingLink: schoolAdminProcedure.mutation(async ({ ctx, input }) => {
		const school = await ctx.prisma.school.findUnique({
			where: { id: input.schoolId },
			select: { stripeAccountId: true, name: true, email: true },
		});

		if (!school) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "School not found",
			});
		}

		let stripeAccountId = school.stripeAccountId;

		if (!stripeAccountId) {
			const account = await stripe.accounts.create({
				type: "express",
				email: school.email || undefined,
				capabilities: {
					card_payments: { requested: true },
					transfers: { requested: true },
				},
				metadata: {
					schoolId: input.schoolId,
				},
			});

			stripeAccountId = account.id;

			await ctx.prisma.school.update({
				where: { id: input.schoolId },
				data: { stripeAccountId },
			});
		}

		const webUrl = process.env.WEB_URL || "http://localhost:3000";

		const accountLink = await stripe.accountLinks.create({
			account: stripeAccountId,
			refresh_url: `${webUrl}/admin/settings/payments`,
			return_url: `${webUrl}/admin/settings/payments`,
			type: "account_onboarding",
		});

		return { url: accountLink.url };
	}),

	getStripeStatus: schoolAdminProcedure.query(async ({ ctx, input }) => {
		const school = await ctx.prisma.school.findUnique({
			where: { id: input.schoolId },
			select: { stripeAccountId: true },
		});

		if (!school?.stripeAccountId) {
			return {
				isConnected: false,
				detailsSubmitted: false,
				chargesEnabled: false,
			};
		}

		const account = await stripe.accounts.retrieve(school.stripeAccountId);

		return {
			isConnected: true,
			detailsSubmitted: account.details_submitted,
			chargesEnabled: account.charges_enabled,
		};
	}),
});
