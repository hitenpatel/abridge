export const TEST_CREDENTIALS = {
	parent: {
		email: "parent@test.com",
		password: "testpass123",
	},
	staff: {
		email: "staff@test.com",
		password: "testpass123",
	},
} as const;

export const TEST_URLS = {
	api: process.env.API_URL || "http://localhost:4000",
	web: process.env.WEB_URL || "http://localhost:3000",
} as const;
