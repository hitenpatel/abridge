import * as SecureStore from "expo-secure-store";
import type React from "react";
import { createContext, useCallback, useEffect, useState } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";

type ColorScheme = "light" | "dark" | "system";

interface ThemeContextValue {
	colorScheme: "light" | "dark";
	preference: ColorScheme;
	setPreference: (scheme: ColorScheme) => void;
	isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextValue>({
	colorScheme: "light",
	preference: "system",
	setPreference: () => {},
	isDark: false,
});

const THEME_KEY = "abridge_color_scheme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const systemScheme = useSystemColorScheme();
	const [preference, setPreferenceState] = useState<ColorScheme>("system");
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		SecureStore.getItemAsync(THEME_KEY).then((stored) => {
			if (stored === "light" || stored === "dark" || stored === "system") {
				setPreferenceState(stored);
			}
			setLoaded(true);
		});
	}, []);

	const setPreference = useCallback((scheme: ColorScheme) => {
		setPreferenceState(scheme);
		SecureStore.setItemAsync(THEME_KEY, scheme);
	}, []);

	const colorScheme = preference === "system" ? (systemScheme ?? "light") : preference;

	if (!loaded) return null;

	return (
		<ThemeContext.Provider
			value={{ colorScheme, preference, setPreference, isDark: colorScheme === "dark" }}
		>
			{children}
		</ThemeContext.Provider>
	);
}
