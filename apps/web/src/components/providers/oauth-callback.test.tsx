import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { OAuthCallback, type OAuthProvider } from "./oauth-callback";
import { ApiError } from "@/lib/api/client";
import { useExchangeFitbitToken, useExchangeWithingsToken } from "@/lib/api/mutations";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/lib/api/mutations");

vi.mock("./oauth-callback-ui", () => ({
  OAuthCallbackUI: ({ providerName, state, error, errorCode }: any) => (
    <div data-testid="oauth-callback-ui">
      <div>Provider: {providerName}</div>
      <div>State: {state}</div>
      {error && <div>Error: {error}</div>}
      {errorCode && <div>Error Code: {errorCode}</div>}
    </div>
  ),
}));

type MutationState = {
  status: "idle" | "pending" | "success" | "error";
  isSuccess: boolean;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
};

const idle: MutationState = { status: "idle", isSuccess: false, isPending: false, isError: false, error: null };

describe.each<[OAuthProvider, string, typeof useExchangeFitbitToken]>([
  ["fitbit", "Fitbit", useExchangeFitbitToken],
  ["withings", "Withings", useExchangeWithingsToken],
])("OAuthCallback for %s", (provider, providerName, useExchange) => {
  const mutate = vi.fn();
  const otherHook = provider === "fitbit" ? useExchangeWithingsToken : useExchangeFitbitToken;

  const mockMutation = (state: Partial<MutationState> = {}) => {
    vi.mocked(useExchange).mockReturnValue({ mutate, ...idle, ...state } as any);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutation();
    vi.mocked(otherHook).mockReturnValue({ mutate: vi.fn(), ...idle } as any);
  });

  it("shows the invalid state when no code or state is provided", () => {
    render(<OAuthCallback provider={provider} search={{}} />);

    const ui = screen.getByTestId("oauth-callback-ui");
    expect(ui).toHaveTextContent(`Provider: ${providerName}`);
    expect(ui).toHaveTextContent("State: invalid");
    expect(ui).not.toHaveTextContent("Error:");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("rejects a callback without state instead of loading indefinitely", () => {
    render(<OAuthCallback provider={provider} search={{ code: "abc123" }} />);

    expect(screen.getByTestId("oauth-callback-ui")).toHaveTextContent("State: invalid");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("exchanges the code with this provider's mutation and shows loading", () => {
    render(<OAuthCallback provider={provider} search={{ code: "abc123", state: "xyz789" }} />);

    expect(screen.getByTestId("oauth-callback-ui")).toHaveTextContent("State: loading");
    expect(mutate).toHaveBeenCalledWith({ code: "abc123", state: "xyz789" });
    expect(otherHook).not.toHaveBeenCalled();
  });

  it("exchanges the one-use code only once under StrictMode", () => {
    render(
      <StrictMode>
        <OAuthCallback provider={provider} search={{ code: "abc123", state: "xyz789" }} />
      </StrictMode>,
    );

    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("shows loading while the exchange is pending", () => {
    mockMutation({ status: "pending", isPending: true });

    render(<OAuthCallback provider={provider} search={{ code: "abc123", state: "xyz789" }} />);

    expect(screen.getByTestId("oauth-callback-ui")).toHaveTextContent("State: loading");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows the error message and code when the exchange fails", () => {
    mockMutation({ status: "error", isError: true, error: new ApiError(429, "Too many attempts", "RATE_LIMITED") });

    render(<OAuthCallback provider={provider} search={{ code: "abc123", state: "xyz789" }} />);

    const ui = screen.getByTestId("oauth-callback-ui");
    expect(ui).toHaveTextContent("State: error");
    expect(ui).toHaveTextContent("Error: Too many attempts");
    expect(ui).toHaveTextContent("Error Code: RATE_LIMITED");
  });

  it("shows success and goes to the dashboard after a short delay", () => {
    vi.useFakeTimers();
    try {
      mockMutation({ status: "success", isSuccess: true });

      render(<OAuthCallback provider={provider} search={{ code: "abc123", state: "xyz789" }} />);

      expect(screen.getByTestId("oauth-callback-ui")).toHaveTextContent("State: success");
      expect(mockNavigate).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
    } finally {
      vi.useRealTimers();
    }
  });
});
