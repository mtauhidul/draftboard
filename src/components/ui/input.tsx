import { Input as InputPrimitive } from '@base-ui/react/input';
import { cn } from 'cn';
import * as React from 'react';

/**
 * Text field, dressed as Excalidraw's own modal inputs are: a hairline in
 * `--input-border-color`, a filled surface in `--input-bg-color`, a lighter
 * fill on hover, and the primary violet on the border when focused. Excalidraw
 * changes only the border colour on focus rather than adding a ring, so the
 * ring here is kept faint — enough for a visible focus indicator, not enough
 * to read as a second border.
 *
 * The height is 2.25rem to match every control in the app's own chrome. The
 * shadcn default is 2rem, which reads as a different UI when the dialog is
 * opened from a bar built out of 2.25rem buttons.
 *
 * `text-base md:text-sm` is deliberate, not an oversight: 16px is what stops
 * iOS Safari from zooming the whole page when the field takes focus, and the
 * desktop size then drops back to the dialog's own 14px.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 rounded-md border border-[var(--input-border-color)] bg-[var(--input-bg-color)] px-2.5 text-base text-foreground transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:bg-[var(--input-hover-bg-color)] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm',
        className
      )}
      {...props}
    />
  );
}

export { Input };
