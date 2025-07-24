import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Route } from "../../routes/auth.verify";
import { useAuth } from "../../lib/auth/useAuth";
import { Heading } from "../ui/Heading";

export function Verify() {
  const navigate = useNavigate();
  const { isLoggedIn, isInitializing } = useAuth();
  const routeData = Route.useLoaderData();

  useEffect(() => {
    // Don't redirect if there's an error to show
    if (routeData.errorCode) {
      return;
    }

    // Redirect to dashboard when logged in (after auth is initialized)
    if (isLoggedIn && !isInitializing) {
      navigate({ to: "/dashboard" });
    }
  }, [isLoggedIn, isInitializing, navigate, routeData.errorCode]);

  // Show error if present in URL
  if (routeData.errorCode) {
    return (
      <div className="mx-auto max-w-md text-center">
        <Heading level={1} display>
          Verification Failed
        </Heading>
        <p className="mb-4 text-red-600">{routeData.errorDescription || routeData.errorCode}</p>
        {routeData.errorCode && routeData.errorDescription && <p className="mt-2 text-sm text-gray-500">Error code: {routeData.errorCode}</p>}
        <Link to="/login" className="text-brand-600 hover:text-brand-700 mt-4 block underline">
          Return to login
        </Link>
      </div>
    );
  }

  // Show loading while auth is initializing or processing
  if (isInitializing || !isLoggedIn) {
    return (
      <div className="mx-auto max-w-md text-center">
        <Heading level={1} display>
          Verifying...
        </Heading>
        <p className="text-gray-600">Please wait while we verify your login.</p>
      </div>
    );
  }

  // This shouldn't happen (we redirect in useEffect), but just in case
  return null;
}
