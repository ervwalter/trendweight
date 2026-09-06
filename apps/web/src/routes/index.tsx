import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/components/home/home";
import { pageTitle } from "@/lib/utils/page-title";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <title>{pageTitle()}</title>
      <Home />
    </>
  );
}
