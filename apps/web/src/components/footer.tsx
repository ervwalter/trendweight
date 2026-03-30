import { Rss } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Container } from "./container";

export function Footer() {
  const buildVersion = import.meta.env.VITE_BUILD_VERSION || "";
  const buildCommit = import.meta.env.VITE_BUILD_COMMIT || "";

  const isTag = buildVersion.startsWith("v");
  const hasCommit = buildCommit && buildCommit !== "Not available";

  let versionDisplay = "dev";

  if (isTag) {
    // Tagged release - show version
    versionDisplay = buildVersion;
  } else if (hasCommit) {
    // Show short SHA
    versionDisplay = buildCommit.substring(0, 7);
  }
  // Otherwise falls back to 'dev'

  return (
    <footer className="py-4 print:hidden">
      <Container>
        <div className="text-muted-foreground flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm">
            © 2012-{new Date().getFullYear()} Erv Walter<span>·</span>
            <Link to="/build" className="hover:text-muted-foreground transition-colors hover:underline">
              {versionDisplay}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm md:gap-4">
            <div className="flex items-center gap-2 md:gap-4">
              <a href="https://github.com/ervwalter/trendweight" className="hover:text-muted-foreground transition-colors">
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                  <path d="M9 18c-4.51 2-5-2-7-2" />
                </svg>
              </a>
              <a href="https://ewal.dev/series/trendweight" className="hover:text-muted-foreground transition-colors">
                <Rss className="h-4 w-4" />
              </a>
            </div>
            <a href="mailto:erv@ewal.net" className="hover:text-muted-foreground transition-colors">
              Contact
            </a>
            <Link to="/tipjar" className="hover:text-muted-foreground transition-colors">
              Tip Jar
            </Link>
            <Link to="/privacy" className="hover:text-muted-foreground transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
