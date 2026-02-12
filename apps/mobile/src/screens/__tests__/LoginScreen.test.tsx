import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { authClient } from "../../lib/auth-client";
import { LoginScreen } from "../LoginScreen";

jest.mock("../../lib/auth-client", () => ({
	authClient: {
		signIn: { email: jest.fn() },
	},
}));

const mockSignIn = authClient.signIn.email as jest.Mock;

jest.spyOn(Alert, "alert");

describe("LoginScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("renders title, email input, password input, and login button", () => {
		render(<LoginScreen />);
		expect(screen.getByText("SchoolConnect")).toBeTruthy();
		expect(screen.getByPlaceholderText("Email")).toBeTruthy();
		expect(screen.getByPlaceholderText("Password")).toBeTruthy();
		expect(screen.getByText("Login")).toBeTruthy();
	});

	it("shows error alert when fields are empty", () => {
		render(<LoginScreen />);
		fireEvent.press(screen.getByText("Login"));
		expect(Alert.alert).toHaveBeenCalledWith("Error", "Please fill in all fields");
	});

	it("shows error alert when only email is provided", () => {
		render(<LoginScreen />);
		fireEvent.changeText(screen.getByPlaceholderText("Email"), "test@example.com");
		fireEvent.press(screen.getByText("Login"));
		expect(Alert.alert).toHaveBeenCalledWith("Error", "Please fill in all fields");
	});

	it("calls signIn with email and password on submit", async () => {
		mockSignIn.mockResolvedValue({ data: { user: {} }, error: null });
		render(<LoginScreen />);
		fireEvent.changeText(screen.getByPlaceholderText("Email"), "parent@school.com");
		fireEvent.changeText(screen.getByPlaceholderText("Password"), "password123");
		fireEvent.press(screen.getByText("Login"));
		await waitFor(() => {
			expect(mockSignIn).toHaveBeenCalledWith({
				email: "parent@school.com",
				password: "password123",
			});
		});
	});

	it("shows success alert on successful login", async () => {
		mockSignIn.mockResolvedValue({ data: { user: {} }, error: null });
		render(<LoginScreen />);
		fireEvent.changeText(screen.getByPlaceholderText("Email"), "parent@school.com");
		fireEvent.changeText(screen.getByPlaceholderText("Password"), "password123");
		fireEvent.press(screen.getByText("Login"));
		await waitFor(() => {
			expect(Alert.alert).toHaveBeenCalledWith("Success", "Logged in successfully");
		});
	});

	it("shows error alert on failed login", async () => {
		mockSignIn.mockResolvedValue({ data: null, error: { message: "Invalid credentials" } });
		render(<LoginScreen />);
		fireEvent.changeText(screen.getByPlaceholderText("Email"), "wrong@email.com");
		fireEvent.changeText(screen.getByPlaceholderText("Password"), "bad");
		fireEvent.press(screen.getByText("Login"));
		await waitFor(() => {
			expect(Alert.alert).toHaveBeenCalledWith("Login Failed", "Invalid credentials");
		});
	});

	it("shows error alert on unexpected exception", async () => {
		mockSignIn.mockRejectedValue(new Error("Network error"));
		render(<LoginScreen />);
		fireEvent.changeText(screen.getByPlaceholderText("Email"), "test@test.com");
		fireEvent.changeText(screen.getByPlaceholderText("Password"), "pass");
		fireEvent.press(screen.getByText("Login"));
		await waitFor(() => {
			expect(Alert.alert).toHaveBeenCalledWith("Error", "An unexpected error occurred");
		});
	});
});
