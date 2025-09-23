import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useClerk } from "@clerk/clerk-react";
import { AccountSecuritySection } from "./account-security-section";

// Mock Clerk
const mockBuildUserProfileUrl = vi.fn();
vi.mock("@clerk/clerk-react", () => ({
  useClerk: vi.fn(),
}));

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, asChild, ...props }: any) => {
    if (asChild) {
      return (
        <div data-testid="button-wrapper" {...props}>
          {children}
        </div>
      );
    }
    return <button {...props}>{children}</button>;
  },
}));

vi.mock("@/components/ui/card", () => ({
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h2 data-testid="card-title">{children}</h2>,
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

// Mock lucide-react icon
vi.mock("lucide-react", () => ({
  ExternalLink: ({ className }: any) => (
    <span data-testid="external-link-icon" className={className}>
      🔗
    </span>
  ),
}));

describe("AccountSecuritySection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useClerk).mockReturnValue({
      buildUserProfileUrl: mockBuildUserProfileUrl,
    } as any);
  });

  it("should render the section with title and description", () => {
    mockBuildUserProfileUrl.mockReturnValue("https://test.clerk.accounts.dev/user");

    render(<AccountSecuritySection />);

    expect(screen.getByTestId("card-title")).toHaveTextContent("Account Security");
    expect(screen.getByText(/TrendWeight uses Clerk to handle authentication/)).toBeInTheDocument();
  });

  it("should render both account links with Clerk URLs when available", () => {
    const clerkProfileUrl = "https://test.clerk.accounts.dev/user";
    mockBuildUserProfileUrl.mockReturnValue(clerkProfileUrl);

    render(<AccountSecuritySection />);

    // Check Account Profile link
    const profileLink = screen.getByRole("link", { name: /Open Account Profile/ });
    expect(profileLink).toHaveAttribute("href", clerkProfileUrl);
    expect(profileLink).toHaveAttribute("target", "_blank");
    expect(profileLink).toHaveAttribute("rel", "noopener noreferrer");

    // Check Security Settings link
    const securityLink = screen.getByRole("link", { name: /Open Security Settings/ });
    expect(securityLink).toHaveAttribute("href", "https://test.clerk.accounts.dev/user/security");
    expect(securityLink).toHaveAttribute("target", "_blank");
    expect(securityLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("should use fallback URLs when Clerk buildUserProfileUrl is not available", () => {
    // Mock useClerk to return an object without buildUserProfileUrl
    vi.mocked(useClerk).mockReturnValue({} as any);

    render(<AccountSecuritySection />);

    // Check Account Profile link uses fallback
    const profileLink = screen.getByRole("link", { name: /Open Account Profile/ });
    expect(profileLink).toHaveAttribute("href", "https://accounts.trendweight.com/user");

    // Check Security Settings link uses fallback
    const securityLink = screen.getByRole("link", { name: /Open Security Settings/ });
    expect(securityLink).toHaveAttribute("href", "https://accounts.trendweight.com/user/security");
  });

  it("should use fallback URLs when Clerk is not available", () => {
    // Mock useClerk to return null
    vi.mocked(useClerk).mockReturnValue(null as any);

    render(<AccountSecuritySection />);

    // Check Account Profile link uses fallback
    const profileLink = screen.getByRole("link", { name: /Open Account Profile/ });
    expect(profileLink).toHaveAttribute("href", "https://accounts.trendweight.com/user");

    // Check Security Settings link uses fallback
    const securityLink = screen.getByRole("link", { name: /Open Security Settings/ });
    expect(securityLink).toHaveAttribute("href", "https://accounts.trendweight.com/user/security");
  });

  it("should call Clerk buildUserProfileUrl method when available", () => {
    mockBuildUserProfileUrl.mockReturnValue("https://test.clerk.accounts.dev/user");

    render(<AccountSecuritySection />);

    // The component calls buildUserProfileUrl during render to get the profile URL
    expect(mockBuildUserProfileUrl).toHaveBeenCalledTimes(1);
  });
});
