import { Link } from "@tanstack/react-router";
import { Container } from "./Container";
import { pageTitle } from "../lib/utils/pageTitle";
import { Button } from "./ui/Button";
import { getDebugInfo } from "../lib/utils/debug-info";

interface ErrorUIProps {
  error?: Error;
  componentStack?: string;
}

export function ErrorUI({ error, componentStack }: ErrorUIProps) {
  const debugInfo = getDebugInfo({ error, componentStack });

  // Build the mailto link with custom subject and preamble for errors
  const subject = encodeURIComponent("TrendWeight Error Report");
  const body = encodeURIComponent(
    "Please describe what you were trying to do when this error occurred:\n\n\n\n" + "--- Error Information (Please keep this) ---\n" + debugInfo,
  );
  const mailtoLink = `mailto:erv@ewal.net?subject=${subject}&body=${body}`;
  return (
    <>
      <title>{pageTitle("Something went wrong")}</title>
      <meta name="robots" content="noindex, nofollow" />

      <Container>
        <div className="flex min-h-[67vh] flex-col items-start justify-start py-8 md:items-center md:justify-center md:py-32 lg:py-40">
          <div className="flex flex-col items-start space-y-4 px-4 md:flex-row md:items-center md:space-y-0 md:space-x-4 lg:space-x-6">
            <div className="w-full max-w-[600px] border-none py-4 md:max-w-[700px] md:border-r md:border-gray-300 lg:max-w-[800px]">
              <div className="text-brand-600 font-logo text-4xl leading-tight font-bold md:text-5xl">TrendWeight</div>
              <div className="mt-4">
                <b>Oops.</b> Something went wrong.
              </div>

              <div className="mt-4">We encountered an unexpected error while processing your request.</div>

              {error?.message && (
                <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-700">Error Details</p>
                  <p className="font-mono text-xs text-gray-600">{error.message}</p>
                </div>
              )}

              <div className="mt-4 text-sm text-gray-600">
                Try refreshing the page first. If the problem persists, use the button below to send me the error details.
              </div>

              <div className="mt-4 flex gap-3">
                <Button onClick={() => window.location.reload()} variant="primary">
                  Refresh Page
                </Button>
                <Button asChild variant="primary">
                  <Link to="/">Go to Homepage</Link>
                </Button>
                <a href={mailtoLink}>
                  <Button variant="primary">Email Support</Button>
                </a>
              </div>
            </div>
            <img src="/error.svg" alt="error icon" className="h-auto w-full max-w-[300px] md:max-w-[250px] lg:max-w-[320px] xl:max-w-[360px]" />
          </div>
        </div>
      </Container>
    </>
  );
}
