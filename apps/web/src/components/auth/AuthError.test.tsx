import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthError } from "./AuthError";

describe("AuthError", () => {
  it("should render error message", () => {
    render(<AuthError error="Invalid credentials" />);

    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("should apply correct error styling classes", () => {
    const { container } = render(<AuthError error="Test error" />);

    const errorDiv = container.firstChild;
    expect(errorDiv).toHaveClass("mb-4");
    expect(errorDiv).toHaveClass("rounded-md");
    expect(errorDiv).toHaveClass("border");
    expect(errorDiv).toHaveClass("border-destructive/30");
    expect(errorDiv).toHaveClass("bg-destructive/10");
    expect(errorDiv).toHaveClass("p-3");
    expect(errorDiv).toHaveClass("text-destructive");
  });

  it("should render empty error message", () => {
    const { container } = render(<AuthError error="" />);

    const errorDiv = container.querySelector(".text-destructive");
    expect(errorDiv).toBeInTheDocument();
    expect(errorDiv).toHaveTextContent("");
  });

  it("should render multiline error message", () => {
    const multilineError = "Error line 1\nError line 2";
    const { container } = render(<AuthError error={multilineError} />);

    const errorDiv = container.querySelector(".text-destructive");
    // HTML renders newlines as spaces
    expect(errorDiv).toHaveTextContent("Error line 1 Error line 2");
  });

  it("should render special characters in error message", () => {
    const specialError = "Error with <script>alert('test')</script> & symbols!";
    render(<AuthError error={specialError} />);

    expect(screen.getByText(specialError)).toBeInTheDocument();
  });
});
