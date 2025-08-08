import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Question } from "./question";

describe("Question", () => {
  it("should render question title", () => {
    render(
      <Question title="What is TrendWeight?">
        <p>TrendWeight is a web application for tracking weight trends.</p>
      </Question>,
    );

    expect(screen.getByText("What is TrendWeight?")).toBeInTheDocument();
  });

  it("should render question content", () => {
    render(
      <Question title="Test Question">
        <p>This is the answer to the test question.</p>
      </Question>,
    );

    expect(screen.getByText("This is the answer to the test question.")).toBeInTheDocument();
  });

  it("should apply correct semantic HTML structure", () => {
    render(
      <Question title="Test Question">
        <p>Answer content</p>
      </Question>,
    );

    // Check for dt (description term) and dd (description details) elements
    expect(screen.getByText("Test Question").tagName).toBe("DT");
    expect(screen.getByText("Answer content").closest("dd")).toBeInTheDocument();
  });

  it("should apply correct styling classes", () => {
    render(
      <Question title="Test Question">
        <p>Answer content</p>
      </Question>,
    );

    const titleElement = screen.getByText("Test Question");
    expect(titleElement).toHaveClass("text-lg", "leading-6", "font-semibold", "text-foreground");

    const answerContainer = screen.getByText("Answer content").closest("dd");
    expect(answerContainer).toHaveClass("prose", "prose-gray", "mt-2", "text-base", "text-muted-foreground");
  });

  it("should handle complex content", () => {
    render(
      <Question title="Complex Question">
        <div>
          <p>First paragraph</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
          <p>Second paragraph</p>
        </div>
      </Question>,
    );

    expect(screen.getByText("First paragraph")).toBeInTheDocument();
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph")).toBeInTheDocument();
  });

  it("should handle empty content", () => {
    render(<Question title="Empty Question">{""}</Question>);

    expect(screen.getByText("Empty Question")).toBeInTheDocument();
    const answerContainer = screen.getByText("Empty Question").closest("div")?.querySelector("dd");
    expect(answerContainer).toBeInTheDocument();
  });

  it("should handle long titles", () => {
    const longTitle = "This is a very long question title that might wrap to multiple lines and we want to make sure it renders correctly";

    render(
      <Question title={longTitle}>
        <p>Answer</p>
      </Question>,
    );

    expect(screen.getByText(longTitle)).toBeInTheDocument();
  });

  it("should handle special characters in title", () => {
    render(
      <Question title="What's the difference between <weight> & [trend]?">
        <p>The difference is...</p>
      </Question>,
    );

    expect(screen.getByText("What's the difference between <weight> & [trend]?")).toBeInTheDocument();
  });

  it("should support links in content", () => {
    render(
      <Question title="Test Question">
        <p>
          Visit our <a href="/help">help page</a> for more information.
        </p>
      </Question>,
    );

    const link = screen.getByRole("link", { name: "help page" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/help");
  });
});
