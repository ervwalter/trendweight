# Color Migration Mapping

## Background Colors

- `bg-white` → `bg-background` or `bg-card` (depending on context)
- `bg-gray-50` → `bg-muted`
- `bg-gray-100` → `bg-muted`
- `bg-gray-200` → `bg-accent`
- `bg-gray-*` → `bg-muted` or `bg-accent`
- `bg-black` → `bg-foreground`
- `bg-brand-50` → `bg-primary/5` (5% opacity)
- `bg-brand-100` → `bg-primary/10`
- `bg-brand-300` → `bg-primary/30`
- `bg-brand-400` → `bg-primary/40`
- `bg-brand-500` → `bg-primary`
- `bg-brand-600` → `bg-primary`
- `bg-brand-700` → `bg-primary`
- `bg-brand-800` → `bg-primary`
- `bg-green-100` → `bg-success/10`
- `bg-green-600` → `bg-success`
- `bg-green-700` → `bg-success`
- `bg-green-800` → `bg-success`
- `bg-red-50` → `bg-destructive/10`
- `bg-red-500` → `bg-destructive`
- `bg-amber-50` → `bg-warning/10`
- `bg-amber-600` → `bg-warning`
- `bg-amber-700` → `bg-warning`
- `bg-amber-800` → `bg-warning`

## Text Colors

- `text-white` → `text-primary-foreground` or `text-background` (depending on context)
- `text-black` → `text-foreground`
- `text-gray-400` → `text-muted-foreground`
- `text-gray-500` → `text-muted-foreground`
- `text-gray-600` → `text-muted-foreground`
- `text-gray-700` → `text-foreground/80`
- `text-gray-800` → `text-foreground/90`
- `text-gray-900` → `text-foreground`
- `text-brand-500` → `text-primary`
- `text-brand-600` → `text-primary`
- `text-brand-700` → `text-primary`
- `text-brand-800` → `text-primary`
- `text-green-500` → `text-success`
- `text-green-600` → `text-success`
- `text-red-600` → `text-destructive`
- `text-red-700` → `text-destructive`
- `text-amber-600` → `text-warning`
- `text-amber-800` → `text-warning`
- `text-yellow-600` → `text-warning`
- `text-blue-600` → `text-info`

## Border Colors

- `border-gray-200` → `border-border`
- `border-gray-300` → `border-border`
- `border-gray-*` → `border-border`
- `border-slate-300` → `border-border`
- `border-slate-*` → `border-border`
- `border-zinc-*` → `border-border`
- `border-neutral-*` → `border-border`
- `border-stone-*` → `border-border`
- `border-brand-100` → `border-primary/20`
- `border-brand-500` → `border-primary`
- `border-red-100` → `border-destructive/20`
- `border-red-200` → `border-destructive/30`
- `border-amber-200` → `border-warning/30`

## Ring Colors

- `ring-amber-500` → `ring-warning`

## Status Colors (semantic variables)

- Green (success): Use `text-success`, `bg-success`, `bg-success/10`, `border-success`
- Red (error): Use `text-destructive`, `bg-destructive`, `bg-destructive/10`, `border-destructive`
- Amber/Yellow (warning): Use `text-warning`, `bg-warning`, `bg-warning/10`, `border-warning`
- Blue (info): Use `text-info`, `bg-info`, `bg-info/10`, `border-info`

## Notes

- Use opacity modifiers (`/10`, `/20`, etc.) for subtle backgrounds
- All status colors must use semantic variables (success, warning, info, destructive)
- Brand colors should map to `primary` for consistency with shadcn
- Need to add CSS variables for success, warning, and info colors to globals.css
