import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/lib/hooks/use-theme";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();
  return <Sonner theme={theme} position="top-right" richColors {...props} />;
};

export { Toaster };
