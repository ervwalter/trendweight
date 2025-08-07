import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return <Sonner theme="light" position="bottom-right" richColors {...props} />;
};

export { Toaster };
