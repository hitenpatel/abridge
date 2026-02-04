import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: ["class"],
	content: ["./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			colors: {
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
					50: "#fcf5fd",
					100: "#f6ebfa",
					200: "#eddcf5",
					300: "#e0c2ed",
					400: "#cc9ee0",
					500: "#A02CAF", // Base
					600: "#92229e",
					700: "#7a1a82",
					800: "#66186b",
					900: "#561659",
					950: "#360638",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
					50: "#f0fdf7",
					100: "#dbfceb",
					200: "#bbf7d9",
					300: "#6EDFB4", // Base (adjusted to 400/500 usually but here it's 300/400 visual weight)
					400: "#4ad2a5",
					500: "#24b98e",
					600: "#189673",
					700: "#16785e",
					800: "#175f4c",
					900: "#164e40",
					950: "#0b2b24",
				},
				neutral: {
					50: "#fbf7fc",
					100: "#f5eef7",
					200: "#ebdcef",
					300: "#debfe6",
					400: "#c89bd6",
					500: "#b07bc2",
					600: "#965ba6",
					700: "#7d448a",
					800: "#693a73",
					900: "#562C59", // Base Dark
					950: "#351238",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
			},
			fontFamily: {
				sans: ["var(--font-outfit)", "sans-serif"],
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
};

export default config;
