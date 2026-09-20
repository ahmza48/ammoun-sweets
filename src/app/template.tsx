/**
 * Page transition.
 *
 * `template.tsx` (rather than `layout.tsx`) remounts on every navigation, which
 * is exactly what restarts the animation — a layout would keep its DOM and the
 * effect would only ever play once.
 *
 * Kept to a short fade and a few pixels of lift. Anything longer starts to feel
 * like latency rather than polish, and the header stays put throughout so the
 * navigation itself never appears to move.
 */

export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
