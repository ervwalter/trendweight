import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Link } from "./link";

vi.mock("@/components/providers/provider-list", () => ({
  ProviderList: ({ variant }: { variant: string }) => <div data-testid="provider-list">Variant: {variant}</div>,
}));

describe("Link", () => {
  it("renders the provider list in its link layout", () => {
    render(<Link />);

    expect(screen.getByTestId("provider-list")).toHaveTextContent("Variant: link");
  });
});
