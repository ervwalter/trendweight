import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ProviderMetadata } from "@/lib/utils/provider-display";
import { ProviderActions, type ProviderActionState, type ProviderListVariant } from "./provider-actions";

const withings: ProviderMetadata = {
  id: "withings",
  name: "Withings",
  displayName: "Withings Account",
  description: "Smart scales",
  note: "Syncs daily",
  supportsOAuth: true,
  supportsSync: true,
};

function buildActions(overrides: Partial<ProviderActionState> = {}): ProviderActionState {
  return {
    isConnected: true,
    isShutOff: false,
    resyncPending: false,
    resyncDisabled: false,
    disconnectPending: false,
    disconnectDisabled: false,
    onConnect: vi.fn(),
    onResync: vi.fn(),
    onDisconnect: vi.fn(),
    ...overrides,
  };
}

function renderActions(variant: ProviderListVariant, overrides: Partial<ProviderActionState> = {}) {
  const actions = buildActions(overrides);
  render(<ProviderActions provider={withings} variant={variant} {...actions} />);
  return actions;
}

describe("ProviderActions", () => {
  describe("when not connected", () => {
    it.each([
      ["link", "Connect Withings Account"],
      ["settings", "Connect"],
    ] as const)("offers only a connect button in the %s variant", async (variant, label) => {
      const user = userEvent.setup();
      const actions = renderActions(variant, { isConnected: false });

      expect(screen.getAllByRole("button")).toHaveLength(1);
      await user.click(screen.getByRole("button", { name: label }));

      expect(actions.onConnect).toHaveBeenCalledTimes(1);
      expect(actions.onResync).not.toHaveBeenCalled();
      expect(actions.onDisconnect).not.toHaveBeenCalled();
    });
  });

  describe("when connected", () => {
    it.each([
      ["link", "Resync Data"],
      ["settings", "Resync"],
    ] as const)("offers resync and disconnect in the %s variant", async (variant, resyncLabel) => {
      const user = userEvent.setup();
      const actions = renderActions(variant);

      expect(screen.getAllByRole("button")).toHaveLength(2);

      await user.click(screen.getByRole("button", { name: resyncLabel }));
      expect(actions.onResync).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole("button", { name: "Disconnect" }));
      expect(actions.onDisconnect).toHaveBeenCalledTimes(1);
      expect(actions.onConnect).not.toHaveBeenCalled();
    });

    it("shows the pending labels while a resync or disconnect is in flight", () => {
      renderActions("settings", { resyncPending: true, disconnectPending: true });

      expect(screen.getByRole("button", { name: "Syncing..." })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Disconnecting..." })).toBeInTheDocument();
    });

    it("disables the buttons when asked to", async () => {
      const user = userEvent.setup();
      const actions = renderActions("settings", { resyncDisabled: true, disconnectDisabled: true });

      const resync = screen.getByRole("button", { name: "Resync" });
      const disconnect = screen.getByRole("button", { name: "Disconnect" });
      expect(resync).toBeDisabled();
      expect(disconnect).toBeDisabled();

      await user.click(resync);
      await user.click(disconnect);
      expect(actions.onResync).not.toHaveBeenCalled();
      expect(actions.onDisconnect).not.toHaveBeenCalled();
    });
  });

  describe("when the provider has been shut off", () => {
    it("offers only to delete the remaining data", async () => {
      const user = userEvent.setup();
      const actions = renderActions("link", { isShutOff: true });

      expect(screen.getAllByRole("button")).toHaveLength(1);
      expect(screen.queryByRole("button", { name: /resync/i })).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Delete Data" }));
      expect(actions.onDisconnect).toHaveBeenCalledTimes(1);
    });

    it("shows the deleting label while the delete is in flight", () => {
      renderActions("settings", { isShutOff: true, disconnectPending: true });

      expect(screen.getByRole("button", { name: "Deleting..." })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /disconnect/i })).not.toBeInTheDocument();
    });
  });
});
