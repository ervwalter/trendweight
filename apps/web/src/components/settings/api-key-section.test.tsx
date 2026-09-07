import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import type { ApiKeyMetadata } from "@/lib/api/types";
import { queryKeys } from "@/lib/api/queries";
import { useToast } from "@/lib/hooks/use-toast";
import { mockAuth, TEST_TOKEN } from "@/test/auth";
import { buildApiKeyMetadata, buildGeneratedApiKey } from "@/test/fixtures";
import { server } from "@/test/mocks/server";
import { json, noContent, recordRequests } from "@/test/msw";
import { renderWithProviders } from "@/test/render";
import { ApiKeySection } from "./api-key-section";

vi.mock("@/lib/auth/use-auth");
vi.mock("@/lib/hooks/use-toast");

const API_KEY_PATH = "/api/profile/api-key";
const NO_KEY: ApiKeyMetadata = { exists: false };

// A tiny in-memory key store so the refetch after a revoke sees the key gone
function givenApiKey(initial: ApiKeyMetadata) {
  let current = initial;
  server.use(
    http.get(API_KEY_PATH, () => json(200, current)),
    http.post(API_KEY_PATH, () => {
      const generated = buildGeneratedApiKey();
      current = { exists: true, suffix: generated.suffix, createdAt: generated.createdAt };
      return json(200, generated);
    }),
    http.delete(API_KEY_PATH, () => {
      current = NO_KEY;
      return noContent();
    }),
  );
}

function confirmDialog() {
  return within(screen.getByRole("alertdialog"));
}

describe("ApiKeySection", () => {
  const showToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
    vi.mocked(useToast).mockReturnValue({ showToast });
  });

  it("offers to generate a key when none exists and links to the API reference", async () => {
    givenApiKey(NO_KEY);
    renderWithProviders(<ApiKeySection />);

    expect(await screen.findByRole("button", { name: "Generate API Key" })).toBeEnabled();
    expect(screen.getByRole("link", { name: /API reference/i })).toHaveAttribute("href", "/api-docs/v1");
    expect(screen.queryByRole("button", { name: "Regenerate" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke" })).not.toBeInTheDocument();
  });

  it("shows the plaintext key once after generating and never caches it", async () => {
    const user = userEvent.setup();
    givenApiKey(NO_KEY);
    const recorder = recordRequests();
    const { queryClient } = renderWithProviders(<ApiKeySection />);
    const generated = buildGeneratedApiKey();

    await user.click(await screen.findByRole("button", { name: "Generate API Key" }));

    expect(await screen.findByDisplayValue(generated.apiKey)).toBeInTheDocument();
    expect(screen.getByText(/it won't be shown again/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate API Key" })).not.toBeInTheDocument();

    const [post] = recorder.byPath(API_KEY_PATH).filter((call) => call.method === "POST");
    expect(post.headers.authorization).toBe(`Bearer ${TEST_TOKEN}`);

    const cached = queryClient.getQueryData<ApiKeyMetadata>(queryKeys.apiKey());
    expect(cached).toEqual({ exists: true, suffix: generated.suffix, createdAt: generated.createdAt });
    expect(JSON.stringify(cached)).not.toContain(generated.apiKey);
  });

  it("shows the suffix and creation date of an existing key", async () => {
    givenApiKey(buildApiKeyMetadata({ suffix: "wxyz", createdAt: "2024-01-10T08:00:00Z" }));
    renderWithProviders(<ApiKeySection />);

    expect(await screen.findByText("sk-…wxyz")).toBeInTheDocument();
    expect(screen.getByText(/^Created /)).toHaveTextContent(/January 10, 2024/);
    expect(screen.getByRole("button", { name: "Regenerate" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Revoke" })).toBeEnabled();
  });

  it("regenerates only after confirmation", async () => {
    const user = userEvent.setup();
    givenApiKey(buildApiKeyMetadata());
    const recorder = recordRequests();
    const { queryClient } = renderWithProviders(<ApiKeySection />);
    const generated = buildGeneratedApiKey();

    await user.click(await screen.findByRole("button", { name: "Regenerate" }));

    expect(confirmDialog().getByText(/invalidate your current API key/i)).toBeInTheDocument();
    expect(recorder.byPath(API_KEY_PATH).filter((call) => call.method === "POST")).toHaveLength(0);

    await user.click(confirmDialog().getByRole("button", { name: "Regenerate" }));

    expect(await screen.findByDisplayValue(generated.apiKey)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(recorder.byPath(API_KEY_PATH).filter((call) => call.method === "POST")).toHaveLength(1);
    expect(JSON.stringify(queryClient.getQueryData(queryKeys.apiKey()))).not.toContain(generated.apiKey);
  });

  it("revokes only after confirmation", async () => {
    const user = userEvent.setup();
    givenApiKey(buildApiKeyMetadata());
    const recorder = recordRequests();
    renderWithProviders(<ApiKeySection />);

    await user.click(await screen.findByRole("button", { name: "Revoke" }));

    expect(confirmDialog().getByText(/permanently invalidate your API key/i)).toBeInTheDocument();
    expect(recorder.byPath(API_KEY_PATH).filter((call) => call.method === "DELETE")).toHaveLength(0);

    await user.click(confirmDialog().getByRole("button", { name: "Revoke" }));

    expect(await screen.findByRole("button", { name: "Generate API Key" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.queryByText("sk-…wxyz")).not.toBeInTheDocument();
    const [del] = recorder.byPath(API_KEY_PATH).filter((call) => call.method === "DELETE");
    expect(del.headers.authorization).toBe(`Bearer ${TEST_TOKEN}`);
  });

  it("toasts when generating a first key fails", async () => {
    const user = userEvent.setup();
    givenApiKey(NO_KEY);
    server.use(http.post(API_KEY_PATH, () => json(500, { error: "nope" })));
    renderWithProviders(<ApiKeySection />);

    await user.click(await screen.findByRole("button", { name: "Generate API Key" }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "error", description: expect.stringMatching(/could not be generated/i) })),
    );
    expect(screen.getByRole("button", { name: "Generate API Key" })).toBeEnabled();
    expect(screen.queryByText(/won't be shown again/i)).not.toBeInTheDocument();
  });

  it("toasts and closes the dialog when regenerating fails", async () => {
    const user = userEvent.setup();
    givenApiKey(buildApiKeyMetadata());
    server.use(http.post(API_KEY_PATH, () => json(500, { error: "nope" })));
    renderWithProviders(<ApiKeySection />);

    await user.click(await screen.findByRole("button", { name: "Regenerate" }));
    await user.click(confirmDialog().getByRole("button", { name: "Regenerate" }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "error" })));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByText("sk-…wxyz")).toBeInTheDocument();
  });

  it("toasts and closes the dialog when revoking fails", async () => {
    const user = userEvent.setup();
    givenApiKey(buildApiKeyMetadata());
    server.use(http.delete(API_KEY_PATH, () => json(500, { error: "nope" })));
    renderWithProviders(<ApiKeySection />);

    await user.click(await screen.findByRole("button", { name: "Revoke" }));
    await user.click(confirmDialog().getByRole("button", { name: "Revoke" }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "error", description: expect.stringMatching(/could not be revoked/i) })),
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByText("sk-…wxyz")).toBeInTheDocument();
  });
});
