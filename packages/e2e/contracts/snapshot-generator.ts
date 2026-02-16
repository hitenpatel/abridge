import { writeFileSync } from "node:fs";
import type { AnyProcedure, AnyRouter } from "@trpc/server";
import type { z } from "zod";
import { appRouter } from "../../../apps/api/src/router/index.js";

type ProcedureSnapshot = {
	input: string;
	output: string;
};

type ContractSnapshot = Record<string, ProcedureSnapshot>;

function zodToString(schema: z.ZodTypeAny): string {
	try {
		return JSON.stringify(schema._def, null, 2);
	} catch {
		return schema.toString();
	}
}

function extractProcedures(router: AnyRouter, prefix = ""): ContractSnapshot {
	const snapshot: ContractSnapshot = {};

	for (const [key, value] of Object.entries(router._def.procedures || {})) {
		const path = prefix ? `${prefix}.${key}` : key;
		const procedure = value as AnyProcedure;

		const inputSchema = procedure._def.inputs?.[0];
		const outputSchema = (procedure._def as Record<string, unknown>).output;

		snapshot[path] = {
			input: inputSchema ? zodToString(inputSchema) : "void",
			output: outputSchema ? zodToString(outputSchema) : "unknown",
		};
	}

	// Recursively process nested routers
	for (const [key, value] of Object.entries(router._def.record || {})) {
		if (value && typeof value === "object" && "_def" in value) {
			const nestedRouter = value as AnyRouter;
			const nestedSnapshot = extractProcedures(nestedRouter, prefix ? `${prefix}.${key}` : key);
			Object.assign(snapshot, nestedSnapshot);
		}
	}

	return snapshot;
}

async function main() {
	const snapshot = extractProcedures(appRouter);

	const outputPath = new URL("./snapshots/api-contract.json", import.meta.url).pathname;
	writeFileSync(outputPath, JSON.stringify(snapshot, null, 2));

	console.log(`Contract snapshot generated: ${outputPath}`);
	console.log(`Tracked ${Object.keys(snapshot).length} procedures`);
}

main();
