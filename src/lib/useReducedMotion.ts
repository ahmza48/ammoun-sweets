"use client";

import { useSyncExternalStore } from "react";

/**
 * Tracks `prefers-reduced-motion`, for the animations CSS can't opt out of on
 * its own — anything driven from JavaScript, like the hero parallax.
 *
 * The server snapshot is `true`, i.e. "assume reduced motion". Erring that way
 * means a motion-sensitive visitor can never catch a frame of movement before
 * the media query resolves on the client.
 */

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true,
  );
}
