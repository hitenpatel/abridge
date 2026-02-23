import { check } from "k6";
import { trpcQuery } from "./helpers.js";

export const options = {
	vus: 5,
	duration: "30s",
	thresholds: {
		http_req_duration: ["p(95)<500", "p(99)<1500"],
		http_req_failed: ["rate<0.01"],
	},
};

export default function () {
	const res = trpcQuery("health.check");

	check(res, {
		"status is 200": (r) => r.status === 200,
		"response has status field": (r) => {
			const body = JSON.parse(r.body);
			return body.result?.data?.status !== undefined;
		},
	});
}
