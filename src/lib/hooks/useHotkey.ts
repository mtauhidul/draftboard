'use client';

import { useEffect } from 'react';

/**
 * True when the event came from somewhere the user is typing, so shortcuts
 * don't hijack normal text entry.
 */
function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

type Options = {
  /** Skip the "user is typing" guard — needed for Escape-style keys. */
  allowWhileTyping?: boolean;
};

/**
 * Binds a single-key shortcut. Only `key` plus an optional modifier is
 * supported; anything bigger is better served by a real command palette.
 */
export function useHotkey(
  key: string,
  handler: () => void,
  { allowWhileTyping = false }: Options = {}
) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // `key` is missing on some synthetic events — browser extensions, IMEs
      // and assistive tools all dispatch keydowns the DOM constructor would
      // not. They carry no key, so they cannot match any shortcut and are
      // dropped rather than allowed to throw out of the listener.
      if (typeof event.key !== 'string' || !event.key) return;
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (event.altKey || event.metaKey || event.ctrlKey) return;
      if (!allowWhileTyping && isTypingTarget(event.target)) return;

      event.preventDefault();
      handler();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, handler, allowWhileTyping]);
}
