import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { ConnectFitbit } from "./connect-fitbit";

const mockApiRequest = vi.fn();
vi.mock("@/lib/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/client")>();
  return { ...actual, apiRequest: (...args: unknown[]) => mockApiRequest(...args) };
});

vi.mock("@/lib/auth/use-auth", () => ({
  useAuth: () => ({ getToken: async () => "token" }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

describe("ConnectFitbit", () => {
  const assign = vi.fn();
  const originalLocation = window.location;

  beforeEach(() => {
    mockApiRequest.mockReset();
    assign.mockReset();
    Object.defineProperty(window, "location", { value: { ...originalLocation, assign }, configurable: true, writable: true });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { value: originalLocation, configurable: true, writable: true });
  });

  it("sends the browser to the authorization URL returned by the API", async () => {
    mockApiRequest.mockResolvedValue({ authorizationUrl: "https://www.fitbit.com/oauth2/authorize?x=1" });

    render(<ConnectFitbit />);

    expect(screen.getByText(/Sending you to Fitbit/)).toBeInTheDocument();
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://www.fitbit.com/oauth2/authorize?x=1"));
    expect(mockApiRequest).toHaveBeenCalledWith("/fitbit/link", { token: "token" });
  });

  it("explains the shutdown when the API answers 503", async () => {
    mockApiRequest.mockRejectedValue(new ApiError(503, "Fitbit is disabled"));

    render(<ConnectFitbit />);

    expect(await screen.findByText(/no longer available/)).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it("shows the failure message for other errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockApiRequest.mockRejectedValue(new ApiError(500, "boom"));

    render(<ConnectFitbit />);

    expect(await screen.findByText(/Something went wrong starting the Fitbit connection/)).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });
});
