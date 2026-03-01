import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChildSwitcher } from "../child-switcher";

const mockChildren = [
	{
		id: "child-1",
		firstName: "Alice",
		lastName: "Smith",
		yearGroup: "Year 3",
		className: "Maple",
	},
	{
		id: "child-2",
		firstName: "Bob",
		lastName: "Jones",
		yearGroup: "Year 5",
		className: null,
	},
	{
		id: "child-3",
		firstName: "Charlie",
		lastName: "Brown",
		yearGroup: null,
		className: null,
	},
];

describe("ChildSwitcher", () => {
	it("renders nothing when items is empty", () => {
		const { container } = render(
			<ChildSwitcher items={[]} selectedChildId="" onSelect={vi.fn()} />,
		);
		expect(container.innerHTML).toBe("");
		expect(screen.queryByTestId("child-switcher")).toBeNull();
	});

	it("renders all children's first names", () => {
		render(
			<ChildSwitcher items={mockChildren} selectedChildId="child-1" onSelect={vi.fn()} />,
		);

		expect(screen.getByText("Alice")).toBeDefined();
		expect(screen.getByText("Bob")).toBeDefined();
		expect(screen.getByText("Charlie")).toBeDefined();
	});

	it("shows initials as first letter of first + last name, uppercased", () => {
		render(
			<ChildSwitcher items={mockChildren} selectedChildId="child-1" onSelect={vi.fn()} />,
		);

		expect(screen.getByText("AS")).toBeDefined();
		expect(screen.getByText("BJ")).toBeDefined();
		expect(screen.getByText("CB")).toBeDefined();
	});

	it("shows class label when yearGroup and/or className provided", () => {
		render(
			<ChildSwitcher items={mockChildren} selectedChildId="child-1" onSelect={vi.fn()} />,
		);

		// Alice has both yearGroup and className
		expect(screen.getByText("Year 3 Maple")).toBeDefined();

		// Bob has only yearGroup
		expect(screen.getByText("Year 5")).toBeDefined();

		// Charlie has neither - no class label rendered
		const charlieButton = screen.getByTestId("child-option-3");
		const spans = charlieButton.querySelectorAll("span");
		// Should only have the name span, no class label span
		const spanTexts = Array.from(spans).map((s) => s.textContent);
		expect(spanTexts).not.toContain(expect.stringMatching(/Year|Class/));
	});

	it("calls onSelect with correct childId when clicked", () => {
		const onSelect = vi.fn();
		render(
			<ChildSwitcher items={mockChildren} selectedChildId="child-1" onSelect={onSelect} />,
		);

		fireEvent.click(screen.getByTestId("child-option-2"));
		expect(onSelect).toHaveBeenCalledWith("child-2");

		fireEvent.click(screen.getByTestId("child-option-3"));
		expect(onSelect).toHaveBeenCalledWith("child-3");

		expect(onSelect).toHaveBeenCalledTimes(2);
	});

	it("applies different styling to the active child", () => {
		render(
			<ChildSwitcher items={mockChildren} selectedChildId="child-1" onSelect={vi.fn()} />,
		);

		const activeButton = screen.getByTestId("child-option-1");
		const inactiveButton = screen.getByTestId("child-option-2");

		// Active child should have primary styling, inactive should have muted
		expect(activeButton.className).toContain("bg-primary");
		expect(activeButton.className).not.toContain("bg-muted");

		expect(inactiveButton.className).toContain("bg-muted");
		expect(inactiveButton.className).not.toContain("bg-primary");
	});
});
