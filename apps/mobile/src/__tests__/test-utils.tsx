import { type RenderOptions, render } from "@testing-library/react-native";
import type React from "react";

// Minimal wrapper - screens are tested without providers since we mock tRPC
export function renderScreen(ui: React.ReactElement, options?: RenderOptions) {
	return render(ui, { ...options });
}

// Helper to create a mock navigation prop
export function createMockNavigation() {
	return {
		navigate: jest.fn(),
		goBack: jest.fn(),
		setOptions: jest.fn(),
		addListener: jest.fn(() => jest.fn()),
		dispatch: jest.fn(),
		canGoBack: jest.fn(() => true),
		isFocused: jest.fn(() => true),
		getParent: jest.fn(),
		getState: jest.fn(),
		getId: jest.fn(),
		reset: jest.fn(),
		setParams: jest.fn(),
	} as any;
}
