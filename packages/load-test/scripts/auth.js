import { check, sleep } from "k6";
import http from "k6/http";
import { BASE_URL } from "./helpers.js";

export const options = {
	stages: [
		{ duration: "30s", target: 50 },
		{ duration: "1m", target: 50 },
		{ duration: "30s", target: 0 },
	],
	thresholds: {
		http_req_duration: ["p(95)<500", "p(99)<1500"],
		http_req_failed: ["rate<0.01"],
	},
};

export default function () {
	const email = `parent${(__VU % 100)}@loadtest.com`;
	const password = "LoadTest123!";

	const res = http.post(
		`${BASE_URL}/api/auth/sign-in/email`,
		JSON.stringify({ email, password }),
		{ headers: { "Content-Type": "application/json" } },
	);

	check(res, {
		"login returns 200 or 401": (r) => r.status === 200 || r.status === 401,
		"response time < 500ms": (r) => r.timings.duration < 500,
	});

	sleep(1);
}
