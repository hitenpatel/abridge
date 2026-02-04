import { extractText } from "../services/ocr";
import { elasticsearchClient } from "./elasticsearch";

export const INDICES = {
	MESSAGES: "messages",
	EVENTS: "events",
	PAYMENTS: "payment_items",
} as const;

export async function ensureIndices() {
	// Messages Index
	const messagesExists = await elasticsearchClient.indices.exists({
		index: INDICES.MESSAGES,
	});

	if (!messagesExists) {
		await elasticsearchClient.indices.create({
			index: INDICES.MESSAGES,
			mappings: {
				properties: {
					schoolId: { type: "keyword" },
					subject: { type: "text" },
					body: { type: "text" },
					category: { type: "keyword" },
					createdAt: { type: "date" },
				},
			},
		});
		console.log(`Created index: ${INDICES.MESSAGES}`);
	}

	// Events Index
	const eventsExists = await elasticsearchClient.indices.exists({
		index: INDICES.EVENTS,
	});

	if (!eventsExists) {
		await elasticsearchClient.indices.create({
			index: INDICES.EVENTS,
			mappings: {
				properties: {
					schoolId: { type: "keyword" },
					title: { type: "text" },
					body: { type: "text" },
					category: { type: "keyword" },
					startDate: { type: "date" },
					endDate: { type: "date" },
				},
			},
		});
		console.log(`Created index: ${INDICES.EVENTS}`);
	}

	// Payment Items Index
	const paymentsExists = await elasticsearchClient.indices.exists({
		index: INDICES.PAYMENTS,
	});

	if (!paymentsExists) {
		await elasticsearchClient.indices.create({
			index: INDICES.PAYMENTS,
			mappings: {
				properties: {
					schoolId: { type: "keyword" },
					title: { type: "text" },
					description: { type: "text" },
					category: { type: "keyword" },
					amount: { type: "integer" },
					dueDate: { type: "date" },
				},
			},
		});
		console.log(`Created index: ${INDICES.PAYMENTS}`);
	}
}

export async function indexMessage(
	message: {
		id: string;
		schoolId: string;
		subject: string;
		body: string;
		category: string;
		createdAt: Date;
	},
	attachments?: Array<{ buffer: Buffer; mimeType: string }>,
) {
	let indexedBody = message.body;

	if (attachments && attachments.length > 0) {
		const attachmentTexts = await Promise.all(
			attachments.map(async (att) => {
				try {
					return await extractText(att.buffer, att.mimeType);
				} catch (error) {
					console.error("Error extracting text from attachment:", error);
					return "";
				}
			}),
		);
		const combinedAttachmentText = attachmentTexts.filter(Boolean).join("\n\n");
		if (combinedAttachmentText) {
			indexedBody = `${indexedBody}\n\n--- Attachment Content ---\n\n${combinedAttachmentText}`;
		}
	}

	await elasticsearchClient.index({
		index: INDICES.MESSAGES,
		id: message.id,
		document: {
			schoolId: message.schoolId,
			subject: message.subject,
			body: indexedBody,
			category: message.category,
			createdAt: message.createdAt,
		},
	});
}

export async function indexEvent(event: {
	id: string;
	schoolId: string;
	title: string;
	body?: string | null;
	category: string;
	startDate: Date;
	endDate?: Date | null;
}) {
	await elasticsearchClient.index({
		index: INDICES.EVENTS,
		id: event.id,
		document: {
			schoolId: event.schoolId,
			title: event.title,
			body: event.body,
			category: event.category,
			startDate: event.startDate,
			endDate: event.endDate,
		},
	});
}

export async function indexPaymentItem(paymentItem: {
	id: string;
	schoolId: string;
	title: string;
	description?: string | null;
	category: string;
	amount: number;
	dueDate?: Date | null;
}) {
	await elasticsearchClient.index({
		index: INDICES.PAYMENTS,
		id: paymentItem.id,
		document: {
			schoolId: paymentItem.schoolId,
			title: paymentItem.title,
			description: paymentItem.description,
			category: paymentItem.category,
			amount: paymentItem.amount,
			dueDate: paymentItem.dueDate,
		},
	});
}

export interface SearchResult {
	id: string;
	index: string;
	score: number;
	source: Record<string, unknown>;
	highlight?: Record<string, string[]>;
}

export async function searchAll(query: string, schoolId: string): Promise<SearchResult[]> {
	const result = await elasticsearchClient.search({
		index: [INDICES.MESSAGES, INDICES.EVENTS, INDICES.PAYMENTS],
		query: {
			bool: {
				must: [
					{
						multi_match: {
							query,
							fields: ["subject", "body", "title", "description"],
							fuzziness: "AUTO",
						},
					},
				],
				filter: [
					{
						term: {
							schoolId: schoolId,
						},
					},
				],
			},
		},
		highlight: {
			fields: {
				subject: {},
				body: {},
				title: {},
				description: {},
			},
			pre_tags: ['<mark class="bg-yellow-200 text-gray-900 rounded-sm px-0.5">'],
			post_tags: ["</mark>"],
		},
	});

	return result.hits.hits.map((hit) => ({
		id: hit._id as string,
		index: hit._index,
		score: hit._score || 0,
		source: (hit._source as Record<string, unknown>) || {},
		highlight: hit.highlight as Record<string, string[]> | undefined,
	}));
}
