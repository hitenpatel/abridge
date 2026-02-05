import type { FastifyInstance } from "fastify";
import { generatePaymentReceiptPDF } from "../lib/pdf-generator";
import { getSessionFromRequest } from "../lib/session-helper";

export async function pdfRoutes(fastify: FastifyInstance) {
	// Download payment receipt as PDF
	fastify.get("/api/pdf/payment-receipt/:paymentId", async (request, reply) => {
		try {
			const { paymentId } = request.params as { paymentId: string };

			// Authenticate user
			const session = await getSessionFromRequest(request);
			if (!session) {
				return reply.status(401).send({ error: "Unauthorized" });
			}

			// Fetch payment with all necessary data
			const payment = await fastify.prisma.payment.findUnique({
				where: { id: paymentId },
				include: {
					user: {
						select: {
							id: true,
							email: true,
							name: true,
						},
					},
					lineItems: {
						include: {
							paymentItem: {
								include: {
									school: true,
								},
							},
							child: true,
						},
					},
				},
			});

			if (!payment) {
				return reply.status(404).send({ error: "Payment not found" });
			}

			// Verify ownership
			if (payment.userId !== session.user.id) {
				return reply.status(403).send({ error: "Access denied" });
			}

			// Ensure payment is completed
			if (payment.status !== "COMPLETED") {
				return reply.status(400).send({ error: "Payment not completed yet" });
			}

			// Get school from first line item
			const firstItem = payment.lineItems[0];
			if (!firstItem) {
				return reply.status(400).send({ error: "Payment has no line items" });
			}

			const school = firstItem.paymentItem.school;

			// Prepare PDF data
			const pdfData = {
				receiptNumber: payment.receiptNumber || payment.id,
				paymentDate: payment.completedAt || payment.createdAt,
				totalAmount: payment.totalAmount,
				providerName: school.name,
				ofstedUrn: school.urn,
				items: payment.lineItems.map((li) => ({
					childName: li.child ? `${li.child.firstName} ${li.child.lastName}` : "N/A",
					description: li.paymentItem.title,
					amount: li.amount,
				})),
			};

			// Generate PDF
			const pdf = generatePaymentReceiptPDF(pdfData);

			// Set headers for PDF download
			reply.header("Content-Type", "application/pdf");
			reply.header(
				"Content-Disposition",
				`attachment; filename="receipt-${pdfData.receiptNumber}.pdf"`,
			);

			// Stream PDF to response
			reply.send(pdf);
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({ error: "Failed to generate PDF" });
		}
	});
}
