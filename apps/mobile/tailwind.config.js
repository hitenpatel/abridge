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
					DEFAULT: "#f8f6f5",
					dark: "#221510",
				},
				surface: {
					DEFAULT: "#ffffff",
					dark: "#33221b",
				},
				"neutral-surface": {
					DEFAULT: "#fffbf9",
					dark: "#33221b",
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
					DEFAULT: "#F1F2F5",
					foreground: "#6B7280",
				},
				border: "#E5E7EB",
				input: "#E5E7EB",
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
				soft: "0 8px 24px -6px rgba(245,110,61,0.08), 0 4px 8px -4px rgba(0,0,0,0.04)",
				glow: "0 0 20px -5px rgba(245,110,61,0.4)",
				card: "0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)",
			},
		},
	},
	plugins: [],
};
