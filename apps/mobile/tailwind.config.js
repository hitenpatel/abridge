const { abridgePreset } = require("@schoolconnect/ui-config");

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
	presets: [require("nativewind/preset"), abridgePreset],
	darkMode: "class",
	theme: {
		extend: {
			colors: {
				primary: {
					DEFAULT: "#f56e3d",
					light: "#fff0eb",
					dark: "#d65021",
				},
				background: {
					DEFAULT: "#FFF5F0",
					dark: "#1A1614",
				},
				surface: {
					DEFAULT: "#FFFCFA",
					dark: "#241F1C",
				},
				"neutral-surface": {
					DEFAULT: "#FFF8F5",
					dark: "#241F1C",
				},
				"text-main": {
					DEFAULT: "#5c4d47",
					dark: "#ffffff",
				},
				"text-muted": {
					DEFAULT: "#96867f",
					dark: "#9CA3AF",
				},
				"accent-yellow": {
					DEFAULT: "#ffca28",
					light: "#fff8e1",
				},
				foreground: "#2D3748",
				card: "#ffffff",
				muted: {
					DEFAULT: "#F5F0ED",
					foreground: "#6B7280",
				},
				border: "#F0E6DF",
				input: "#F0E6DF",
				success: {
					DEFAULT: "#22C55E",
					foreground: "#FFFFFF",
				},
				warning: {
					DEFAULT: "#EAB308",
					foreground: "#2D3748",
				},
				info: {
					DEFAULT: "#0EA5E9",
					foreground: "#FFFFFF",
				},
				destructive: {
					DEFAULT: "#F87171",
					foreground: "#FFFFFF",
				},
			},
			fontFamily: {
				sans: ["PlusJakartaSans_400Regular"],
				"sans-medium": ["PlusJakartaSans_500Medium"],
				"sans-semibold": ["PlusJakartaSans_600SemiBold"],
				"sans-bold": ["PlusJakartaSans_700Bold"],
				"sans-extrabold": ["PlusJakartaSans_800ExtraBold"],
				display: ["PlusJakartaSans_700Bold"],
			},
			borderRadius: {
				DEFAULT: "16px",
				sm: "8px",
				md: "12px",
				lg: "24px",
				xl: "32px",
				"2xl": "40px",
				"3xl": "48px",
				full: "9999px",
			},
			boxShadow: {
				soft: "0 8px 24px -6px rgba(245,110,61,0.06), 0 4px 8px -4px rgba(0,0,0,0.03)",
				glow: "0 0 20px -5px rgba(245,110,61,0.4)",
				card: "0 4px 12px -2px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)",
				sanctuary: "0 8px 40px -8px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.02)",
			},
		},
	},
	plugins: [],
};
