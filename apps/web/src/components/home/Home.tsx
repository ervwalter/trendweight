import { Footer } from "../Footer";
import { Banner } from "./Banner";
import { MainContent } from "./MainContent";

export function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Banner />
      <MainContent />
      <Footer />
    </div>
  );
}
