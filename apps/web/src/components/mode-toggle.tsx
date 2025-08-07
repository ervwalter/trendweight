import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  // Since we don't support system mode anymore, theme will always be "light" or "dark"
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className={cn(
        "text-primary-foreground hover:text-primary-foreground",
        "hover:bg-background/20",
        "[&]:hover:bg-background/20", // Higher specificity to override ghost variant
      )}
    >
      {theme === "light" ? (
        <Sun className="h-[1.2rem] w-[1.2rem]" data-testid="sun-icon" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem]" data-testid="moon-icon" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
