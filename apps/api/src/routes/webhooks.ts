import type { FastifyInstance } from "fastify";
import { stripe } from "../lib/stripe";
import { prisma } from "@schoolconnect/db";

export async function webhookRoutes(server: FastifyInstance) {
	server.post("/api/webhooks/stripe", async (req, res) => {
		const signature = req.headers["stripe-signature"] as string;
		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

		if (!webhookSecret) {
			server.log.error("STRIPE_WEBHOOK_SECRET is not set");
			return res.status(500).send("Webhook secret not configured");
		}

		let event: any;

		try {
			// use rawBody provided by fastify-raw-body plugin
			event = stripe.webhooks.constructEvent(
				(req as any).rawBody,
				signature,
				webhookSecret
			);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Unknown error";
			server.log.error(`Webhook signature verification failed: ${message}`);
			return res.status(400).send(`Webhook Error: ${message}`);
		}

		server.log.info(`Received Stripe event: ${event.type}`);

		if (event.type === "checkout.session.completed") {
			const session = event.data.object as { metadata: any; amount_total: number; receipt_number?: string };
			const metadata = session.metadata;

			if (metadata?.paymentId) {
				await prisma.$transaction(async (tx) => {
					// 1. Update Payment status
					await tx.payment.update({
						where: { id: metadata.paymentId },
						data: {
							status: "COMPLETED",
							completedAt: new Date(),
							receiptNumber: session.receipt_number || `REC-${Date.now()}`,
						},
					});

					// 2. Create PaymentLineItem
					await tx.paymentLineItem.create({
						data: {
							paymentId: metadata.paymentId,
							paymentItemId: metadata.paymentItemId,
							childId: metadata.childId,
							amount: session.amount_total,
						},
					});
				});
				
				server.log.info(`Payment ${metadata.paymentId} fulfilled successfully`);
			}
		}

		return res.status(200).send({ received: true });
	});
}
