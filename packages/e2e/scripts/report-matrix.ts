import { getTestMatrix } from "../test-matrix.js";

const args = process.argv.slice(2);
const jsonOutput = args.includes("--json");

function getStatusSymbol(status: string): string {
	switch (status) {
		case "covered":
			return "✓";
		case "missing":
			return "✗";
		case "skip":
			return "-";
		default:
			return "?";
	}
}

function getStatusColor(status: string): string {
	switch (status) {
		case "covered":
			return "\x1b[32m"; // Green
		case "missing":
			return "\x1b[31m"; // Red
		case "skip":
			return "\x1b[90m"; // Gray
		default:
			return "\x1b[0m";
	}
}

const RESET = "\x1b[0m";

function main() {
	const matrix = getTestMatrix();

	if (jsonOutput) {
		console.log(JSON.stringify(matrix, null, 2));
		return;
	}

	console.log("\n╔═══════════════════════════════════════════════════════════╗");
	console.log("║         E2E Test Coverage Matrix                          ║");
	console.log("╚═══════════════════════════════════════════════════════════╝\n");

	// Group by domain
	for (const domain of matrix.domains) {
		console.log(`\n📁 ${domain.domain.toUpperCase()}`);
		console.log("─".repeat(60));

		const colWidths = {
			name: 40,
			web: 8,
			mobile: 8,
		};

		console.log(
			`${"Journey".padEnd(colWidths.name)}${"Web".padEnd(colWidths.web)}${"Mobile".padEnd(colWidths.mobile)}`,
		);
		console.log("─".repeat(60));

		for (const status of domain.journeys) {
			const webColor = getStatusColor(status.web);
			const mobileColor = getStatusColor(status.mobile);
			const webSymbol = getStatusSymbol(status.web);
			const mobileSymbol = getStatusSymbol(status.mobile);

			console.log(
				`${status.journey.name.padEnd(colWidths.name)}${webColor}${webSymbol}${RESET}      ${mobileColor}${mobileSymbol}${RESET}`,
			);
		}
	}

	// Summary
	console.log("\n\n╔═══════════════════════════════════════════════════════════╗");
	console.log("║         Coverage Summary                                  ║");
	console.log("╚═══════════════════════════════════════════════════════════╝\n");

	console.log(`Total Journeys: ${matrix.summary.total}\n`);

	console.log("Web:");
	console.log(`  ✓ Covered: ${matrix.summary.webCovered}`);
	console.log(`  ✗ Missing: ${matrix.summary.webMissing}`);
	console.log(`  - Skipped: ${matrix.summary.webSkipped}`);

	console.log("\nMobile:");
	console.log(`  ✓ Covered: ${matrix.summary.mobileCovered}`);
	console.log(`  ✗ Missing: ${matrix.summary.mobileMissing}`);
	console.log(`  - Skipped: ${matrix.summary.mobileSkipped}`);

	const webCoverage =
		((matrix.summary.webCovered /
			(matrix.summary.total - matrix.summary.webSkipped)) *
			100) |
		0;
	const mobileCoverage =
		((matrix.summary.mobileCovered /
			(matrix.summary.total - matrix.summary.mobileSkipped)) *
			100) |
		0;

	console.log(
		`\nWeb Coverage: ${webCoverage}% | Mobile Coverage: ${mobileCoverage}%\n`,
	);
}

main();
