import { toast as sonnerToast } from "sonner";
import { useCallback } from "react";

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error";
  duration?: number;
}

export function useToast() {
  const showToast = useCallback((props: ToastProps) => {
    const message = props.title || "";
    const options = {
      description: props.description,
      duration: props.duration,
    };

    switch (props.variant) {
      case "success":
        sonnerToast.success(message, options);
        break;
      case "error":
        sonnerToast.error(message, options);
        break;
      default:
        sonnerToast(message, options);
        break;
    }
  }, []);

  return {
    showToast,
    toast: showToast, // Alias for consistency
  };
}

// Export the sonner toast directly for advanced usage
export { toast } from "sonner";
