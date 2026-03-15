import { describe, expect, it } from "vitest";

describe("API documentation (Swagger)", () => {
	it("@fastify/swagger is importable", async () => {
		const mod = await import("@fastify/swagger");
		expect(mod.default).toBeDefined();
	});

	it("@fastify/swagger-ui is importable", async () => {
		const mod = await import("@fastify/swagger-ui");
		expect(mod.default).toBeDefined();
	});

	it("swagger config produces valid OpenAPI 3.x spec", async () => {
		const Fastify = (await import("fastify")).default;
		const swagger = (await import("@fastify/swagger")).default;
		const swaggerUi = (await import("@fastify/swagger-ui")).default;

		const app = Fastify();

		await app.register(swagger, {
			openapi: {
				info: {
					title: "SchoolConnect API",
					description: "School-parent communication platform API",
					version: "1.0.0",
				},
				servers: [{ url: "http://localhost:4000" }],
			},
		});

		await app.register(swaggerUi, { routePrefix: "/api/docs" });

		await app.ready();

		const spec = app.swagger();
		expect(spec).toBeDefined();
		expect(spec.openapi).toMatch(/^3\./);
		expect(spec.info.title).toBe("SchoolConnect API");
		expect(spec.info.version).toBe("1.0.0");
		expect(spec.servers).toHaveLength(1);
		expect(spec.servers?.[0]?.url).toBe("http://localhost:4000");

		await app.close();
	});
});
