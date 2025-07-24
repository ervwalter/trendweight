import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Verify } from "./Verify";

// Mock dependencies
const mockNavigate = vi.fn();
let mockIsLoggedIn = false;
let mockIsInitializing = false;
let mockUser: { email: string } | null = null;

vi.mock("../../lib/auth/useAuth", () => ({
  useAuth: () => ({
    isLoggedIn: mockIsLoggedIn,
    isInitializing: mockIsInitializing,
    user: mockUser,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// Create a variable to hold the mock return value
let mockLoaderData: {
  errorCode: string | null;
  errorDescription: string | null;
} = {
  errorCode: null,
  errorDescription: null,
};

// Mock the route to provide loader data
vi.mock("../../routes/auth.verify", () => ({
  Route: {
    useLoaderData: () => mockLoaderData,
  },
}));

describe("Verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoggedIn = false;
    mockIsInitializing = false;
    mockUser = null;
    mockLoaderData = {
      errorCode: null,
      errorDescription: null,
    };
  });

  it("should show verifying state when auth is initializing", () => {
    mockIsInitializing = true;

    render(<Verify />);

    expect(screen.getByText("Verifying...")).toBeInTheDocument();
    expect(screen.getByText("Please wait while we verify your login.")).toBeInTheDocument();
  });

  it("should show verifying state when not logged in and no error", () => {
    mockIsLoggedIn = false;
    mockIsInitializing = false;

    render(<Verify />);

    expect(screen.getByText("Verifying...")).toBeInTheDocument();
    expect(screen.getByText("Please wait while we verify your login.")).toBeInTheDocument();
  });

  it("should redirect to dashboard when logged in", async () => {
    mockIsLoggedIn = true;
    mockIsInitializing = false;
    mockUser = { email: "test@example.com" };

    render(<Verify />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
    });
  });

  it("should not redirect when there is an error", () => {
    mockIsLoggedIn = true;
    mockIsInitializing = false;
    mockLoaderData = {
      errorCode: "access_denied",
      errorDescription: "User denied access",
    };

    render(<Verify />);

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText("Verification Failed")).toBeInTheDocument();
    expect(screen.getByText("User denied access")).toBeInTheDocument();
  });

  it("should display error with description when both error code and description are present", () => {
    mockLoaderData = {
      errorCode: "unauthorized_client",
      errorDescription: "Email link is invalid or has expired",
    };

    render(<Verify />);

    expect(screen.getByText("Verification Failed")).toBeInTheDocument();
    expect(screen.getByText("Email link is invalid or has expired")).toBeInTheDocument();
    expect(screen.getByText("Error code: unauthorized_client")).toBeInTheDocument();
    expect(screen.getByText("Return to login")).toBeInTheDocument();
  });

  it("should display error code when no description is present", () => {
    mockLoaderData = {
      errorCode: "server_error",
      errorDescription: null,
    };

    render(<Verify />);

    expect(screen.getByText("Verification Failed")).toBeInTheDocument();
    expect(screen.getByText("server_error")).toBeInTheDocument();
    expect(screen.queryByText(/Error code:/)).not.toBeInTheDocument();
  });

  it("should wait for auth initialization before redirecting", () => {
    mockIsLoggedIn = true;
    mockIsInitializing = true; // Still initializing

    render(<Verify />);

    // Should not redirect while initializing
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText("Verifying...")).toBeInTheDocument();
  });

  it("should handle transition from not logged in to logged in", async () => {
    const { rerender } = render(<Verify />);

    // Initially not logged in
    expect(screen.getByText("Verifying...")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();

    // Simulate login completion
    mockIsLoggedIn = true;
    mockIsInitializing = false;
    mockUser = { email: "test@example.com" };

    rerender(<Verify />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
    });
  });

  it("should return null when logged in (edge case after redirect)", () => {
    mockIsLoggedIn = true;
    mockIsInitializing = false;

    const { container } = render(<Verify />);

    // The component should redirect, but if for some reason it renders after that,
    // it should return null
    expect(container.firstChild).toBeNull();
  });
});
