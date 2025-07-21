import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import type { RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter, createMemoryHistory } from "@tanstack/react-router";
import { vi, beforeAll, afterAll, expect } from "vitest";
import { routeTree } from "../routeTree.gen";

// Create a custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialEntries?: string[];
  queryClient?: QueryClient;
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { initialEntries = ["/"], queryClient = createTestQueryClient(), ...renderOptions }: CustomRenderOptions = {},
) {
  const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    context: {
      queryClient,
    },
    history: createMemoryHistory({
      initialEntries,
    }),
  });

  function Wrapper() {
    return (
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
    router,
  };
}

// Re-export everything from testing library
export * from "@testing-library/react";
export { renderWithProviders as render };

// Test data factories
export function createMockWeightData(overrides = {}) {
  return {
    id: "test-id",
    userId: "test-user",
    weight: 75.5,
    weightUnit: "kg",
    measuredAt: new Date().toISOString(),
    source: "manual",
    ...overrides,
  };
}

export function createMockUserSettings(overrides = {}) {
  return {
    id: "test-user",
    email: "test@example.com",
    displayName: "Test User",
    weightUnit: "kg",
    timezone: "UTC",
    weekStartsOn: 0,
    ...overrides,
  };
}

// Mock API responses
export function mockApiResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({
      "content-type": "application/json",
    }),
  };
}

// Date helpers for testing
export function createDateRange(days: number) {
  const dates = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(8, 0, 0, 0); // Consistent time for testing
    dates.push(date.toISOString());
  }

  return dates;
}

// Weight data generator for trend testing
export function generateWeightData(options: { days: number; startWeight: number; trend?: "up" | "down" | "stable"; variance?: number }) {
  const { days, startWeight, trend = "stable", variance = 0.5 } = options;
  const dates = createDateRange(days);
  const trendFactor = trend === "up" ? 0.1 : trend === "down" ? -0.1 : 0;

  return dates.map((date, index) => {
    const randomVariance = (Math.random() - 0.5) * variance * 2;
    const trendChange = trendFactor * index;
    const weight = startWeight + trendChange + randomVariance;

    return createMockWeightData({
      weight: Math.round(weight * 10) / 10, // Round to 1 decimal
      measuredAt: date,
    });
  });
}

// Custom matchers
export function expectToBeWithinRange(value: number, min: number, max: number) {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
}

// Async utilities
export async function waitForLoadingToFinish() {
  const { waitFor } = await import("@testing-library/react");
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
}

// Mock console methods to reduce noise in tests
export function suppressConsoleErrors() {
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });
}

// Local storage mock helpers
export function mockLocalStorage() {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
  };
}
