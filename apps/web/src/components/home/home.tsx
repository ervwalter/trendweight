import { Footer } from "../footer";
import { Banner } from "./banner";
import { MainContent } from "./main-content";

export function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Banner />
      <MainContent />
      <Footer />
    </div>
  );
}
