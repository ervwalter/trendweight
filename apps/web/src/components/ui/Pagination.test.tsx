import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    onPageChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render pagination controls when totalPages > 1", () => {
    render(<Pagination {...defaultProps} />);

    expect(screen.getByRole("button", { name: "First page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Last page" })).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
  });

  it("should return null when totalPages <= 1 and no totalItems", () => {
    const { container } = render(<Pagination {...defaultProps} totalPages={1} />);
    expect(container.firstChild).toBeNull();
  });

  it("should show count only when totalPages <= 1 but totalItems is provided", () => {
    render(<Pagination {...defaultProps} totalPages={1} totalItems={10} />);

    expect(screen.getByText("10 total items")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should disable first and previous buttons on first page", () => {
    render(<Pagination {...defaultProps} currentPage={1} />);

    expect(screen.getByRole("button", { name: "First page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Last page" })).not.toBeDisabled();
  });

  it("should disable next and last buttons on last page", () => {
    render(<Pagination {...defaultProps} currentPage={5} totalPages={5} />);

    expect(screen.getByRole("button", { name: "First page" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous page" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Last page" })).toBeDisabled();
  });

  it("should call onPageChange with correct page numbers", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} currentPage={3} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole("button", { name: "First page" }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(4);

    fireEvent.click(screen.getByRole("button", { name: "Last page" }));
    expect(onPageChange).toHaveBeenCalledWith(5);
  });

  it("should not go below page 1 when clicking previous", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} currentPage={1} onPageChange={onPageChange} />);

    // The buttons should be disabled, but test the logic anyway
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("should not go above totalPages when clicking next", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} currentPage={5} totalPages={5} onPageChange={onPageChange} />);

    // The buttons should be disabled, but test the logic anyway
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("should display total items count when provided", () => {
    render(<Pagination {...defaultProps} totalItems={100} />);

    expect(screen.getByText("100 total items")).toBeInTheDocument();
  });

  it("should use custom item label", () => {
    render(<Pagination {...defaultProps} totalItems={50} itemLabel="records" />);

    expect(screen.getByText("50 total records")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(<Pagination {...defaultProps} className="custom-class" />);

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should show correct page info for middle page", () => {
    render(<Pagination {...defaultProps} currentPage={3} totalPages={5} />);

    expect(screen.getByText("Page 3 of 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "First page" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous page" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Last page" })).not.toBeDisabled();
  });

  it("should handle single page with items count", () => {
    render(<Pagination {...defaultProps} totalPages={1} totalItems={5} itemLabel="results" />);

    expect(screen.getByText("5 total results")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should handle edge case with minimum page bound", () => {
    const onPageChange = vi.fn();

    render(<Pagination {...defaultProps} currentPage={1} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("should handle edge case with maximum page bound", () => {
    const onPageChange = vi.fn();

    render(<Pagination {...defaultProps} currentPage={5} totalPages={5} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).not.toHaveBeenCalled();
  });
});
