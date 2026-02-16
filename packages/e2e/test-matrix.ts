import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadAllJourneys } from "./journeys/loader.js";
import type { JourneyWithDomain } from "./journeys/types.js";

const PLAYWRIGHT_DIR = new URL("./generated/playwright/", import.meta.url).pathname;
const MAESTRO_DIR = new URL("./generated/maestro/", import.meta.url).pathname;

export type PlatformStatus = "covered" | "missing" | "skip";

export type JourneyStatus = {
	journey: JourneyWithDomain;
	web: PlatformStatus;
	mobile: PlatformStatus;
};

export type DomainCoverage = {
	domain: string;
	journeys: JourneyStatus[];
};

export type TestMatrix = {
	domains: DomainCoverage[];
	summary: {
		total: number;
		webCovered: number;
		mobileCovered: number;
		webMissing: number;
		mobileMissing: number;
		webSkipped: number;
		mobileSkipped: number;
	};
};

export function getTestMatrix(): TestMatrix {
	const journeys = loadAllJourneys();

	const domainMap = new Map<string, JourneyStatus[]>();

	for (const journey of journeys) {
		const webSkipped = journey.skipPlatforms?.includes("web") ?? false;
		const mobileSkipped = journey.skipPlatforms?.includes("mobile") ?? false;

		const playwrightPath = join(PLAYWRIGHT_DIR, `${journey.id}.spec.ts`);
		const maestroPath = join(MAESTRO_DIR, `${journey.id}.yaml`);

		const webStatus: PlatformStatus = webSkipped
			? "skip"
			: existsSync(playwrightPath)
				? "covered"
				: "missing";

		const mobileStatus: PlatformStatus = mobileSkipped
			? "skip"
			: existsSync(maestroPath)
				? "covered"
				: "missing";

		const status: JourneyStatus = {
			journey,
			web: webStatus,
			mobile: mobileStatus,
		};

		if (!domainMap.has(journey.domain)) {
			domainMap.set(journey.domain, []);
		}
		const domainList = domainMap.get(journey.domain);
		if (domainList) domainList.push(status);
	}

	const domains: DomainCoverage[] = Array.from(domainMap.entries()).map(([domain, journeys]) => ({
		domain,
		journeys,
	}));

	const summary = {
		total: journeys.length,
		webCovered: 0,
		mobileCovered: 0,
		webMissing: 0,
		mobileMissing: 0,
		webSkipped: 0,
		mobileSkipped: 0,
	};

	for (const domain of domains) {
		for (const status of domain.journeys) {
			if (status.web === "covered") summary.webCovered++;
			if (status.web === "missing") summary.webMissing++;
			if (status.web === "skip") summary.webSkipped++;

			if (status.mobile === "covered") summary.mobileCovered++;
			if (status.mobile === "missing") summary.mobileMissing++;
			if (status.mobile === "skip") summary.mobileSkipped++;
		}
	}

	return { domains, summary };
}
