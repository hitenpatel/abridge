import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
	console.warn("STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
	// @ts-ignore - Let stripe handle the versioning
	apiVersion: "2023-10-16",
	typescript: true,
});
