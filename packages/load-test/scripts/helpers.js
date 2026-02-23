import http from "k6/http";

export const BASE_URL = __ENV.API_BASE_URL || "http://localhost:4000";

export function login(email, password) {
	const res = http.post(
		`${BASE_URL}/api/auth/sign-in/email`,
		JSON.stringify({ email, password }),
		{ headers: { "Content-Type": "application/json" } },
	);

	if (res.status !== 200) {
		console.error(`Login failed for ${email}: ${res.status} ${res.body}`);
		return null;
	}

	const cookies = res.cookies;
	const sessionCookie = cookies["better-auth.session_token"];
	if (!sessionCookie || !sessionCookie[0]) {
		console.error(`No session cookie for ${email}`);
		return null;
	}

	return {
		cookie: `better-auth.session_token=${sessionCookie[0].value}`,
	};
}

export function trpcQuery(path, input, authCookie) {
	const inputParam = input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : "";
	return http.get(`${BASE_URL}/trpc/${path}${inputParam}`, {
		headers: {
			"Content-Type": "application/json",
			...(authCookie ? { Cookie: authCookie } : {}),
		},
	});
}

export function trpcMutation(path, input, authCookie) {
	return http.post(
		`${BASE_URL}/trpc/${path}`,
		JSON.stringify(input),
		{
			headers: {
				"Content-Type": "application/json",
				...(authCookie ? { Cookie: authCookie } : {}),
			},
		},
	);
}
