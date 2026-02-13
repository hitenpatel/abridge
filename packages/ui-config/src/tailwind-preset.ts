import { colors, fontFamily } from "./colors";

export const abridgePreset = {
	theme: {
		extend: {
			colors: {
				border: colors.light.border,
				input: colors.light.input,
				ring: colors.light.ring,
				background: colors.light.background,
				foreground: colors.light.foreground,
				primary: {
					DEFAULT: colors.light.primary,
					foreground: colors.light["primary-foreground"],
				},
				secondary: {
					DEFAULT: colors.light.secondary,
					foreground: colors.light["secondary-foreground"],
				},
				destructive: {
					DEFAULT: colors.light.destructive,
					foreground: colors.light["destructive-foreground"],
				},
				muted: {
					DEFAULT: colors.light.muted,
					foreground: colors.light["muted-foreground"],
				},
				accent: {
					DEFAULT: colors.light.accent,
					foreground: colors.light["accent-foreground"],
				},
				card: {
					DEFAULT: colors.light.card,
					foreground: colors.light["card-foreground"],
				},
				success: {
					DEFAULT: colors.light.success,
					foreground: colors.light["success-foreground"],
				},
				warning: {
					DEFAULT: colors.light.warning,
					foreground: colors.light["warning-foreground"],
				},
				info: {
					DEFAULT: colors.light.info,
					foreground: colors.light["info-foreground"],
				},
			},
			fontFamily: {
				sans: fontFamily.sans,
			},
			borderRadius: {
				lg: "12px",
				md: "8px",
				sm: "4px",
				xl: "20px",
				"2xl": "24px",
				"3xl": "32px",
			},
			boxShadow: {
				soft: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
				glow: "0 0 15px rgba(255, 125, 69, 0.3)",
			},
		},
	},
} as const;
