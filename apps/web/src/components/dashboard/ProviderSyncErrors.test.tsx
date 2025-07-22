import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProviderSyncErrors from "./ProviderSyncErrors";
import type { ProviderSyncStatus } from "../../lib/api/types";

// Mock the ProviderSyncError component
vi.mock("./ProviderSyncError", () => ({
  default: ({ provider, status }: { provider: string; status: ProviderSyncStatus }) => (
    <div data-testid={`error-${provider}`}>
      {provider}: {status.error}
    </div>
  ),
}));

describe("ProviderSyncErrors", () => {
  it("should return null when providerStatus is undefined", () => {
    const { container } = render(<ProviderSyncErrors />);
    expect(container.firstChild).toBeNull();
  });

  it("should return null when providerStatus is empty", () => {
    const { container } = render(<ProviderSyncErrors providerStatus={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it("should return null when all providers are successful", () => {
    const providerStatus = {
      fitbit: { success: true } as ProviderSyncStatus,
      withings: { success: true } as ProviderSyncStatus,
    };

    const { container } = render(<ProviderSyncErrors providerStatus={providerStatus} />);
    expect(container.firstChild).toBeNull();
  });

  it("should return null when providers have no error", () => {
    const providerStatus = {
      fitbit: { success: false } as ProviderSyncStatus,
      withings: { success: false } as ProviderSyncStatus,
    };

    const { container } = render(<ProviderSyncErrors providerStatus={providerStatus} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render error for providers with errors", () => {
    const providerStatus = {
      fitbit: { success: false, error: "authfailed" } as ProviderSyncStatus,
      withings: { success: true } as ProviderSyncStatus,
    };

    render(<ProviderSyncErrors providerStatus={providerStatus} />);

    expect(screen.getByTestId("error-fitbit")).toBeInTheDocument();
    expect(screen.queryByTestId("error-withings")).not.toBeInTheDocument();
  });

  it("should render multiple errors sorted alphabetically", () => {
    const providerStatus = {
      withings: { success: false, error: "networkerror" } as ProviderSyncStatus,
      fitbit: { success: false, error: "authfailed" } as ProviderSyncStatus,
    };

    render(<ProviderSyncErrors providerStatus={providerStatus} />);

    const errors = screen.getAllByTestId(/^error-/);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toHaveAttribute("data-testid", "error-fitbit");
    expect(errors[1]).toHaveAttribute("data-testid", "error-withings");
  });

  it("should only render providers with both success=false and error defined", () => {
    const providerStatus = {
      fitbit: { success: false, error: "authfailed" } as ProviderSyncStatus,
      withings: { success: true, error: "authfailed" } as ProviderSyncStatus,
      garmin: { success: false } as ProviderSyncStatus,
    };

    render(<ProviderSyncErrors providerStatus={providerStatus} />);

    expect(screen.getByTestId("error-fitbit")).toBeInTheDocument();
    expect(screen.queryByTestId("error-withings")).not.toBeInTheDocument();
    expect(screen.queryByTestId("error-garmin")).not.toBeInTheDocument();
  });
});
