import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactElement, type ReactNode } from "react";

// Create a test query client with shorter retry delays
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface AllTheProvidersProps {
  children: ReactNode;
}

// Provider wrapper for tests
export function AllTheProviders({ children }: AllTheProvidersProps) {
  const queryClient = createTestQueryClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from "@testing-library/react";

// Override render method
export { customRender as render };

// Test data builders
export const createMockUser = (overrides = {}) => ({
  id: "123e4567-e89b-12d3-a456-426614174000",
  email: "test@example.com",
  profile: {
    firstName: "Test",
    goalStart: new Date("2024-01-01"),
    goalWeight: 70,
    plannedPoundsPerWeek: 1,
    dayStartOffset: 0,
    useMetric: false,
    showCalories: false,
    sharingToken: "test-token-12345",
    sharingEnabled: false,
  },
  ...overrides,
});

export const createMockWeightEntry = (overrides = {}) => ({
  date: new Date().toISOString(),
  weight: 75.5,
  trend: 75.2,
  ...overrides,
});
