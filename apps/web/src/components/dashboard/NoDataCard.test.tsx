import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NoDataCard } from "./NoDataCard";
import type { ProviderSyncStatus } from "../../lib/api/types";

describe("NoDataCard", () => {
  it("renders waiting for data message when no providers", () => {
    render(<NoDataCard />);

    expect(screen.getByText("Waiting for Data")).toBeInTheDocument();
    expect(screen.getByText(/Your account is connected to your provider/)).toBeInTheDocument();
    expect(screen.getByText(/Your charts and stats will appear here/)).toBeInTheDocument();
    expect(screen.getByText(/TrendWeight looks for new measurements/)).toBeInTheDocument();
  });

  it("shows Withings when connected to Withings", () => {
    const providerStatus: Record<string, ProviderSyncStatus> = {
      withings: { success: true },
    };

    render(<NoDataCard providerStatus={providerStatus} />);

    expect(screen.getByText(/Your account is connected to Withings/)).toBeInTheDocument();
  });

  it("shows Fitbit when connected to Fitbit", () => {
    const providerStatus: Record<string, ProviderSyncStatus> = {
      fitbit: { success: true },
    };

    render(<NoDataCard providerStatus={providerStatus} />);

    expect(screen.getByText(/Your account is connected to Fitbit/)).toBeInTheDocument();
  });

  it("shows both providers when connected to both", () => {
    const providerStatus: Record<string, ProviderSyncStatus> = {
      withings: { success: true },
      fitbit: { success: true },
    };

    render(<NoDataCard providerStatus={providerStatus} />);

    expect(screen.getByText(/Your account is connected to Withings and Fitbit/)).toBeInTheDocument();
  });

  it("shows error message when provider has auth error", () => {
    const providerStatus: Record<string, ProviderSyncStatus> = {
      fitbit: { success: false, error: "authfailed", message: "Authentication failed" },
    };

    render(<NoDataCard providerStatus={providerStatus} />);

    expect(screen.getByText(/TrendWeight couldn't retrieve your weight measurements due to a connection issue/)).toBeInTheDocument();
    expect(screen.getByText(/Please reconnect your scale account above/)).toBeInTheDocument();
  });

  it("shows normal message when provider sync is successful", () => {
    const providerStatus: Record<string, ProviderSyncStatus> = {
      fitbit: { success: true },
    };

    render(<NoDataCard providerStatus={providerStatus} />);

    expect(screen.getByText(/Your account is connected to Fitbit/)).toBeInTheDocument();
    expect(screen.getByText(/Your charts and stats will appear here/)).toBeInTheDocument();
    expect(screen.queryByText(/couldn't retrieve your weight measurements/)).not.toBeInTheDocument();
  });

  it("includes clock icon", () => {
    const { container } = render(<NoDataCard />);

    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("h-8", "w-8");
  });

  it("has correct card styling", () => {
    const { container } = render(<NoDataCard />);

    const card = container.firstChild;
    expect(card).toHaveClass("mx-auto", "max-w-2xl", "rounded-lg", "border", "border-gray-200", "bg-white", "p-6", "shadow-sm");
  });
});
