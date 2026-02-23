import { check, sleep } from "k6";
import { login, trpcQuery } from "./helpers.js";

export const options = {
	stages: [
		{ duration: "30s", target: 100 },
		{ duration: "2m", target: 100 },
		{ duration: "30s", target: 0 },
	],
	thresholds: {
		http_req_duration: ["p(95)<500", "p(99)<1500"],
		http_req_failed: ["rate<0.01"],
	},
};

export function setup() {
	const session = login("parent0@loadtest.com", "LoadTest123!");
	return { cookie: session?.cookie };
}

export default function (data) {
	if (!data.cookie) {
		sleep(1);
		return;
	}

	const received = trpcQuery("messaging.listReceived", { limit: 20 }, data.cookie);
	check(received, {
		"received messages 200": (r) => r.status === 200,
	});

	const conversations = trpcQuery("messaging.listConversations", { limit: 20 }, data.cookie);
	check(conversations, {
		"conversations 200": (r) => r.status === 200,
	});

	sleep(0.5);
}
