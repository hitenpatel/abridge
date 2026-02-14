import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "../app/login/page";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

// Mock auth client
const mockSignIn = vi.fn();
vi.mock("@/lib/auth-client", () => ({
	authClient: {
		signIn: {
			email: (...args: any[]) => mockSignIn(...args),
		},
	},
}));

// Mock sonner
vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

describe("LoginPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders login form with email and password fields", () => {
		render(<LoginPage />);

		expect(screen.getByTestId("email-input")).toBeDefined();
		expect(screen.getByTestId("password-input")).toBeDefined();
		expect(screen.getByTestId("login-button")).toBeDefined();
		expect(screen.getByText("Welcome back")).toBeDefined();
	});

	it("renders sign in button text", () => {
		render(<LoginPage />);

		const button = screen.getByTestId("login-button");
		expect(button.textContent).toBe("Sign In");
	});

	it("renders register link", () => {
		render(<LoginPage />);

		const registerLink = screen.getByText("Register");
		expect(registerLink).toBeDefined();
		expect(registerLink.getAttribute("href")).toBe("/register");
	});

	it("calls signIn on form submission", async () => {
		mockSignIn.mockResolvedValue({});

		render(<LoginPage />);

		const emailInput = screen.getByTestId("email-input");
		const passwordInput = screen.getByTestId("password-input");

		fireEvent.change(emailInput, { target: { value: "test@example.com" } });
		fireEvent.change(passwordInput, { target: { value: "password123" } });

		const form = screen.getByTestId("login-button").closest("form")!;
		fireEvent.submit(form);

		expect(mockSignIn).toHaveBeenCalledWith(
			{ email: "test@example.com", password: "password123" },
			expect.objectContaining({
				onSuccess: expect.any(Function),
				onError: expect.any(Function),
			}),
		);
	});

	it("redirects to dashboard on successful login", async () => {
		mockSignIn.mockImplementation((_data: any, opts: any) => {
			opts.onSuccess();
			return Promise.resolve();
		});

		render(<LoginPage />);

		const emailInput = screen.getByTestId("email-input");
		const passwordInput = screen.getByTestId("password-input");

		fireEvent.change(emailInput, { target: { value: "test@example.com" } });
		fireEvent.change(passwordInput, { target: { value: "password123" } });

		const form = screen.getByTestId("login-button").closest("form")!;
		fireEvent.submit(form);

		expect(mockPush).toHaveBeenCalledWith("/dashboard");
	});
});
