import Stripe from "stripe";
import { logger } from "./logger";

if (!process.env.STRIPE_SECRET_KEY) {
	logger.warn("STRIPE_SECRET_KEY is not set. Stripe functionality will be unavailable.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "mock_key", {
	apiVersion: "2026-01-28.clover" as any,
	typescript: true,
});
