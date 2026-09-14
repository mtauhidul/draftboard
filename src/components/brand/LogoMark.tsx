import { cn } from 'cn';
import { Waypoints } from 'lucide-react';

/**
 * The Draftboard mark.
 *
 * Lucide's `waypoints` icon: four nodes on the ends of a cross of connecting
 * strokes. It reads as boards pinned to a canvas and joined up, which is what
 * this app is for.
 *
 * There is no separate colour here — the icon inherits `currentColor`, so it
 * picks up whatever the caller sets (the header tints it with `text-primary`,
 * i.e. Excalidraw's violet, in either theme). That is the "just match its
 * colour" part: no per-theme branching and no hard-coded hex, so it can never
 * drift out of step with the wordmark beside it.
 *
 * Size is left to the caller's `className` for the same reason; `size-4` is
 * only a fallback for callers that pass nothing.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Waypoints
      className={cn('size-4 shrink-0', className)}
      aria-hidden
      focusable="false"
    />
  );
}
