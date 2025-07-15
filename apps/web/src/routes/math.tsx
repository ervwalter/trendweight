import { createFileRoute } from "@tanstack/react-router";
import "katex/dist/katex.min.css";
import { useEffect, useState } from "react";
import { HiArrowUp } from "react-icons/hi";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Layout } from "../components/Layout";
import mathContent from "../content/math-of-trendweight.md?raw";
import { pageTitle } from "../lib/utils/pageTitle";
import { Heading } from "../components/ui/Heading";
import { Button } from "../components/ui/Button";

export const Route = createFileRoute("/math")({
  component: MathPage,
});

function MathPage() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Extract headings from markdown content for TOC
  const headings = mathContent
    .split("\n")
    .filter((line) => line.startsWith("##") && !line.startsWith("###"))
    .map((heading) => {
      const level = heading.match(/^#+/)?.[0].length || 2;
      const text = heading.replace(/^#+\s*/, "");
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      return { level, text, id };
    });

  // Show/hide back to top button based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <title>{pageTitle("The Math Behind TrendWeight")}</title>
      <Layout>
        <div className="bg-white">
          <div>
            <div className="lg:grid lg:grid-cols-4 lg:gap-8">
              <div className="hidden lg:block">
                <div>
                  <Heading level={2} className="pb-4 text-gray-900">
                    Table of Contents
                  </Heading>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {headings.map((heading) => (
                      <li key={heading.id}>
                        <a href={`#${heading.id}`} className="hover:text-brand-600 text-gray-600 transition-colors hover:underline">
                          {heading.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                  {showBackToTop && (
                    <div className="fixed bottom-8">
                      <Button onClick={scrollToTop} variant="primary" className="flex items-center gap-2 shadow-lg" aria-label="Back to top">
                        <HiArrowUp className="h-4 w-4" />
                        <span>Back to top</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 lg:col-span-3 lg:mt-0">
                <div className="prose prose-gray prose-li:my-0.5 prose-h1:mb-4 prose-h2:mt-6 prose-h2:mb-3 prose-h3:mt-4 prose-h3:mb-2 prose-h4:mt-3 prose-h4:mb-2 max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      // Add IDs to headings for navigation
                      h2: ({ children }) => {
                        const text = children?.toString() || "";
                        const id = text
                          .toLowerCase()
                          .replace(/[^\w\s-]/g, "")
                          .replace(/\s+/g, "-");
                        return (
                          <Heading level={2} id={id}>
                            {children}
                          </Heading>
                        );
                      },
                      // Only override what needs special handling
                      code: ({ children, className, ...props }) => {
                        const isInline = !className?.includes("language-");
                        return isInline ? (
                          <code className="rounded bg-gray-100 px-1 py-0.5 text-sm text-gray-800" {...props}>
                            {children}
                          </code>
                        ) : (
                          <code {...props}>{children}</code>
                        );
                      },
                      pre: ({ children, ...props }) => (
                        <pre className="overflow-x-auto rounded-lg bg-gray-100 text-gray-800" {...props}>
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {mathContent}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
