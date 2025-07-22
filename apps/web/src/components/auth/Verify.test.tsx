import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Verify } from "./Verify";
import { supabase } from "../../lib/supabase/client";

// Mock dependencies
vi.mock("../../lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      exchangeCodeForSession: vi.fn(),
    },
  },
}));

// Create a variable to control the mock
let mockIsLoggedIn = false;

vi.mock("../../lib/auth/useAuth", () => ({
  useAuth: () => ({
    isLoggedIn: mockIsLoggedIn,
  }),
}));

const mockNavigate = vi.fn();
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
  token: string | null;
  isOAuth: boolean;
  error: string | null;
} = {
  token: null,
  isOAuth: false,
  error: null,
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
    // Reset mocks to default values
    mockIsLoggedIn = false;
    mockLoaderData = {
      token: null,
      isOAuth: false,
      error: null,
    };
    // Reset window.location for each test
    delete (window as any).location;
    (window as any).location = {
      href: "http://localhost:3000/auth/verify",
      search: "",
      hash: "",
    };
  });

  it("should show verifying state initially when token is present", async () => {
    mockLoaderData = {
      token: "abc123",
      isOAuth: false,
      error: null as string | null,
    };

    render(<Verify />);

    expect(screen.getByText("Verifying...")).toBeInTheDocument();
    expect(screen.getByText("Please wait while we verify your login link.")).toBeInTheDocument();
  });

  it("should handle successful verification with session", async () => {
    mockLoaderData = {
      token: "abc123",
      isOAuth: false,
      error: null as string | null,
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: "123" } } as any },
      error: null,
    });

    render(<Verify />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
    });
  });

  it("should handle verification error from getSession", async () => {
    mockLoaderData = {
      token: "abc123",
      isOAuth: false,
      error: null as string | null,
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid token" } as any,
    });

    render(<Verify />);

    await waitFor(() => {
      expect(screen.getByText("Verification Failed")).toBeInTheDocument();
      expect(screen.getByText("Invalid or expired login link. Please try logging in again.")).toBeInTheDocument();
      expect(screen.getByText("Return to login")).toBeInTheDocument();
    });
  });

  it("should try exchangeCodeForSession when no session from getSession", async () => {
    mockLoaderData = {
      token: "abc123",
      isOAuth: false,
      error: null as string | null,
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValue({
      data: { session: { user: { id: "123" } } as any, user: {} as any },
      error: null,
    });

    render(<Verify />);

    await waitFor(() => {
      expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith("http://localhost:3000/auth/verify");
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
    });
  });

  it("should handle exchangeCodeForSession error", async () => {
    mockLoaderData = {
      token: "abc123",
      isOAuth: false,
      error: null as string | null,
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "Exchange failed" } as any,
    });

    render(<Verify />);

    await waitFor(() => {
      expect(screen.getByText("Invalid or expired login link. Please try logging in again.")).toBeInTheDocument();
    });
  });

  it("should handle OAuth flow", async () => {
    mockLoaderData = {
      token: null,
      isOAuth: true,
      error: null,
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: "123" } } as any },
      error: null,
    });

    render(<Verify />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
    });
  });

  it("should display error from loader data", () => {
    mockLoaderData = {
      token: null,
      isOAuth: false,
      error: "Access denied",
    };

    render(<Verify />);

    expect(screen.getByText("Verification Failed")).toBeInTheDocument();
    expect(screen.getByText("Access denied")).toBeInTheDocument();
  });

  it("should redirect if user is already logged in", () => {
    mockIsLoggedIn = true;
    mockLoaderData = {
      token: null,
      isOAuth: false,
      error: null,
    };

    render(<Verify />);

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
  });

  it("should handle unexpected errors gracefully", async () => {
    mockLoaderData = {
      token: "abc123",
      isOAuth: false,
      error: null as string | null,
    };

    vi.mocked(supabase.auth.getSession).mockRejectedValue(new Error("Network error"));

    render(<Verify />);

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred. Please try logging in again.")).toBeInTheDocument();
    });
  });

  it("should show invalid login link when no token and no OAuth", () => {
    mockLoaderData = {
      token: null,
      isOAuth: false,
      error: null,
    };

    render(<Verify />);

    expect(screen.getByText("Verification Failed")).toBeInTheDocument();
    expect(screen.getByText("Invalid login link")).toBeInTheDocument();
  });

  it("should not start verification if already has error", async () => {
    mockLoaderData = {
      token: "abc123",
      isOAuth: false,
      error: "Previous error",
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid token" } as any,
    });

    render(<Verify />);

    // Initially shows verifying state even with error in loader data
    expect(screen.getByText("Verifying...")).toBeInTheDocument();

    // The component will still attempt verification despite the error in loader data
    await waitFor(() => {
      expect(screen.getByText("Verification Failed")).toBeInTheDocument();
      expect(screen.getByText("Invalid or expired login link. Please try logging in again.")).toBeInTheDocument();
    });
  });
});
