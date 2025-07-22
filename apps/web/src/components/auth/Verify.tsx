import { useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Route } from "../../routes/auth.verify";
import { useAuth } from "../../lib/auth/useAuth";
import { supabase } from "../../lib/supabase/client";
import { Heading } from "../ui/Heading";

export function Verify() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const routeData = Route.useLoaderData();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState("");

  const token = routeData.token;
  const isOAuth = routeData.isOAuth;

  useEffect(() => {
    // If already logged in, redirect
    if (isLoggedIn) {
      navigate({ to: "/dashboard" });
      return;
    }

    // Handle OAuth callback or magic link token
    if ((token || isOAuth) && isVerifying) {
      (async () => {
        try {
          // Supabase will handle the verification automatically when we call getSession
          // after the URL contains the proper parameters
          const { data, error } = await supabase.auth.getSession();

          if (error) {
            console.error("Error verifying token:", error);
            setError("Invalid or expired login link. Please try logging in again.");
            setIsVerifying(false);
            return;
          }

          if (data.session) {
            navigate({ to: "/dashboard" });
          } else {
            // Try to exchange the token manually
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);

            if (exchangeError) {
              console.error("Error exchanging code:", exchangeError);
              setError("Invalid or expired login link. Please try logging in again.");
            } else {
              navigate({ to: "/dashboard" });
            }
          }
        } catch (err) {
          console.error("Unexpected error:", err);
          setError("An unexpected error occurred. Please try logging in again.");
        } finally {
          setIsVerifying(false);
        }
      })();
    } else if (!token && !isOAuth) {
      setIsVerifying(false);
      setError(routeData.error || "Invalid login link");
    }
  }, [token, isOAuth, isLoggedIn, navigate, isVerifying, routeData.error]);

  return (
    <div className="mx-auto max-w-md text-center">
      {isVerifying ? (
        <>
          <Heading level={1} display>
            Verifying...
          </Heading>
          <p className="text-gray-600">Please wait while we verify your login link.</p>
        </>
      ) : error ? (
        <>
          <Heading level={1} display>
            Verification Failed
          </Heading>
          <p className="mb-4 text-red-600">{error}</p>
          <Link to="/login" className="text-brand-600 hover:text-brand-700 underline">
            Return to login
          </Link>
        </>
      ) : (
        // This shouldn't happen, but just in case
        <>
          <Heading level={1} display>
            Processing...
          </Heading>
          <p className="text-gray-600">Please wait...</p>
        </>
      )}
    </div>
  );
}
