import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
	console.warn("STRIPE_SECRET_KEY is not set. Stripe functionality will be unavailable.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "mock_key", {
	apiVersion: "2023-10-16",
	typescript: true,
});
