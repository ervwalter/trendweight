import { createFileRoute } from "@tanstack/react-router";
import { Home } from "../components/home/Home";
import { pageTitle } from "../lib/utils/pageTitle";

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
