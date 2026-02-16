const sharp = require("sharp");
const fs = require("node:fs");
const path = require("node:path");

const logoPath = path.join(__dirname, "../../../logo.svg");
const publicDir = path.join(__dirname, "../public");

const sizes = [
	{ name: "icon-192x192.png", size: 192 },
	{ name: "icon-512x512.png", size: 512 },
];

async function generateIcons() {
	// Check if logo exists
	if (!fs.existsSync(logoPath)) {
		console.error("❌ Logo file not found:", logoPath);
		process.exit(1);
	}

	// Ensure public directory exists
	if (!fs.existsSync(publicDir)) {
		fs.mkdirSync(publicDir, { recursive: true });
	}

	console.log("📱 Generating PWA icons from logo.svg...\n");

	for (const { name, size } of sizes) {
		const outputPath = path.join(publicDir, name);

		try {
			await sharp(logoPath)
				.resize(size, size, {
					fit: "contain",
					background: { r: 255, g: 255, b: 255, alpha: 1 },
				})
				.png()
				.toFile(outputPath);

			console.log(`✅ Generated ${name} (${size}x${size})`);
		} catch (error) {
			console.error(`❌ Failed to generate ${name}:`, error.message);
		}
	}

	console.log("\n✨ Icon generation complete!");
}

generateIcons().catch((error) => {
	console.error("❌ Icon generation failed:", error);
	process.exit(1);
});
