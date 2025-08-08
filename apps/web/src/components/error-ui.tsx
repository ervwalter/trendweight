import { Container } from "./container";
import { pageTitle } from "../lib/utils/page-title";
import { Button } from "./ui/button";
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
            <div className="md:border-border w-full max-w-[600px] border-none py-4 md:max-w-[700px] md:border-r lg:max-w-[800px]">
              <div className="text-primary font-logo text-4xl leading-tight font-bold md:text-5xl">TrendWeight</div>
              <div className="mt-4">
                <b>Oops.</b> Something went wrong.
              </div>

              <div className="mt-4">We encountered an unexpected error while processing your request.</div>

              {error?.message && (
                <div className="border-border bg-muted mt-4 rounded-md border p-3">
                  <p className="text-foreground/80 text-sm font-medium">Error Details</p>
                  <p className="text-muted-foreground font-mono text-xs">{error.message}</p>
                </div>
              )}

              <div className="text-muted-foreground mt-4 text-sm">
                Try refreshing the page first. If the problem persists, use the button below to send me the error details.
              </div>

              <div className="mt-4 flex gap-3">
                <Button onClick={() => window.location.reload()} variant="default">
                  Refresh Page
                </Button>
                <Button asChild variant="default">
                  <a href="/">Go to Homepage</a>
                </Button>
                <a href={mailtoLink}>
                  <Button variant="default">Email Support</Button>
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
