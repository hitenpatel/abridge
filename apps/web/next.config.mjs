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

export default pwaConfig(nextConfig);
