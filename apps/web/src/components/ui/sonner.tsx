import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return <Sonner theme="light" position="top-right" richColors {...props} />;
};

export { Toaster };
