import { withSentryConfig } from "@sentry/nextjs";
import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
	output: "standalone",
	transpilePackages: ["@schoolconnect/db"],
	turbopack: {
		root: "../..",
	},
	typescript: {
		// API code is type-checked separately via its own build process.
		// The web tsconfig includes API router files for tRPC types, which
		// causes Turbopack to surface pre-existing API type issues.
		ignoreBuildErrors: true,
	},
};

const pwaConfig = withPWA({
	dest: "public",
	register: true,
	skipWaiting: true,
	disable: process.env.NODE_ENV === "development",
	buildExcludes: [/middleware-manifest\.json$/],
});

const sentryConfig = withSentryConfig(pwaConfig(nextConfig), {
	silent: true,
	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,
	authToken: process.env.SENTRY_AUTH_TOKEN,
	disableSourceMapUpload: !process.env.SENTRY_AUTH_TOKEN,
});

export default sentryConfig;
