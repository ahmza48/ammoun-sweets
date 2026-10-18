import Link from "next/link";
import type { ReactNode } from "react";
import type { OrderStatus, PaymentStatus } from "@/server/db/schema";

/**
 * Shared admin primitives.
 *
 * Status is communicated by label *and* colour, never colour alone — a badge
 * that only differs by hue is unreadable for a colour-blind user and invisible
 * in a printout.
 */

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-forest-800/10 bg-white px-5 py-5 sm:px-8">
      <div>
        <h1 className="font-display text-[1.7rem] leading-tight text-forest-800">{title}</h1>
        {description ? (
          <p className="mt-1 text-[0.88rem] text-ink-soft">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[10px] border border-forest-800/10 bg-white ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </p>
      <p className="mt-2 font-display text-[1.9rem] leading-none text-forest-800">{value}</p>
      {hint ? <p className="mt-1.5 text-[0.78rem] text-ink-faint">{hint}</p> : null}
    </Card>
  );
}

const ORDER_TONES: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "border-amber-300 bg-amber-50 text-amber-900",
  CONFIRMED: "border-sky-300 bg-sky-50 text-sky-900",
  PREPARING: "border-indigo-300 bg-indigo-50 text-indigo-900",
  READY_FOR_PICKUP: "border-emerald-300 bg-emerald-50 text-emerald-900",
  OUT_FOR_DELIVERY: "border-emerald-300 bg-emerald-50 text-emerald-900",
  COMPLETED: "border-forest-700/30 bg-forest-800/8 text-forest-800",
  CANCELLED: "border-neutral-300 bg-neutral-100 text-neutral-700",
};

const PAYMENT_TONES: Record<PaymentStatus, string> = {
  PENDING: "border-amber-300 bg-amber-50 text-amber-900",
  PAID: "border-emerald-300 bg-emerald-50 text-emerald-900",
  FAILED: "border-red-300 bg-red-50 text-red-900",
  CANCELLED: "border-neutral-300 bg-neutral-100 text-neutral-700",
  PARTIALLY_REFUNDED: "border-orange-300 bg-orange-50 text-orange-900",
  REFUNDED: "border-neutral-300 bg-neutral-100 text-neutral-700",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const tones = {
    neutral: "border-neutral-300 bg-neutral-100 text-neutral-700",
    good: "border-emerald-300 bg-emerald-50 text-emerald-900",
    warn: "border-amber-300 bg-amber-50 text-amber-900",
    bad: "border-red-300 bg-red-50 text-red-900",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status, label }: { status: OrderStatus; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold ${ORDER_TONES[status]}`}
    >
      {label}
    </span>
  );
}

export function PaymentStatusBadge({
  status,
  label,
}: {
  status: PaymentStatus;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold ${PAYMENT_TONES[status]}`}
    >
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className="font-display text-[1.35rem] text-forest-800">{title}</p>
      <p className="max-w-sm text-[0.9rem] leading-relaxed text-ink-soft">{description}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-2 rounded-[8px] bg-forest-800 px-4 py-2.5 text-[0.82rem] font-semibold text-ivory transition-colors hover:bg-forest-700"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export const ADMIN_INPUT =
  "w-full rounded-[8px] border border-forest-800/20 bg-white px-3 py-2 text-[0.9rem] text-ink " +
  "focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-700/20";

export const ADMIN_LABEL =
  "block text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-ink-soft";

export const ADMIN_BUTTON =
  "inline-flex items-center justify-center rounded-[8px] bg-forest-800 px-4 py-2.5 " +
  "text-[0.82rem] font-semibold text-ivory transition-colors hover:bg-forest-700 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const ADMIN_BUTTON_SECONDARY =
  "inline-flex items-center justify-center rounded-[8px] border border-forest-800/25 px-4 py-2.5 " +
  "text-[0.82rem] font-semibold text-forest-800 transition-colors hover:bg-forest-800/5";
