import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CardAction } from "./card";

describe("Card Components", () => {
  describe("Card", () => {
    it("renders card container with children", () => {
      render(
        <Card data-testid="test-card">
          <div>Card content</div>
        </Card>,
      );

      const card = screen.getByTestId("test-card");
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent("Card content");
    });

    it("accepts custom className", () => {
      render(
        <Card className="custom-class" data-testid="test-card">
          Content
        </Card>,
      );

      expect(screen.getByTestId("test-card")).toHaveClass("custom-class");
    });
  });

  describe("CardHeader", () => {
    it("renders header with title", () => {
      render(
        <Card>
          <CardHeader data-testid="test-header">
            <CardTitle>Title</CardTitle>
          </CardHeader>
        </Card>,
      );

      const header = screen.getByTestId("test-header");
      expect(header).toBeInTheDocument();
      expect(screen.getByText("Title")).toBeInTheDocument();
    });
  });

  describe("CardTitle", () => {
    it("renders title element", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
          </CardHeader>
        </Card>,
      );

      const title = screen.getByText("Test Title");
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe("H2");
    });

    it("accepts custom className", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle className="custom-title">Title</CardTitle>
          </CardHeader>
        </Card>,
      );

      expect(screen.getByText("Title")).toHaveClass("custom-title");
    });
  });

  describe("CardDescription", () => {
    it("renders description text", () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription>Test description text</CardDescription>
          </CardHeader>
        </Card>,
      );

      const description = screen.getByText("Test description text");
      expect(description).toBeInTheDocument();
      expect(description.tagName).toBe("P");
    });
  });

  describe("CardAction", () => {
    it("renders action in header area", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardAction data-testid="test-action">
              <button>Action</button>
            </CardAction>
          </CardHeader>
        </Card>,
      );

      const action = screen.getByTestId("test-action");
      expect(action).toBeInTheDocument();
      expect(screen.getByText("Action")).toBeInTheDocument();
    });
  });

  describe("CardContent", () => {
    it("renders content with children", () => {
      render(
        <Card>
          <CardContent data-testid="test-content">
            <p>Content goes here</p>
          </CardContent>
        </Card>,
      );

      const content = screen.getByTestId("test-content");
      expect(content).toBeInTheDocument();
      expect(content).toHaveTextContent("Content goes here");
    });
  });

  describe("CardFooter", () => {
    it("renders footer with content", () => {
      render(
        <Card>
          <CardFooter data-testid="test-footer">
            <button>Action</button>
          </CardFooter>
        </Card>,
      );

      const footer = screen.getByTestId("test-footer");
      expect(footer).toBeInTheDocument();
      expect(screen.getByText("Action")).toBeInTheDocument();
    });
  });

  describe("Complete Card composition", () => {
    it("renders a complete card with all sections", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Complete Card</CardTitle>
            <CardDescription>This is a complete card example</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content of the card</p>
          </CardContent>
          <CardFooter>
            <button>Footer Action</button>
          </CardFooter>
        </Card>,
      );

      expect(screen.getByText("Complete Card")).toBeInTheDocument();
      expect(screen.getByText("This is a complete card example")).toBeInTheDocument();
      expect(screen.getByText("Main content of the card")).toBeInTheDocument();
      expect(screen.getByText("Footer Action")).toBeInTheDocument();
    });
  });
});
