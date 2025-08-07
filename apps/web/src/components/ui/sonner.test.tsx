import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { Toaster } from "./sonner";
import { toast } from "sonner";

// Create a test component that uses sonner toast
const TestComponent = () => {
  return (
    <div>
      <button
        onClick={() =>
          toast("Test Title", {
            description: "Test Description",
          })
        }
        data-testid="show-toast"
      >
        Show Toast
      </button>
      <button
        onClick={() =>
          toast.success("Success Toast", {
            description: "Operation completed successfully",
          })
        }
        data-testid="show-success"
      >
        Show Success
      </button>
      <button
        onClick={() =>
          toast.error("Error Toast", {
            description: "Something went wrong",
          })
        }
        data-testid="show-error"
      >
        Show Error
      </button>
    </div>
  );
};

describe("Toast System (Sonner)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Toast Functionality", () => {
    it("should render and show toasts with default styling", async () => {
      const user = userEvent.setup();

      render(
        <>
          <TestComponent />
          <Toaster />
        </>,
      );

      // Show a toast
      await user.click(screen.getByTestId("show-toast"));

      // Toast should be visible with default styling
      await waitFor(() => {
        const defaultToast = screen.getByText("Test Title").closest("[data-sonner-toast]");
        expect(defaultToast).toBeInTheDocument();
        expect(screen.getByText("Test Description")).toBeInTheDocument();
        // Default toasts should not have a data-type attribute
        expect(defaultToast).not.toHaveAttribute("data-type", "success");
        expect(defaultToast).not.toHaveAttribute("data-type", "error");
      });
    });

    it("should handle different toast variants with appropriate styling", async () => {
      const user = userEvent.setup();

      render(
        <>
          <TestComponent />
          <Toaster />
        </>,
      );

      // Show success toast and verify it has success styling
      await user.click(screen.getByTestId("show-success"));
      await waitFor(() => {
        const successToast = screen.getByText("Success Toast").closest("[data-sonner-toast]");
        expect(successToast).toBeInTheDocument();
        // With richColors, sonner adds data-type attribute for styled variants
        expect(successToast).toHaveAttribute("data-type", "success");
      });

      // Show error toast and verify it has error styling
      await user.click(screen.getByTestId("show-error"));
      await waitFor(() => {
        const errorToast = screen.getByText("Error Toast").closest("[data-sonner-toast]");
        expect(errorToast).toBeInTheDocument();
        // With richColors, sonner adds data-type attribute for styled variants
        expect(errorToast).toHaveAttribute("data-type", "error");
      });
    });
  });

  describe("Legacy API Compatibility", () => {
    it("should support old showToast API through adapter", async () => {
      // Create a wrapper component that adapts the old API to sonner
      const LegacyComponent = () => {
        // Adapter for legacy showToast API
        const showToast = React.useCallback((props: { title?: string; description?: string; variant?: "default" | "success" | "error" }) => {
          const message = props.title || "";
          const options = {
            description: props.description,
          };

          switch (props.variant) {
            case "success":
              toast.success(message, options);
              break;
            case "error":
              toast.error(message, options);
              break;
            default:
              toast(message, options);
              break;
          }
        }, []);

        return (
          <button
            onClick={() =>
              showToast({
                title: "Legacy Toast",
                description: "Using old API",
                variant: "success",
              })
            }
            data-testid="legacy-toast"
          >
            Show Legacy Toast
          </button>
        );
      };

      const user = userEvent.setup();

      render(
        <>
          <LegacyComponent />
          <Toaster />
        </>,
      );

      // Show toast using legacy API
      await user.click(screen.getByTestId("legacy-toast"));

      // Toast should be visible
      await waitFor(() => {
        expect(screen.getByText("Legacy Toast")).toBeInTheDocument();
        expect(screen.getByText("Using old API")).toBeInTheDocument();
      });
    });
  });
});
