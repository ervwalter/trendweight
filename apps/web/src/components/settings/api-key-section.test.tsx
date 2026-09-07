import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiKeySection } from "./api-key-section";
import { useApiKey } from "@/lib/api/queries";
import { useGenerateApiKey, useRevokeApiKey } from "@/lib/api/mutations";
import { useToast } from "@/lib/hooks/use-toast";

vi.mock("@/lib/api/queries");
vi.mock("@/lib/api/mutations");
vi.mock("@/lib/hooks/use-toast");

// Mock ConfirmDialog like other component tests do
vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({ open, onConfirm, title, description, confirmText }: any) =>
    open ? (
      <div data-testid="confirm-dialog">
        <div>{title}</div>
        <div>{description}</div>
        <button onClick={onConfirm}>{confirmText}</button>
      </div>
    ) : null,
}));

describe("ApiKeySection", () => {
  const mockGenerateMutateAsync = vi.fn();
  const mockRevokeMutateAsync = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast } as any);
    vi.mocked(useGenerateApiKey).mockReturnValue({
      mutateAsync: mockGenerateMutateAsync,
      isPending: false,
    } as any);
    vi.mocked(useRevokeApiKey).mockReturnValue({
      mutateAsync: mockRevokeMutateAsync,
      isPending: false,
    } as any);
  });

  it("should offer to generate a key when none exists", () => {
    vi.mocked(useApiKey).mockReturnValue({ data: { exists: false } } as any);

    render(<ApiKeySection />);

    expect(screen.getByText("Generate API Key")).toBeInTheDocument();
    expect(screen.queryByText("Regenerate")).not.toBeInTheDocument();
  });

  it("should link to the API reference docs", () => {
    vi.mocked(useApiKey).mockReturnValue({ data: { exists: false } } as any);

    render(<ApiKeySection />);

    expect(screen.getByRole("link", { name: /API reference/i })).toHaveAttribute("href", "/api-docs/v1");
  });

  it("should show the plaintext key once after generating", async () => {
    const user = userEvent.setup();
    vi.mocked(useApiKey).mockReturnValue({ data: { exists: false } } as any);
    mockGenerateMutateAsync.mockResolvedValue({
      apiKey: "sk-0123456789abcdefghijklmno",
      suffix: "lmno",
      createdAt: "2026-08-23T00:00:00Z",
    });

    render(<ApiKeySection />);
    await user.click(screen.getByText("Generate API Key"));

    expect(screen.getByDisplayValue("sk-0123456789abcdefghijklmno")).toBeInTheDocument();
    expect(screen.getByText(/it won't be shown again/i)).toBeInTheDocument();
  });

  it("should show suffix and created date for an existing key", () => {
    vi.mocked(useApiKey).mockReturnValue({
      data: { exists: true, suffix: "wxyz", createdAt: "2026-08-01T12:00:00Z" },
    } as any);

    render(<ApiKeySection />);

    expect(screen.getByText("sk-…wxyz")).toBeInTheDocument();
    expect(screen.getByText(/Created/)).toBeInTheDocument();
    expect(screen.getByText("Regenerate")).toBeInTheDocument();
    expect(screen.getByText("Revoke")).toBeInTheDocument();
  });

  it("should regenerate only after confirmation", async () => {
    const user = userEvent.setup();
    vi.mocked(useApiKey).mockReturnValue({
      data: { exists: true, suffix: "wxyz", createdAt: "2026-08-01T12:00:00Z" },
    } as any);
    mockGenerateMutateAsync.mockResolvedValue({
      apiKey: "sk-newkey",
      suffix: "wkey",
      createdAt: "2026-08-23T00:00:00Z",
    });

    render(<ApiKeySection />);
    await user.click(screen.getByText("Regenerate"));

    expect(mockGenerateMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    expect(screen.getByText(/invalidate your current API key/i)).toBeInTheDocument();

    const confirmButton = screen.getByTestId("confirm-dialog").querySelector("button");
    await user.click(confirmButton!);

    expect(mockGenerateMutateAsync).toHaveBeenCalledOnce();
    expect(screen.getByDisplayValue("sk-newkey")).toBeInTheDocument();
  });

  it("should revoke only after confirmation", async () => {
    const user = userEvent.setup();
    vi.mocked(useApiKey).mockReturnValue({
      data: { exists: true, suffix: "wxyz", createdAt: "2026-08-01T12:00:00Z" },
    } as any);
    mockRevokeMutateAsync.mockResolvedValue(null);

    render(<ApiKeySection />);
    await user.click(screen.getByText("Revoke"));

    expect(mockRevokeMutateAsync).not.toHaveBeenCalled();

    const confirmButton = screen.getByTestId("confirm-dialog").querySelector("button");
    await user.click(confirmButton!);

    expect(mockRevokeMutateAsync).toHaveBeenCalledOnce();
  });

  it("should toast when generating a first key fails", async () => {
    const user = userEvent.setup();
    vi.mocked(useApiKey).mockReturnValue({ data: { exists: false } } as any);
    mockGenerateMutateAsync.mockRejectedValue(new Error("nope"));

    render(<ApiKeySection />);
    await user.click(screen.getByText("Generate API Key"));

    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "error", description: expect.stringMatching(/could not be generated/i) }));
    expect(screen.getByText("Generate API Key")).toBeInTheDocument();
    expect(screen.queryByText(/won't be shown again/i)).not.toBeInTheDocument();
  });

  it("should toast and close the dialog when regenerating fails", async () => {
    const user = userEvent.setup();
    vi.mocked(useApiKey).mockReturnValue({
      data: { exists: true, suffix: "wxyz", createdAt: "2026-08-01T12:00:00Z" },
    } as any);
    mockGenerateMutateAsync.mockRejectedValue(new Error("nope"));

    render(<ApiKeySection />);
    await user.click(screen.getByText("Regenerate"));
    await user.click(screen.getByTestId("confirm-dialog").querySelector("button")!);

    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "error" }));
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
    expect(screen.getByText("sk-…wxyz")).toBeInTheDocument();
  });

  it("should toast and close the dialog when revoking fails", async () => {
    const user = userEvent.setup();
    vi.mocked(useApiKey).mockReturnValue({
      data: { exists: true, suffix: "wxyz", createdAt: "2026-08-01T12:00:00Z" },
    } as any);
    mockRevokeMutateAsync.mockRejectedValue(new Error("nope"));

    render(<ApiKeySection />);
    await user.click(screen.getByText("Revoke"));
    await user.click(screen.getByTestId("confirm-dialog").querySelector("button")!);

    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "error", description: expect.stringMatching(/could not be revoked/i) }));
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
  });
});
