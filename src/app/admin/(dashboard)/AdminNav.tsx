"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/server/db/schema";

/**
 * Admin sidebar navigation.
 *
 * `adminOnly` items are hidden from STAFF. That is presentation only — the
 * pages and actions behind them call `requireAdmin()` themselves, so hiding a
 * link is a courtesy, never the control.
 */

const LINKS: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/enquiries", label: "Catering enquiries" },
  { href: "/admin/settings", label: "Store settings", adminOnly: true },
];

export function AdminNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const visible = LINKS.filter((l) => !l.adminOnly || role === "ADMIN");

  return (
    <nav aria-label="Admin" className="px-3 pb-4 lg:pb-6">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {visible.map((link) => {
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "block whitespace-nowrap rounded-[8px] px-3 py-2.5 text-[0.85rem] font-medium transition-colors duration-200",
                  active
                    ? "bg-gold-400/15 text-gold-200"
                    : "text-cream/70 hover:bg-cream/5 hover:text-cream",
                ].join(" ")}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
