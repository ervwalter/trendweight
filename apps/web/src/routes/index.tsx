import { createFileRoute } from "@tanstack/react-router";
import { Home } from "../components/home/Home";
import { pageTitle } from "../lib/utils/pageTitle";

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
