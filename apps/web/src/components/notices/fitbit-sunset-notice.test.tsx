import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FitbitSunsetNotice } from "./fitbit-sunset-notice";

describe("FitbitSunsetNotice", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("should render the sunset heads-up with a link to the blog post", () => {
    render(<FitbitSunsetNotice />);

    expect(screen.getByText("Heads-up for Fitbit users")).toBeInTheDocument();
    expect(screen.getByText(/syncing is expected to stop in September 2026/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /read what's happening/i })).toHaveAttribute("href", "https://ewal.dev/fitbit-google-health-and-whats-next");
  });

  it("should dismiss and persist the dismissal", async () => {
    const user = userEvent.setup();
    render(<FitbitSunsetNotice />);

    await user.click(screen.getByRole("button", { name: "Dismiss notice" }));

    expect(screen.queryByText("Heads-up for Fitbit users")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("fitbitSunsetNoticeDismissed")).toBe("true");
  });

  it("should not render when previously dismissed", () => {
    window.localStorage.setItem("fitbitSunsetNoticeDismissed", "true");

    render(<FitbitSunsetNotice />);

    expect(screen.queryByText("Heads-up for Fitbit users")).not.toBeInTheDocument();
  });
});
