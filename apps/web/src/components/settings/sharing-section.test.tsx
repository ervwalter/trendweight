import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SharingSection } from "./sharing-section";

const mockToggle = vi.fn();
let mockSharingData: { sharingEnabled: boolean; sharingToken?: string } = { sharingEnabled: false, sharingToken: "abc123" };

vi.mock("@/lib/api/queries", () => ({
  useSharingSettings: () => ({ data: mockSharingData }),
}));

vi.mock("@/lib/api/mutations", () => ({
  useToggleSharing: () => ({ mutate: mockToggle, isPending: false }),
  useGenerateShareToken: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("SharingSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSharingData = { sharingEnabled: false, sharingToken: "abc123" };
  });

  it("toggles sharing when the label next to the switch is clicked", () => {
    render(<SharingSection />);

    const toggle = screen.getByLabelText("Enable sharing");
    expect(toggle).toHaveAttribute("role", "switch");

    fireEvent.click(screen.getByText("Enable sharing"));

    expect(mockToggle).toHaveBeenCalledWith(true);
  });

  it("shows the share URL once a token exists", () => {
    mockSharingData = { sharingEnabled: true, sharingToken: "abc123" };
    render(<SharingSection />);

    expect(screen.getByDisplayValue(`${window.location.origin}/u/abc123`)).toBeInTheDocument();
  });
});
