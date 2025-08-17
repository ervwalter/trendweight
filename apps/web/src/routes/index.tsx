import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/components/home/home";
import { pageTitle } from "@/lib/utils/page-title";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    console.log("[index] beforeLoad called");
  },
  component: HomePage,
});

function HomePage() {
  console.log("[index] HomePage component rendering");
  return (
    <>
      <title>{pageTitle()}</title>
      <Home />
    </>
  );
}
