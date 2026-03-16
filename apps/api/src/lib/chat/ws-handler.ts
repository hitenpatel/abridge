import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { auth } from "../auth";
import { logger } from "../logger";
import { connectionManager } from "./connection-manager";

interface WsIncoming {
	type: "chat:message" | "chat:typing" | "chat:read";
	conversationId?: string;
	body?: string;
	isTyping?: boolean;
}

export function registerChatWebSocket(app: FastifyInstance, prisma: PrismaClient): void {
	app.get("/ws/chat", { websocket: true }, async (socket, req) => {
		// 1. Auth: extract session token from query string
		const url = new URL(req.url, `http://${req.headers.host}`);
		const token = url.searchParams.get("token");

		if (!token) {
			socket.close(4001, "Missing authentication token");
			return;
		}

		let session: { user: { id: string; name?: string | null } } | null = null;
		try {
			session = await auth.api.getSession({
				headers: {
					cookie: `better-auth.session_token=${token}`,
				},
			});
		} catch {
			// session remains null
		}

		if (!session?.user) {
			socket.close(4001, "Invalid session");
			return;
		}

		const userId = session.user.id;

		// 2. Add to connection manager
		connectionManager.add(userId, socket);
		logger.info({ userId }, "WebSocket connected");

		// Broadcast online status
		connectionManager.broadcast(userId, {
			type: "chat:online",
			userId,
			online: true,
		});

		// 3. Handle incoming messages
		socket.on("message", async (raw) => {
			let msg: WsIncoming;
			try {
				msg = JSON.parse(raw.toString());
			} catch {
				socket.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
				return;
			}

			try {
				switch (msg.type) {
					case "chat:message": {
						if (!msg.conversationId || !msg.body) break;
						if (msg.body.length > 2000) {
							socket.send(
								JSON.stringify({
									type: "error",
									message: "Message too long (max 2000 characters)",
								}),
							);
							break;
						}

						// Verify participant
						const conversation = await prisma.chatConversation.findUnique({
							where: { id: msg.conversationId },
						});

						if (
							!conversation ||
							(conversation.parentId !== userId && conversation.staffId !== userId)
						) {
							socket.send(
								JSON.stringify({ type: "error", message: "Not a participant" }),
							);
							break;
						}

						// Create message
						const chatMessage = await prisma.chatMessage.create({
							data: {
								conversationId: msg.conversationId,
								senderId: userId,
								body: msg.body,
							},
						});

						// Update lastMessageAt and reopen if closed
						await prisma.chatConversation.update({
							where: { id: msg.conversationId },
							data: {
								lastMessageAt: new Date(),
								closedAt: null,
							},
						});

						// Broadcast to recipient
						const recipientId =
							conversation.parentId === userId
								? conversation.staffId
								: conversation.parentId;

						const outgoing = {
							type: "chat:message",
							conversationId: msg.conversationId,
							message: {
								id: chatMessage.id,
								senderId: userId,
								body: chatMessage.body,
								createdAt: chatMessage.createdAt,
								readAt: null,
							},
						};

						connectionManager.broadcast(recipientId, outgoing);
						// Also echo back to sender (for multi-tab sync)
						connectionManager.broadcast(userId, outgoing);
						break;
					}

					case "chat:typing": {
						if (!msg.conversationId) break;

						const conv = await prisma.chatConversation.findUnique({
							where: { id: msg.conversationId },
						});

						if (!conv || (conv.parentId !== userId && conv.staffId !== userId)) break;

						const recipientId =
							conv.parentId === userId ? conv.staffId : conv.parentId;

						connectionManager.broadcast(recipientId, {
							type: "chat:typing",
							conversationId: msg.conversationId,
							userId,
							isTyping: msg.isTyping ?? true,
						});
						break;
					}

					case "chat:read": {
						if (!msg.conversationId) break;

						// Update all unread messages sent by the other participant
						await prisma.chatMessage.updateMany({
							where: {
								conversationId: msg.conversationId,
								senderId: { not: userId },
								readAt: null,
							},
							data: { readAt: new Date() },
						});

						const conv = await prisma.chatConversation.findUnique({
							where: { id: msg.conversationId },
						});

						if (conv) {
							const recipientId =
								conv.parentId === userId ? conv.staffId : conv.parentId;
							connectionManager.broadcast(recipientId, {
								type: "chat:read",
								conversationId: msg.conversationId,
								readBy: userId,
							});
						}
						break;
					}
				}
			} catch (err) {
				logger.error({ err, type: msg.type }, "WebSocket message handler error");
				socket.send(JSON.stringify({ type: "error", message: "Internal error" }));
			}
		});

		// 4. On disconnect: remove from manager
		socket.on("close", () => {
			connectionManager.remove(userId, socket);
			logger.info({ userId }, "WebSocket disconnected");

			// Broadcast offline status if no more connections
			if (!connectionManager.isOnline(userId)) {
				// We can't broadcast to the disconnected user, but we could
				// broadcast to their conversation partners. For now, the
				// online status is checked on demand.
			}
		});
	});
}
