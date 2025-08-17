import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FitbitCallback } from "./fitbit-callback";

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock loader data
let mockSearch = {
  code: undefined as string | undefined,
  state: undefined as string | undefined,
};

vi.mock("@/routes/oauth/fitbit/callback", () => ({
  Route: {
    useSearch: () => mockSearch,
  },
}));

// Mock the mutation
const mockMutate = vi.fn();
let mockStatus = "idle";
let mockIsSuccess = false;
let mockIsPending = false;
let mockIsError = false;
let mockError: Error | null = null;

vi.mock("@/lib/api/mutations", () => ({
  useExchangeFitbitToken: () => ({
    mutate: mockMutate,
    status: mockStatus,
    isSuccess: mockIsSuccess,
    isPending: mockIsPending,
    isError: mockIsError,
    error: mockError,
  }),
}));

// Mock OAuthCallbackUI
vi.mock("./oauth-callback-ui", () => ({
  OAuthCallbackUI: ({ providerName, state, error, errorCode, retryCount, maxRetries }: any) => (
    <div data-testid="oauth-callback-ui">
      <div>Provider: {providerName}</div>
      <div>State: {state}</div>
      {error && <div>Error: {error}</div>}
      {errorCode && <div>Error Code: {errorCode}</div>}
      {retryCount !== undefined && <div>Retry Count: {retryCount}</div>}
      {maxRetries !== undefined && <div>Max Retries: {maxRetries}</div>}
    </div>
  ),
}));

describe("FitbitCallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch = { code: undefined, state: undefined };
    mockStatus = "idle";
    mockIsSuccess = false;
    mockIsPending = false;
    mockIsError = false;
    mockError = null;
  });

  it("should show invalid state when no code or state provided", () => {
    render(<FitbitCallback />);

    const ui = screen.getByTestId("oauth-callback-ui");
    expect(ui).toHaveTextContent("Provider: Fitbit");
    expect(ui).toHaveTextContent("State: invalid");
  });

  it("should show loading state and initiate token exchange when code and state are provided", () => {
    mockSearch = { code: "abc123", state: "xyz789" };

    render(<FitbitCallback />);

    const ui = screen.getByTestId("oauth-callback-ui");
    expect(ui).toHaveTextContent("State: loading");
    expect(mockMutate).toHaveBeenCalledWith({ code: "abc123" });
  });

  it("should show loading state while mutation is pending", () => {
    mockSearch = { code: "abc123", state: "xyz789" };
    mockIsPending = true;

    render(<FitbitCallback />);

    const ui = screen.getByTestId("oauth-callback-ui");
    expect(ui).toHaveTextContent("State: loading");
  });

  it("should pass correct props to OAuthCallbackUI", () => {
    mockSearch = { code: undefined, state: undefined };

    render(<FitbitCallback />);

    const ui = screen.getByTestId("oauth-callback-ui");
    expect(ui).toHaveTextContent("Provider: Fitbit");
    expect(ui).toHaveTextContent("State: invalid");
    expect(ui).not.toHaveTextContent("Error:");
    expect(ui).not.toHaveTextContent("Error Code:");
  });
});
