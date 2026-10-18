import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, isStaff } from "@/server/auth/session";
import { LogoMark } from "@/components/Logo";
import { logout } from "../login/actions";
import { AdminNav } from "./AdminNav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Ammoun Sweets Admin" },
  robots: { index: false, follow: false },
};

/**
 * Admin shell.
 *
 * ── Authorisation ─────────────────────────────────────────────────────────
 * This layout wraps every admin route *except* the login page, which is why
 * the guarded screens live in a `(dashboard)` route group. Putting the login
 * page under the same guarded layout produces an infinite redirect: the layout
 * bounces an unauthenticated visitor to /admin/login, which renders inside the
 * layout, which bounces them again. The route group keeps the URLs identical
 * (`/admin`, `/admin/orders`) while leaving login outside the guard.
 *
 * `proxy.ts` already bounced cookie-less requests, but that is only an
 * optimistic check — this is where the session is actually resolved and the
 * role verified. Individual Server Actions check again, because a layout guard
 * does nothing for a direct POST.
 *
 * ── Visual language ───────────────────────────────────────────────────────
 * Operational, not decorative: a dense sidebar, readable tables, status
 * badges. It keeps the brand green and the mark, and leaves the gold
 * flourishes to the customer-facing site.
 */

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();

  if (!isStaff(user)) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-dvh bg-[#f6f7f5] text-ink">
      <div className="flex min-h-dvh flex-col lg:flex-row">
        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <aside className="shrink-0 border-b border-forest-800/15 bg-forest-900 lg:w-60 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 px-5 py-4 lg:block lg:py-6">
            <Link href="/admin" className="flex items-center gap-2.5">
              <LogoMark size={26} className="text-gold-300" />
              <span className="font-display text-[1.05rem] leading-none text-ivory">
                Ammoun Admin
              </span>
            </Link>
            <Link
              href="/"
              className="text-[0.72rem] font-medium text-cream/50 transition-colors hover:text-gold-300 lg:mt-3 lg:block"
            >
              View shop &rarr;
            </Link>
          </div>

          <AdminNav role={user!.role} />

          <div className="border-t border-gold-400/15 px-5 py-4">
            <p className="truncate text-[0.75rem] text-cream/55">{user!.email}</p>
            <p className="mt-0.5 text-[0.68rem] uppercase tracking-[0.14em] text-gold-400/70">
              {user!.role}
            </p>
            <form action={logout} className="mt-3">
              <button
                type="submit"
                className="text-[0.78rem] font-medium text-cream/70 transition-colors hover:text-gold-300"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
