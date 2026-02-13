import { abridgePreset } from "@schoolconnect/ui-config/tailwind-preset";
import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: "class",
	content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
	presets: [abridgePreset as unknown as Config],
	theme: {
		extend: {},
	},
	plugins: [],
};

export default config;
