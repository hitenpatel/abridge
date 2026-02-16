import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { parse as parseYaml } from "yaml";
import { type JourneyWithDomain, journeySchema } from "./types.js";

const JOURNEYS_DIR = new URL(".", import.meta.url).pathname;

function* walkSync(dir: string): Generator<string> {
	const files = readdirSync(dir);
	for (const file of files) {
		const filePath = join(dir, file);
		const stat = statSync(filePath);
		if (stat.isDirectory()) {
			yield* walkSync(filePath);
		} else if (file.endsWith(".yaml") || file.endsWith(".yml")) {
			yield filePath;
		}
	}
}

export function loadAllJourneys(options?: {
	tags?: string[];
}): JourneyWithDomain[] {
	const journeys: JourneyWithDomain[] = [];

	for (const filePath of walkSync(JOURNEYS_DIR)) {
		const content = readFileSync(filePath, "utf-8");
		const parsed = parseYaml(content);

		const result = journeySchema.safeParse(parsed);
		if (!result.success) {
			throw new Error(`Invalid journey spec at ${filePath}: ${result.error.message}`);
		}

		const journey = result.data.journey;

		// Tag filtering
		if (options?.tags && options.tags.length > 0) {
			const hasMatchingTag = journey.tags.some((tag) => options.tags?.includes(tag));
			if (!hasMatchingTag) {
				continue;
			}
		}

		// Extract domain from directory path
		const relativePath = relative(JOURNEYS_DIR, filePath);
		const domain = dirname(relativePath).split("/")[0] || "unknown";

		journeys.push({
			...journey,
			domain,
			filePath,
		});
	}

	return journeys;
}
