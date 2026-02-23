import { check, sleep } from "k6";
import { login, trpcQuery } from "./helpers.js";

export const options = {
	stages: [
		{ duration: "1m", target: 500 },
		{ duration: "3m", target: 500 },
		{ duration: "1m", target: 0 },
	],
	thresholds: {
		http_req_duration: ["p(95)<500", "p(99)<1500"],
		http_req_failed: ["rate<0.01"],
		http_reqs: ["rate>100"],
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

	const rand = Math.random();

	if (rand < 0.3) {
		trpcQuery("dashboard.getSummary", undefined, data.cookie);
	} else if (rand < 0.55) {
		trpcQuery("messaging.listReceived", { limit: 20 }, data.cookie);
	} else if (rand < 0.7) {
		trpcQuery("user.listChildren", undefined, data.cookie);
	} else if (rand < 0.85) {
		trpcQuery("payments.listOutstandingPayments", undefined, data.cookie);
	} else if (rand < 0.95) {
		const res = trpcQuery("health.check");
		check(res, { "health 200": (r) => r.status === 200 });
	} else {
		trpcQuery("messaging.listConversations", { limit: 20 }, data.cookie);
	}

	sleep(0.3 + Math.random() * 0.7);
}
