import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import Buttons from "./Buttons";

// Mock the dependencies
vi.mock("../../lib/dashboard/hooks", () => ({
  useDashboardData: vi.fn(),
}));

vi.mock("../../lib/hooks/useMediaQuery", () => ({
  useIsMobile: vi.fn(),
}));

const mockUseDashboardData = vi.mocked(await import("../../lib/dashboard/hooks")).useDashboardData;
const mockUseIsMobile = vi.mocked(await import("../../lib/hooks/useMediaQuery")).useIsMobile;

describe("Buttons", () => {
  const mockSetMode = vi.fn();
  const mockSetTimeRange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobile.mockReturnValue(false);
    mockUseDashboardData.mockReturnValue({
      mode: ["weight", mockSetMode],
      timeRange: ["4w", mockSetTimeRange],
    } as any);
  });

  it("should render all time range buttons on desktop", () => {
    render(<Buttons />);

    expect(screen.getByRole("radio", { name: "4 weeks" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "3 months" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "6 months" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "1 year" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Explore" })).toBeInTheDocument();
  });

  it("should not render explore button on mobile", () => {
    mockUseIsMobile.mockReturnValue(true);
    render(<Buttons />);

    expect(screen.getByRole("radio", { name: "4 weeks" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Explore" })).not.toBeInTheDocument();
  });

  it("should render all mode buttons", () => {
    render(<Buttons />);

    expect(screen.getByRole("radio", { name: "Weight" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Fat %" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Fat Mass" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Lean Mass" })).toBeInTheDocument();
  });

  it("should call setTimeRange when time range button is clicked", async () => {
    const user = userEvent.setup();
    render(<Buttons />);

    const button = screen.getByRole("radio", { name: "3 months" });
    await user.click(button);
    expect(mockSetTimeRange).toHaveBeenCalledWith("3m");
  });

  it("should call setMode when mode button is clicked", async () => {
    const user = userEvent.setup();
    render(<Buttons />);

    const button = screen.getByRole("radio", { name: "Fat %" });
    await user.click(button);
    expect(mockSetMode).toHaveBeenCalledWith("fatpercent");
  });

  it("should switch away from explore mode when going to mobile", () => {
    // Start with explore mode on desktop
    mockUseDashboardData.mockReturnValue({
      mode: ["weight", mockSetMode],
      timeRange: ["explore", mockSetTimeRange],
    } as any);
    mockUseIsMobile.mockReturnValue(false);

    const { rerender } = render(<Buttons />);

    // Switch to mobile
    mockUseIsMobile.mockReturnValue(true);
    rerender(<Buttons />);

    expect(mockSetTimeRange).toHaveBeenCalledWith("4w");
  });

  it("should not switch time range on mobile if not in explore mode", () => {
    mockUseDashboardData.mockReturnValue({
      mode: ["weight", mockSetMode],
      timeRange: ["3m", mockSetTimeRange],
    } as any);
    mockUseIsMobile.mockReturnValue(true);

    render(<Buttons />);

    expect(mockSetTimeRange).not.toHaveBeenCalled();
  });

  it("should highlight the selected time range", () => {
    mockUseDashboardData.mockReturnValue({
      mode: ["weight", mockSetMode],
      timeRange: ["3m", mockSetTimeRange],
    } as any);

    render(<Buttons />);

    const selectedButton = screen.getByRole("radio", { name: "3 months" });
    expect(selectedButton).toHaveAttribute("data-state", "on");
  });

  it("should highlight the selected mode", () => {
    mockUseDashboardData.mockReturnValue({
      mode: ["fatpercent", mockSetMode],
      timeRange: ["4w", mockSetTimeRange],
    } as any);

    render(<Buttons />);

    const selectedButton = screen.getByRole("radio", { name: "Fat %" });
    expect(selectedButton).toHaveAttribute("data-state", "on");
  });
});
