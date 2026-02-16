import { existsSync, readFileSync } from "node:fs";
import type { AnyProcedure, AnyRouter } from "@trpc/server";
import { describe, expect, test } from "vitest";
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
		const outputSchema = (procedure._def as any).output;

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

describe("API Contract", () => {
	const snapshotPath = new URL("./snapshots/api-contract.json", import.meta.url).pathname;

	test("contract snapshot exists", () => {
		expect(existsSync(snapshotPath)).toBe(true);
	});

	test("contract has not broken", () => {
		const committedSnapshot: ContractSnapshot = JSON.parse(readFileSync(snapshotPath, "utf-8"));
		const currentSnapshot = extractProcedures(appRouter);

		const errors: string[] = [];
		const warnings: string[] = [];
		const newProcedures: string[] = [];

		// Check for removed procedures (breaking)
		for (const path of Object.keys(committedSnapshot)) {
			if (!currentSnapshot[path]) {
				errors.push(`Procedure '${path}' was removed`);
			}
		}

		// Check for output changes (breaking) and input changes (warning)
		for (const [path, committed] of Object.entries(committedSnapshot)) {
			const current = currentSnapshot[path];
			if (!current) continue;

			if (current.output !== committed.output) {
				errors.push(`Procedure '${path}' output schema changed`);
			}

			if (current.input !== committed.input) {
				warnings.push(`Procedure '${path}' input schema changed - verify clients are updated`);
			}
		}

		// Check for new procedures (informational)
		for (const path of Object.keys(currentSnapshot)) {
			if (!committedSnapshot[path]) {
				newProcedures.push(path);
			}
		}

		// Log warnings and new procedures
		if (warnings.length > 0) {
			console.warn("\nWarnings:");
			for (const warning of warnings) {
				console.warn(`  - ${warning}`);
			}
		}

		if (newProcedures.length > 0) {
			console.log("\nNew procedures detected:");
			for (const proc of newProcedures) {
				console.log(`  - ${proc}`);
			}
			console.log("\nRun 'pnpm --filter @schoolconnect/e2e contracts:update' to track them");
		}

		// Fail only on breaking changes
		if (errors.length > 0) {
			throw new Error(`Contract violations:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
		}
	});
});
