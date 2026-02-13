/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: "class",
	content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
	presets: [require("nativewind/preset")],
	theme: {
		extend: {
			colors: {
				border: "#E5E7EB",
				input: "#E5E7EB",
				ring: "#FF7D45",
				background: "#F7F8FA",
				foreground: "#2D3748",
				primary: {
					DEFAULT: "#FF7D45",
					foreground: "#FFFFFF",
				},
				secondary: {
					DEFAULT: "#FFD54F",
					foreground: "#2D3748",
				},
				destructive: {
					DEFAULT: "#F87171",
					foreground: "#FFFFFF",
				},
				muted: {
					DEFAULT: "#F1F2F5",
					foreground: "#6B7280",
				},
				accent: {
					DEFAULT: "#4DB6AC",
					foreground: "#FFFFFF",
				},
				card: {
					DEFAULT: "#FFFFFF",
					foreground: "#2D3748",
				},
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
			},
			fontFamily: {
				sans: ["Poppins", "sans-serif"],
			},
			borderRadius: {
				lg: "12px",
				md: "8px",
				sm: "4px",
				xl: "20px",
				"2xl": "24px",
				"3xl": "32px",
			},
		},
	},
	plugins: [],
};
