import { useEffect } from "react";
import { useSearch } from "@tanstack/react-router";
import { ProviderList } from "../providers/provider-list";
import { useToast } from "../../lib/hooks/use-toast";

export function Link() {
  const search = useSearch({ from: "/link" });
  const providerParam = search.provider;
  const success = search.success;
  const error = search.error;
  const { showToast } = useToast();

  // Show success or error messages based on query params
  useEffect(() => {
    if (success && providerParam) {
      showToast({
        title: "Connection Successful",
        description: `Successfully connected ${providerParam === "fitbit" ? "Fitbit" : "Withings"} account!`,
        variant: "success",
      });
    } else if (error && providerParam) {
      showToast({
        title: "Connection Failed",
        description: `Failed to connect ${providerParam === "fitbit" ? "Fitbit" : "Withings"} account. Please try again.`,
        variant: "error",
      });
    }
  }, [success, error, providerParam, showToast]);

  return (
    <div>
      <ProviderList variant="link" showHeader={true} />
    </div>
  );
}
