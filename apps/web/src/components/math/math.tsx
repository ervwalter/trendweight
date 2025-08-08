import "katex/dist/katex.min.css";
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import mathContent from "./math-of-trendweight.md?raw";
import { Heading } from "../common/heading";
import { Button } from "../ui/button";

export function Math() {
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
    <div className="bg-background">
      <div>
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          <div className="hidden lg:block">
            <div>
              <Heading level={2} className="text-foreground pb-4">
                Table of Contents
              </Heading>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {headings.map((heading) => (
                  <li key={heading.id}>
                    <a href={`#${heading.id}`} className="hover:text-link text-muted-foreground transition-colors hover:underline">
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ul>
              {showBackToTop && (
                <div className="fixed bottom-8">
                  <Button onClick={scrollToTop} variant="default" className="flex items-center gap-2 shadow-lg" aria-label="Back to top">
                    <ArrowUp className="h-4 w-4" />
                    <span>Back to top</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 lg:col-span-3 lg:mt-0">
            <div className="prose dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground prose-li:my-0.5 prose-h1:mb-4 prose-h2:mt-6 prose-h2:mb-3 prose-h3:mt-4 prose-h3:mb-2 prose-h4:mt-3 prose-h4:mb-2 max-w-none">
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
                      <code className="bg-muted text-foreground/90 rounded px-1 py-0.5 text-sm" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code {...props}>{children}</code>
                    );
                  },
                  pre: ({ children, ...props }) => (
                    <pre className="bg-muted text-foreground/90 overflow-x-auto rounded-lg" {...props}>
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
  );
}
