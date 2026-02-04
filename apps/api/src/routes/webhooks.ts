import { prisma } from "@schoolconnect/db";
import type { FastifyInstance } from "fastify";
import type Stripe from "stripe";
import { stripe } from "../lib/stripe";

export async function webhookRoutes(server: FastifyInstance) {
	server.post("/api/webhooks/stripe", async (req, res) => {
		const signature = req.headers["stripe-signature"] as string;
		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

		if (!webhookSecret) {
			server.log.error("STRIPE_WEBHOOK_SECRET is not set");
			return res.status(500).send("Webhook secret not configured");
		}

		let event: Stripe.Event;

		try {
			// use rawBody provided by fastify-raw-body plugin
			event = stripe.webhooks.constructEvent(
				(req as { rawBody: string | Buffer }).rawBody,
				signature,
				webhookSecret,
			);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Unknown error";
			server.log.error(`Webhook signature verification failed: ${message}`);
			return res.status(400).send(`Webhook Error: ${message}`);
		}

		server.log.info(`Received Stripe event: ${event.type}`);

		if (event.type === "checkout.session.completed") {
			const session = event.data.object as Stripe.Checkout.Session;
			const metadata = session.metadata as {
				paymentId?: string;
				cartItems?: string;
				paymentItemId?: string;
				childId?: string;
			} | null;

			if (metadata?.paymentId) {
				await prisma.$transaction(async (tx) => {
					// 1. Update Payment status
					const receiptNumber = `SC-${new Date().getFullYear()}-${Math.floor(
						1000 + Math.random() * 9000,
					)}`;

					await tx.payment.update({
						where: { id: metadata.paymentId },
						data: {
							status: "COMPLETED",
							completedAt: new Date(),
							receiptNumber,
						},
					});

					// 2. Create PaymentLineItems
					if (metadata.cartItems) {
						const cartItems = JSON.parse(metadata.cartItems) as Array<{
							paymentItemId: string;
							childId?: string;
						}>;

						for (const item of cartItems) {
							const paymentItem = await tx.paymentItem.findUnique({
								where: { id: item.paymentItemId },
							});

							if (paymentItem) {
								await tx.paymentLineItem.create({
									data: {
										paymentId: metadata.paymentId as string,
										paymentItemId: item.paymentItemId,
										childId: item.childId,
										amount: paymentItem.amount,
									},
								});
							}
						}
					} else if (metadata.paymentItemId) {
						// Fallback to old single-item logic
						await tx.paymentLineItem.create({
							data: {
								paymentId: metadata.paymentId as string,
								paymentItemId: metadata.paymentItemId,
								childId: metadata.childId,
								amount: session.amount_total || 0,
							},
						});
					}
				});

				server.log.info(`Payment ${metadata.paymentId} fulfilled successfully`);
			}
		}

		return res.status(200).send({ received: true });
	});
}
