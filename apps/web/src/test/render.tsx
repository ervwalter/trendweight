import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import type { FC, PropsWithChildren, ReactElement } from "react";
import { SyncProgressProvider } from "@/components/dashboard/sync-progress";
import { DashboardProvider } from "@/lib/dashboard/context";
import type { DashboardData } from "@/lib/dashboard/dashboard-context";
import { buildDashboardData } from "./fixtures/dashboard";
import { createTestQueryClient } from "./query-client";

export interface ProviderOptions {
  // Defaults to a fresh createTestQueryClient()
  queryClient?: QueryClient;
  // Wrap in the real SyncProgressProvider (needed by useSyncProgress and the progress-aware
  // dashboard queries). Realtime is disabled in tests because the Supabase env is unset.
  syncProgress?: boolean;
}

export type RenderWithProvidersOptions = ProviderOptions & Omit<RenderOptions, "wrapper">;

export type RenderWithProvidersResult = RenderResult & { queryClient: QueryClient };

// A wrapper component for renderHook: QueryClientProvider (and optionally SyncProgressProvider).
export function createQueryWrapper(
  queryClient: QueryClient = createTestQueryClient(),
  { syncProgress = false }: { syncProgress?: boolean } = {},
): FC<PropsWithChildren> {
  return function QueryWrapper({ children }) {
    const content = syncProgress ? <SyncProgressProvider>{children}</SyncProgressProvider> : children;
    return <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>;
  };
}

// Render inside the app's data providers. Returns the RTL result plus the QueryClient so tests
// can seed or inspect the cache.
export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}): RenderWithProvidersResult {
  const { queryClient = createTestQueryClient(), syncProgress = false, ...renderOptions } = options;
  const wrapper = createQueryWrapper(queryClient, { syncProgress });
  return { ...render(ui, { wrapper, ...renderOptions }), queryClient };
}

export type RenderWithDashboardDataResult = RenderWithProvidersResult & {
  data: DashboardData;
  // Re-render with different dashboard data (same providers and QueryClient)
  rerenderWithDashboardData: (overrides?: Partial<DashboardData>) => DashboardData;
};

// Render a dashboard component inside the real DashboardProvider (so useDashboardData works
// without mocking "@/lib/dashboard/hooks") plus the data providers above.
export function renderWithDashboardData(
  ui: ReactElement,
  overrides: Partial<DashboardData> = {},
  options: RenderWithProvidersOptions = {},
): RenderWithDashboardDataResult {
  const data = buildDashboardData(overrides);
  const result = renderWithProviders(<DashboardProvider data={data}>{ui}</DashboardProvider>, options);
  const rerenderWithDashboardData = (next: Partial<DashboardData> = {}) => {
    const nextData = buildDashboardData(next);
    result.rerender(<DashboardProvider data={nextData}>{ui}</DashboardProvider>);
    return nextData;
  };
  return { ...result, data, rerenderWithDashboardData };
}
