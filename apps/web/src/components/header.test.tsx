import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "./header";
import { useAuth } from "@/lib/auth/use-auth";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className, onClick }: { to: string; children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/auth/use-auth");
vi.mock("./mode-toggle", () => ({ ModeToggle: () => <button>Toggle theme</button> }));

const linkNames = (nav: HTMLElement) =>
  within(nav)
    .getAllByRole("link")
    .map((link) => link.textContent);

describe("Header", () => {
  const signOut = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logged out", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({ isLoggedIn: false, signOut } as any);
    });

    it("offers the public pages and a login link", () => {
      render(<Header />);

      const main = screen.getByRole("navigation", { name: "Main" });
      expect(linkNames(main)).toEqual(["TrendWeight", "Home", "Learn", "Log In"]);
      expect(within(main).getByRole("link", { name: "TrendWeight" })).toHaveAttribute("href", "/");
      expect(within(main).queryByRole("button", { name: "Log Out" })).not.toBeInTheDocument();
    });
  });

  describe("logged in", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({ isLoggedIn: true, signOut } as any);
    });

    it("adds the account pages, points the logo at the dashboard and signs out", async () => {
      const user = userEvent.setup();
      render(<Header />);

      const main = screen.getByRole("navigation", { name: "Main" });
      expect(linkNames(main)).toEqual(["TrendWeight", "Home", "Dashboard", "Settings", "Learn"]);
      expect(within(main).getByRole("link", { name: "TrendWeight" })).toHaveAttribute("href", "/dashboard");

      await user.click(within(main).getByRole("button", { name: "Log Out" }));

      expect(signOut).toHaveBeenCalledTimes(1);
    });

    it("toggles the mobile menu with an accessible button and signs out from it once", async () => {
      const user = userEvent.setup();
      render(<Header />);

      const menuButton = screen.getByRole("button", { name: "Open menu" });
      expect(menuButton).toHaveAttribute("aria-expanded", "false");
      const menu = document.getElementById(menuButton.getAttribute("aria-controls")!)!;
      expect(menu).toHaveClass("hidden");

      await user.click(menuButton);

      expect(menuButton).toHaveAccessibleName("Close menu");
      expect(menuButton).toHaveAttribute("aria-expanded", "true");
      expect(menu).toHaveClass("block");
      expect(
        within(menu)
          .getAllByRole("link")
          .map((link) => link.textContent),
      ).toEqual(["Home", "Dashboard", "Settings", "Learn"]);

      await user.click(within(menu).getByRole("button", { name: "Log Out" }));

      expect(signOut).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(menu).toHaveClass("hidden"));
      expect(menuButton).toHaveAccessibleName("Open menu");
    });

    it("closes the mobile menu when clicking outside it", async () => {
      const user = userEvent.setup();
      render(<Header />);

      const menuButton = screen.getByRole("button", { name: "Open menu" });
      await user.click(menuButton);
      expect(menuButton).toHaveAttribute("aria-expanded", "true");

      await user.click(document.body);

      expect(menuButton).toHaveAttribute("aria-expanded", "false");
    });
  });
});
