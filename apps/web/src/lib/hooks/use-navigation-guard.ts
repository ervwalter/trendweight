import { useBlocker } from "@tanstack/react-router";

export function useNavigationGuard(isDirty: boolean, message = "You have unsaved changes. Are you sure you want to leave?") {
  useBlocker({
    disabled: !isDirty,
    shouldBlockFn: () => {
      const shouldLeave = window.confirm(message);
      return !shouldLeave;
    },
  });
}
