import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChangelog } from "@/lib/build/use-changelog";
import { freezeClock } from "@/test/clock";
import { Build } from "./build";

// The changelog is fetched from GitHub; use-changelog has its own MSW-backed tests
vi.mock("@/lib/build/use-changelog", () => ({ useChangelog: vi.fn() }));

const useChangelogMock = vi.mocked(useChangelog);

const REPO = "trendweight/trendweight";
const GITHUB = `https://github.com/${REPO}`;
const COMMIT = "abc123def456";
const BUILD_TIME = "2024-01-15T10:30:45Z";

describe("Build", () => {
  beforeEach(() => {
    useChangelogMock.mockReturnValue({ changelog: "## v2.0.0\n- New features\n- Bug fixes", loadingChangelog: false });
    // MODE is always "test" under Vitest; the rest of the build info comes from these
    vi.stubEnv("VITE_BUILD_TIME", BUILD_TIME);
    vi.stubEnv("VITE_BUILD_COMMIT", COMMIT);
    vi.stubEnv("VITE_BUILD_BRANCH", "main");
    vi.stubEnv("VITE_BUILD_VERSION", "v2.0.0");
    vi.stubEnv("VITE_BUILD_REPO", REPO);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders the page heading and explanation", () => {
    render(<Build />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Build Information");
    expect(screen.getByText(/This page contains technical information about the current build of TrendWeight/)).toBeInTheDocument();
  });

  it("links a tagged version to its release and the commit to GitHub", () => {
    freezeClock("2024-01-17T12:00:00Z");

    render(<Build />);

    expect(screen.getByRole("link", { name: "v2.0.0" })).toHaveAttribute("href", `${GITHUB}/releases/tag/v2.0.0`);
    expect(screen.getByRole("link", { name: "abc123d" })).toHaveAttribute("href", `${GITHUB}/commit/${COMMIT}`);
    expect(screen.getByRole("link", { name: REPO })).toHaveAttribute("href", GITHUB);
    expect(screen.getByText("main")).toBeInTheDocument();
    expect(screen.getByText("test")).toBeInTheDocument();
    // Build age is relative to the frozen clock; the local time is whatever the browser formats
    expect(screen.getByText("2 days ago")).toBeInTheDocument();
    expect(screen.getByText(new Date(BUILD_TIME).toLocaleString())).toBeInTheDocument();
    expect(useChangelogMock).toHaveBeenCalledWith("v2.0.0", REPO, true, GITHUB);
  });

  it("shows a CI build number as plain text and asks for no changelog", () => {
    vi.stubEnv("VITE_BUILD_VERSION", "build-42");

    render(<Build />);

    expect(screen.getByText("build-42")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "build-42" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "abc123d" })).toHaveAttribute("href", `${GITHUB}/commit/${COMMIT}`);
    expect(useChangelogMock).toHaveBeenCalledWith("build-42", REPO, false, GITHUB);
  });

  it("shows a local build as plain text", () => {
    vi.stubEnv("VITE_BUILD_VERSION", "local");

    render(<Build />);

    expect(screen.getByText("local")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "local" })).not.toBeInTheDocument();
    expect(useChangelogMock).toHaveBeenCalledWith("local", REPO, false, GITHUB);
  });

  it("reports every unset build variable as not available and links nothing", () => {
    vi.stubEnv("VITE_BUILD_TIME", undefined);
    vi.stubEnv("VITE_BUILD_COMMIT", undefined);
    vi.stubEnv("VITE_BUILD_BRANCH", undefined);
    vi.stubEnv("VITE_BUILD_VERSION", undefined);
    vi.stubEnv("VITE_BUILD_REPO", undefined);

    render(<Build />);

    // Build Time, Version, Branch and Commit
    expect(screen.getAllByText("Not available")).toHaveLength(4);
    expect(screen.queryByText("Repository")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(["Email Support"]);
    expect(useChangelogMock).toHaveBeenCalledWith("Not available", "", false, null);
  });

  it("shows the changelog for the build", () => {
    render(<Build />);

    expect(screen.getByRole("heading", { name: "Changelog for v2.0.0" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "v2.0.0" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["New features", "Bug fixes"]);
  });

  it("shows a loading note while the changelog is fetched", () => {
    useChangelogMock.mockReturnValue({ changelog: null, loadingChangelog: true });

    render(<Build />);

    expect(screen.getByText("Loading changelog...")).toBeInTheDocument();
  });

  it("copies the build info and shows a confirmation that reverts after two seconds", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    try {
      render(<Build />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Copy Build Info" }));
      });

      expect(writeText).toHaveBeenCalledTimes(1);
      const copied: string = writeText.mock.calls[0][0];
      expect(copied).toContain("=== Build Information ===");
      expect(copied).toContain("- Version: v2.0.0");
      expect(copied).toContain(`- Commit: ${COMMIT}`);
      expect(copied).toContain("=== System Information ===");
      expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByRole("button", { name: "Copy Build Info" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("prefills a support email with the build info", () => {
    render(<Build />);

    const href = screen.getByRole("link", { name: "Email Support" }).getAttribute("href") ?? "";
    expect(href).toMatch(/^mailto:erv@ewal\.net\?subject=TrendWeight%20Support%20Request&body=/);
    const body = decodeURIComponent(href.slice(href.indexOf("&body=") + "&body=".length));
    expect(body).toContain("Please describe your issue here:");
    expect(body).toContain("- Version: v2.0.0");
  });
});
