import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
	useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
	usePathname: vi.fn().mockReturnValue("/dashboard"),
}));

import { SearchBar } from "@/components/search/search-bar";

describe("SearchBar", () => {
	it("renders input field", () => {
		render(<SearchBar />);

		expect(screen.getByRole("textbox")).toBeInTheDocument();
	});

	it("shows placeholder text", () => {
		render(<SearchBar />);

		expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
	});
});
