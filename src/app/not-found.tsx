import Link from 'next/link';

/** Rendered for unmatched routes. */
export default function NotFound() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-1 px-6 text-center">
      <h1 className="text-base font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        There&apos;s nothing at this address.
      </p>
      <Link
        href="/"
        className="mt-2 text-sm underline underline-offset-4 hover:text-foreground"
      >
        Back to boards
      </Link>
    </div>
  );
}
