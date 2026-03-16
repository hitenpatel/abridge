import type { WebSocket } from "ws";

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const MAX_MISSED_PONGS = 3;

interface ConnectionMeta {
	ws: WebSocket;
	isAlive: boolean;
	missedPongs: number;
}

class ConnectionManager {
	private connections = new Map<string, Set<ConnectionMeta>>();
	private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

	constructor() {
		this.startHeartbeat();
	}

	add(userId: string, ws: WebSocket): void {
		let userConns = this.connections.get(userId);
		if (!userConns) {
			userConns = new Set();
			this.connections.set(userId, userConns);
		}

		const meta: ConnectionMeta = { ws, isAlive: true, missedPongs: 0 };
		userConns.add(meta);

		ws.on("pong", () => {
			meta.isAlive = true;
			meta.missedPongs = 0;
		});
	}

	remove(userId: string, ws: WebSocket): void {
		const userConns = this.connections.get(userId);
		if (!userConns) return;

		for (const meta of userConns) {
			if (meta.ws === ws) {
				userConns.delete(meta);
				break;
			}
		}

		if (userConns.size === 0) {
			this.connections.delete(userId);
		}
	}

	isOnline(userId: string): boolean {
		const userConns = this.connections.get(userId);
		return !!userConns && userConns.size > 0;
	}

	getConnections(userId: string): Set<ConnectionMeta> | undefined {
		return this.connections.get(userId);
	}

	broadcast(userId: string, message: object): void {
		const userConns = this.connections.get(userId);
		if (!userConns) return;

		const data = JSON.stringify(message);
		for (const meta of userConns) {
			if (meta.ws.readyState === meta.ws.OPEN) {
				meta.ws.send(data);
			}
		}
	}

	private startHeartbeat(): void {
		this.heartbeatTimer = setInterval(() => {
			for (const [userId, userConns] of this.connections) {
				for (const meta of userConns) {
					if (!meta.isAlive) {
						meta.missedPongs++;
						if (meta.missedPongs >= MAX_MISSED_PONGS) {
							meta.ws.terminate();
							userConns.delete(meta);
							continue;
						}
					}

					meta.isAlive = false;
					if (meta.ws.readyState === meta.ws.OPEN) {
						meta.ws.ping();
					}
				}

				if (userConns.size === 0) {
					this.connections.delete(userId);
				}
			}
		}, HEARTBEAT_INTERVAL);
	}

	destroy(): void {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
	}
}

export const connectionManager = new ConnectionManager();
