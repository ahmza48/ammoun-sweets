import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy (what earlier Next.js versions called middleware).
 *
 * ── Scope, deliberately narrow ────────────────────────────────────────────
 * This is an *optimistic* check only: it bounces requests to /admin that carry
 * no session cookie at all, so unauthenticated visitors get a login page
 * instead of a flash of the admin shell.
 *
 * It does NOT decide authorisation. The cookie is opaque and validating it
 * means a database round trip, which the Next docs specifically warn against
 * doing here. Every admin page and every admin Server Action calls
 * `requireAdmin()` / `requireStaff()` next to the data it protects — that is
 * the real check, and it still holds if this file were deleted tomorrow.
 *
 * Also sets the security headers that are most useful to apply uniformly.
 */

const SESSION_COOKIE = "ammoun_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const hasSession = request.cookies.has(SESSION_COOKIE);
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      // Send them back where they were headed once they're in.
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();

  // Clickjacking: nothing on this site should ever be framed.
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self)",
  );

  // Admin pages must never be cached by an intermediary — they contain
  // customer names, phone numbers and addresses.
  if (pathname.startsWith("/admin")) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimisation, which don't
     * need headers applied per request and would only add latency.
     */
    "/((?!_next/static|_next/image|favicon.svg|images/|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico)$).*)",
  ],
};
