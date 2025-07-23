import { Link } from "@tanstack/react-router";
import { pageTitle } from "../lib/utils/pageTitle";
import { Container } from "./Container";
import { Button } from "./ui/Button";

export function NotFound() {
  return (
    <>
      <title>{pageTitle("Error 404 (Not Found)")}</title>
      <meta name="robots" content="noindex, nofollow" />

      <Container>
        <div className="flex min-h-[67vh] flex-col items-start justify-start py-8 md:items-center md:justify-center md:py-32 lg:py-40">
          <div className="flex flex-col items-start space-y-4 px-4 md:flex-row md:items-center md:space-y-0 md:space-x-4 lg:space-x-6">
            <div className="w-full max-w-[600px] border-none py-4 md:max-w-[700px] md:border-r md:border-gray-300 lg:max-w-[800px]">
              <div className="text-brand-600 font-logo text-4xl leading-tight font-bold md:text-5xl">TrendWeight</div>
              <div className="mt-4">
                <b>404.</b> That's an error.
              </div>
              <div className="mt-4">The requested URL was not found on this site.</div>
              <div className="mt-4">
                Maybe the page was moved. Or maybe the link you clicked on is just wrong. Or maybe it was abducted? We'll probably never know.
              </div>
              <div className="mt-4">
                <Button asChild>
                  <Link to="/">Go to Homepage</Link>
                </Button>
              </div>
            </div>
            <img src="/taken.svg" alt="alien abduction icon" className="h-auto w-full max-w-[250px] md:max-w-[200px] lg:max-w-[240px] xl:max-w-[280px]" />
          </div>
        </div>
      </Container>
    </>
  );
}
