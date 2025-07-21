import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NoDataCard } from "./NoDataCard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "../../test/mocks/server";
import { http, HttpResponse } from "msw";

describe("NoDataCard", () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    server.resetHandlers();
  });

  it("renders waiting for data message", async () => {
    server.use(
      http.get("/api/providers/links", () => {
        return HttpResponse.json([]);
      }),
    );

    render(<NoDataCard />, { wrapper: createWrapper() });

    expect(await screen.findByText("Waiting for Data")).toBeInTheDocument();
    expect(screen.getByText(/Your account is connected to/)).toBeInTheDocument();
    expect(screen.getByText(/Your charts and stats will appear here/)).toBeInTheDocument();
    expect(screen.getByText(/TrendWeight looks for new measurements/)).toBeInTheDocument();
  });

  it("shows Withings when connected to Withings", async () => {
    server.use(
      http.get("/api/providers/links", () => {
        return HttpResponse.json([
          {
            provider: "withings",
            hasToken: true,
          },
        ]);
      }),
    );

    render(<NoDataCard />, { wrapper: createWrapper() });

    expect(await screen.findByText(/Your account is connected to Withings/)).toBeInTheDocument();
  });

  it("shows Fitbit when connected to Fitbit", async () => {
    server.use(
      http.get("/api/providers/links", () => {
        return HttpResponse.json([
          {
            provider: "fitbit",
            hasToken: true,
          },
        ]);
      }),
    );

    render(<NoDataCard />, { wrapper: createWrapper() });

    expect(await screen.findByText(/Your account is connected to Fitbit/)).toBeInTheDocument();
  });

  it("shows both providers when connected to both", async () => {
    server.use(
      http.get("/api/providers/links", () => {
        return HttpResponse.json([
          {
            provider: "withings",
            hasToken: true,
          },
          {
            provider: "fitbit",
            hasToken: true,
          },
        ]);
      }),
    );

    render(<NoDataCard />, { wrapper: createWrapper() });

    expect(await screen.findByText(/Your account is connected to Withings and Fitbit/)).toBeInTheDocument();
  });

  it("shows generic provider text when no providers connected", async () => {
    server.use(
      http.get("/api/providers/links", () => {
        return HttpResponse.json([]);
      }),
    );

    render(<NoDataCard />, { wrapper: createWrapper() });

    expect(await screen.findByText(/Your account is connected to your provider/)).toBeInTheDocument();
  });

  it("filters out providers without tokens", async () => {
    server.use(
      http.get("/api/providers/links", () => {
        return HttpResponse.json([
          {
            provider: "withings",
            hasToken: true,
          },
          {
            provider: "fitbit",
            hasToken: false,
          },
        ]);
      }),
    );

    render(<NoDataCard />, { wrapper: createWrapper() });

    expect(await screen.findByText(/Your account is connected to Withings/)).toBeInTheDocument();
    expect(screen.queryByText(/Fitbit/)).not.toBeInTheDocument();
  });

  it("includes clock icon", async () => {
    server.use(
      http.get("/api/providers/links", () => {
        return HttpResponse.json([]);
      }),
    );

    const { container } = render(<NoDataCard />, { wrapper: createWrapper() });

    await screen.findByText("Waiting for Data");

    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("h-8", "w-8");
  });

  it("has correct card styling", async () => {
    server.use(
      http.get("/api/providers/links", () => {
        return HttpResponse.json([]);
      }),
    );

    const { container } = render(<NoDataCard />, { wrapper: createWrapper() });

    await screen.findByText("Waiting for Data");

    const card = container.firstChild;
    expect(card).toHaveClass("mx-auto", "max-w-2xl", "rounded-lg", "border", "border-gray-200", "bg-white", "p-6", "shadow-sm");
  });
});
