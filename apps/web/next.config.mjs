import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
	transpilePackages: ["@schoolconnect/db"],
};

const pwaConfig = withPWA({
	dest: "public",
	register: true,
	skipWaiting: true,
	disable: process.env.NODE_ENV === "development",
	buildExcludes: [/middleware-manifest\.json$/],
});

export default pwaConfig(nextConfig);
