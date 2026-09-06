import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "./copy-button";

describe("CopyButton", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const clickCopy = async () => {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    });
  };

  it("copies the value and shows a confirmation that reverts after two seconds", async () => {
    render(<CopyButton value="https://example.com/u/abc" />);

    await clickCopy();

    expect(writeText).toHaveBeenCalledWith("https://example.com/u/abc");
    expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByRole("button", { name: "Copy to clipboard" })).toBeInTheDocument();
  });

  it("does nothing while disabled", async () => {
    render(<CopyButton value="secret" disabled />);

    await clickCopy();

    expect(writeText).not.toHaveBeenCalled();
  });

  it("clears the pending reset timer on unmount", async () => {
    const { unmount } = render(<CopyButton value="x" />);

    await clickCopy();
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
