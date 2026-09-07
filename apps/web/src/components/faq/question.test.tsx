import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Question } from "./question";

describe("Question", () => {
  it("renders the title as a term and the answer as its definition", () => {
    render(
      <Question title="What is TrendWeight?">
        <p>TrendWeight is a web application for tracking weight trends.</p>
      </Question>,
    );

    expect(screen.getByRole("term")).toHaveTextContent("What is TrendWeight?");
    expect(screen.getByRole("definition")).toHaveTextContent("TrendWeight is a web application for tracking weight trends.");
  });

  it("renders titles with special characters verbatim", () => {
    render(
      <Question title="What's the difference between <weight> & [trend]?">
        <p>The difference is...</p>
      </Question>,
    );

    expect(screen.getByRole("term")).toHaveTextContent("What's the difference between <weight> & [trend]?");
  });

  it("supports links in the answer", () => {
    render(
      <Question title="Test Question">
        <p>
          Visit our <a href="/help">help page</a> for more information.
        </p>
      </Question>,
    );

    expect(screen.getByRole("link", { name: "help page" })).toHaveAttribute("href", "/help");
  });
});
