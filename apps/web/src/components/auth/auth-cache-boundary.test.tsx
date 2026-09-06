import { type QueryClient, useQuery } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode, useState } from "react";
import { describe, expect, it } from "vitest";
import { AuthCacheBoundary } from "@/components/auth/auth-cache-boundary";

describe("AuthCacheBoundary", () => {
  it("isolates cached health data and component state on account changes", async () => {
    let currentClient: QueryClient;
    const observed: string[] = [];

    function Account({ identity }: { identity: string }) {
      const [secret, setSecret] = useState("");
      const { data } = useQuery({ queryKey: ["profile"], queryFn: async () => identity });
      if (data) observed.push(`${identity}:${data}`);
      return (
        <>
          <p>{data}</p>
          <input aria-label="Secret" value={secret} onChange={(event) => setSecret(event.target.value)} />
        </>
      );
    }

    const app = (identity: string | null) => (
      <StrictMode>
        <AuthCacheBoundary identity={identity}>
          {(client) => {
            currentClient = client;
            return identity ? <Account identity={identity} /> : <p>Signed out</p>;
          }}
        </AuthCacheBoundary>
      </StrictMode>
    );

    const { rerender } = render(app("alice"));
    await screen.findByText("alice");
    fireEvent.change(screen.getByLabelText("Secret"), { target: { value: "alice-api-key" } });

    const aliceClient = currentClient!;
    rerender(app("bob"));
    await screen.findByText("bob");
    // A late mutation from the previous account cannot repopulate Bob's cache.
    aliceClient.setQueryData(["profile"], "alice");
    expect(currentClient!.getQueryData(["profile"])).toBe("bob");
    expect(observed).not.toContain("bob:alice");
    expect(screen.getByLabelText("Secret")).toHaveValue("");

    rerender(app(null));
    await screen.findByText("Signed out");
    await waitFor(() => expect(currentClient!.getQueryData(["profile"])).toBeUndefined());
  });
  it("discards a pending response after signing out", async () => {
    let resolveReading!: (value: string) => void;
    const response = new Promise<string>((resolve) => {
      resolveReading = resolve;
    });
    let signedOutClient: QueryClient | undefined;
    function Reading() {
      const { data } = useQuery({ queryKey: ["data"], queryFn: () => response });
      return <p>{data ?? "Loading reading"}</p>;
    }
    const { rerender } = render(<AuthCacheBoundary identity="alice">{() => <Reading />}</AuthCacheBoundary>);
    expect(screen.getByText("Loading reading")).toBeInTheDocument();
    rerender(
      <AuthCacheBoundary identity={null}>
        {(client) => {
          signedOutClient = client;
          return <p>Signed out</p>;
        }}
      </AuthCacheBoundary>,
    );
    await act(async () => {
      resolveReading("Alice's private reading");
      await response;
    });
    expect(screen.queryByText("Alice's private reading")).not.toBeInTheDocument();
    expect(signedOutClient?.getQueryData(["data"])).toBeUndefined();
  });

  it("renders public pages when starting signed out", () => {
    render(<AuthCacheBoundary identity={null}>{() => <p>Public page</p>}</AuthCacheBoundary>);
    expect(screen.getByText("Public page")).toBeInTheDocument();
  });
});
