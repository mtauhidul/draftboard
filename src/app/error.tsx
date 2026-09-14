'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Catches render-time failures anywhere below the root.
 *
 * Deliberately narrow: a retry and a way back, with a vague message because a
 * stack trace means nothing in a local personal app.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error', error);
  }, [error]);

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <AlertTriangle className="size-5 text-muted-foreground" />
      <div>
        <h1 className="text-base font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {error.message || 'An unexpected error occurred.'}
        </p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-foreground px-3 py-1.5 font-medium text-background transition-opacity hover:opacity-90"
        >
          Try again
        </button>
        <Link href="/" className="underline underline-offset-4">
          Go to boards
        </Link>
      </div>
    </div>
  );
}
