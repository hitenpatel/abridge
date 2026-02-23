import { check, sleep } from "k6";
import { login, trpcQuery } from "./helpers.js";

export const options = {
	stages: [
		{ duration: "1m", target: 500 },
		{ duration: "2m", target: 500 },
		{ duration: "1m", target: 1000 },
		{ duration: "1m", target: 0 },
	],
	thresholds: {
		http_req_duration: ["p(95)<1500"],
		http_req_failed: ["rate<0.05"],
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

	if (rand < 0.4) {
		trpcQuery("dashboard.getSummary", undefined, data.cookie);
	} else if (rand < 0.7) {
		trpcQuery("messaging.listReceived", { limit: 20 }, data.cookie);
	} else {
		trpcQuery("health.check");
	}

	sleep(0.2 + Math.random() * 0.5);
}
