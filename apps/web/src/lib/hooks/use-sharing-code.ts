import { useParams } from "@tanstack/react-router";

/**
 * Hook to get the sharing code parameter from the current route.
 * Returns undefined if not in a sharing context.
 */
export function useSharingCode(): string | undefined {
  const params = useParams({ strict: false });
  return params.sharingCode as string | undefined;
}
