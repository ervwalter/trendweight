import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SharingSection } from "./sharing-section";

const mockToggle = vi.fn();
const mockGenerateToken = vi.fn();
const mockShowToast = vi.fn();
let mockSharingData: { sharingEnabled: boolean; sharingToken?: string } = { sharingEnabled: false, sharingToken: "abc123" };

vi.mock("@/lib/api/queries", () => ({
  useSharingSettings: () => ({ data: mockSharingData }),
}));

vi.mock("@/lib/api/mutations", () => ({
  useToggleSharing: () => ({ mutate: mockToggle, isPending: false }),
  useGenerateShareToken: () => ({ mutateAsync: mockGenerateToken, isPending: false }),
}));

vi.mock("@/lib/hooks/use-toast", () => ({
  useToast: () => ({ showToast: mockShowToast }),
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

  it("disables the URL field and copy button while sharing is off", () => {
    render(<SharingSection />);

    expect(screen.getByDisplayValue(`${window.location.origin}/u/abc123`)).toBeDisabled();
    expect(screen.getByRole("button", { name: /copy/i })).toBeDisabled();
  });

  it("generates a new URL only after confirmation", async () => {
    const user = userEvent.setup();
    mockSharingData = { sharingEnabled: true, sharingToken: "abc123" };
    mockGenerateToken.mockResolvedValue({ sharingEnabled: true, sharingToken: "new456" });
    render(<SharingSection />);

    await user.click(screen.getByRole("button", { name: "Get a New URL" }));
    expect(mockGenerateToken).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toHaveTextContent(`${window.location.origin}/u/abc123`);

    await user.click(screen.getByRole("button", { name: "Generate New URL" }));

    expect(mockGenerateToken).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("toasts and closes the dialog when generating a new URL fails", async () => {
    const user = userEvent.setup();
    mockSharingData = { sharingEnabled: true, sharingToken: "abc123" };
    mockGenerateToken.mockRejectedValue(new Error("nope"));
    render(<SharingSection />);

    await user.click(screen.getByRole("button", { name: "Get a New URL" }));
    await user.click(screen.getByRole("button", { name: "Generate New URL" }));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "error" })));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByDisplayValue(`${window.location.origin}/u/abc123`)).toBeInTheDocument();
  });
});
