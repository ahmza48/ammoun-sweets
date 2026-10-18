"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addAdminOrderNote,
  changeOrderStatus,
  markOrderPaidAtCounter,
} from "../../actions";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import type { OrderStatus } from "@/server/db/schema";
import { ADMIN_BUTTON, ADMIN_INPUT } from "../../ui";

/**
 * Status buttons and the note composer.
 *
 * Only transitions the server considers legal are rendered — the list comes
 * from `allowedTransitions` on the server, and the action re-checks it, so a
 * crafted POST can't jump an unpaid order straight to Completed.
 *
 * Cancelling asks for confirmation because it also returns stock and emails
 * the customer; that is not something to do with a stray click.
 */
export function OrderActions({
  orderId,
  transitions,
  noteOnly = false,
  unpaid = false,
}: {
  orderId: string;
  transitions: OrderStatus[];
  noteOnly?: boolean;
  /** Shows the "paid in the shop" controls. Hidden once an order is paid. */
  unpaid?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ status: string; message?: string }>) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.status === "error") setError(result.message ?? "That didn't work.");
      else {
        setMessage(result.message ?? "Done.");
        router.refresh();
      }
    });
  }

  if (noteOnly) {
    return (
      <form
        className="mt-4 border-t border-forest-800/10 pt-4"
        action={(formData) => run(() => addAdminOrderNote(orderId, formData))}
      >
        <label htmlFor="note-body" className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-ink-soft">
          Add a note
        </label>
        <textarea
          id="note-body"
          name="body"
          rows={2}
          required
          maxLength={2000}
          placeholder="Customer called — collecting at 5pm."
          className={`mt-2 resize-y ${ADMIN_INPUT}`}
        />
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-[0.8rem] text-ink-soft">
            <input type="checkbox" name="customerVisible" className="h-4 w-4 accent-[#123b2a]" />
            Customer can see this
          </label>
          <button type="submit" disabled={pending} className={ADMIN_BUTTON}>
            {pending ? "Saving…" : "Add note"}
          </button>
        </div>
        <Feedback message={message} error={error} />
      </form>
    );
  }

  /*
   * Taking the money is the one thing the shop does that nothing online can
   * do, so it gets its own row rather than being buried in the status list.
   * One way only: see the comment on `markOrderPaidAtCounter`.
   */
  const payment = unpaid ? (
    <div className="mt-4 border-t border-forest-800/10 pt-4">
      <p className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-ink-soft">
        Payment
      </p>
      <p className="mt-1 text-[0.8rem] text-ink-faint">
        Not paid yet. Tick it off once the customer has paid in the shop.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {(
          [
            ["cash", "Paid — cash"],
            ["card", "Paid — card"],
            ["phone", "Paid — over the phone"],
          ] as const
        ).map(([method, label]) => (
          <button
            key={method}
            type="button"
            disabled={pending}
            onClick={() => run(() => markOrderPaidAtCounter(orderId, method))}
            className="rounded-[8px] border border-emerald-300 px-4 py-2.5 text-[0.82rem] font-semibold text-emerald-900 transition-colors hover:bg-emerald-50 disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  if (transitions.length === 0) {
    return (
      <>
        {payment}
        <p className="mt-4 text-[0.85rem] text-ink-faint">
          This order is finished — no further status changes are possible.
        </p>
        {payment ? <Feedback message={message} error={error} /> : null}
      </>
    );
  }

  return (
    <div className="mt-4 border-t border-forest-800/10 pt-4">
      <p className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-ink-soft">
        Move to
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {transitions.map((status) => {
          const destructive = status === "CANCELLED";
          return (
            <button
              key={status}
              type="button"
              disabled={pending}
              onClick={() => {
                if (
                  destructive &&
                  !window.confirm(
                    "Cancel this order? Any tracked stock goes back on the shelf and the customer is emailed.",
                  )
                ) {
                  return;
                }
                run(() => changeOrderStatus(orderId, status));
              }}
              className={[
                "rounded-[8px] px-4 py-2.5 text-[0.82rem] font-semibold transition-colors disabled:opacity-50",
                destructive
                  ? "border border-red-300 text-red-800 hover:bg-red-50"
                  : "bg-forest-800 text-ivory hover:bg-forest-700",
              ].join(" ")}
            >
              {ORDER_STATUS_LABELS[status]}
            </button>
          );
        })}
      </div>
      {payment}
      <Feedback message={message} error={error} />
    </div>
  );
}

function Feedback({ message, error }: { message: string | null; error: string | null }) {
  if (!message && !error) return null;
  return (
    <p
      role="status"
      aria-live="polite"
      className={`mt-3 text-[0.82rem] ${error ? "text-red-700" : "text-emerald-800"}`}
    >
      {error ?? message}
    </p>
  );
}
