import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import {
  Menu,
  X,
  Check,
  CheckCircle,
  Copy,
  Github,
  Rss,
  Clock,
  HelpCircle,
  Download,
  Heart,
  Lightbulb,
  ShoppingCart,
  ExternalLink,
  ArrowUp,
} from "lucide-react";

describe("Icon Migration to lucide-react", () => {
  describe("Icon Availability", () => {
    it("should have lucide-react equivalent for HiMenu", () => {
      const { container } = render(<Menu className="test-icon" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should have lucide-react equivalent for HiX", () => {
      const { container } = render(<X className="test-icon" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should have lucide-react equivalent for HiCheckCircle", () => {
      const { container } = render(<CheckCircle className="test-icon" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should have lucide-react equivalent for FiCopy", () => {
      const { container } = render(<Copy className="test-icon" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should have lucide-react equivalent for FiCheck", () => {
      const { container } = render(<Check className="test-icon" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should have lucide-react equivalent for FaGithub", () => {
      const { container } = render(<Github className="test-icon" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should have lucide-react equivalent for FaRss", () => {
      const { container } = render(<Rss className="test-icon" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should have lucide-react equivalent for FaCheck", () => {
      const { container } = render(<Check className="test-icon" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should have lucide-react equivalent for HiOutlineClock", () => {
      const { container } = render(<Clock className="test-icon" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should have lucide-react equivalent for HiQuestionMarkCircle", () => {
      const { container } = render(<HelpCircle className="test-icon" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should have lucide-react equivalent for HiDownload", () => {
      const { container } = render(<Download className="test-icon" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should have lucide-react equivalent for HiOutlineHeart", () => {
      const { container } = render(<Heart className="test-icon" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should have lucide-react equivalent for HiOutlineLightBulb", () => {
      const { container } = render(<Lightbulb className="test-icon" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should have lucide-react equivalent for HiOutlineRss", () => {
      const { container } = render(<Rss className="test-icon" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should have lucide-react equivalent for HiOutlineShoppingCart", () => {
      const { container } = render(<ShoppingCart className="test-icon" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should have lucide-react equivalent for HiExternalLink", () => {
      const { container } = render(<ExternalLink className="test-icon" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should have lucide-react equivalent for HiArrowUp", () => {
      const { container } = render(<ArrowUp className="test-icon" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("Icon Props Support", () => {
    it("should accept className prop", () => {
      const { container } = render(<Menu className="text-muted-foreground h-5 w-5" />);
      const icon = container.querySelector("svg");
      expect(icon).toHaveClass("w-5", "h-5", "text-muted-foreground");
    });

    it("should accept size prop", () => {
      const { container } = render(<Menu size={24} />);
      const icon = container.querySelector("svg");
      expect(icon).toHaveAttribute("width", "24");
      expect(icon).toHaveAttribute("height", "24");
    });

    it("should accept aria-label for accessibility", () => {
      const { container } = render(<Menu aria-label="Menu icon" />);
      const icon = container.querySelector("svg");
      expect(icon).toHaveAttribute("aria-label", "Menu icon");
    });
  });
});
