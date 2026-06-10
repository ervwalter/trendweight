// Phosphor Icons "note-pencil" (duotone variant), MIT license — https://phosphoricons.com
// Inlined as a one-off; the rest of the app uses lucide, which has no duotone style.

interface NotePencilIconProps {
  className?: string;
  /**
   * Fill class for the duotone shading layer (e.g. "fill-primary"). When omitted,
   * the layer renders as currentColor at reduced opacity (classic duotone).
   */
  accentClassName?: string;
}

export function NotePencilIcon({ className, accentClassName }: NotePencilIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M200,88l-72,72H96V128l72-72Z" className={accentClassName} opacity={accentClassName ? undefined : 0.25} />
      <path d="M229.66,58.34l-32-32a8,8,0,0,0-11.32,0l-96,96A8,8,0,0,0,88,128v32a8,8,0,0,0,8,8h32a8,8,0,0,0,5.66-2.34l96-96A8,8,0,0,0,229.66,58.34ZM124.69,152H104V131.31l64-64L188.69,88ZM200,76.69,179.31,56,192,43.31,212.69,64ZM224,128v80a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32h80a8,8,0,0,1,0,16H48V208H208V128a8,8,0,0,1,16,0Z" />
    </svg>
  );
}
