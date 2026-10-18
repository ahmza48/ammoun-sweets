"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleProductAvailability } from "../actions";

/**
 * "Sold out today" switch.
 *
 * Optimistic, because in a busy shop this gets tapped mid-service and waiting
 * on a round trip to see the state change feels broken. If the server rejects
 * it, React reverts the optimistic value and `router.refresh()` brings back
 * the truth.
 *
 * It is a real checkbox with a label, not a styled div, so it is keyboard
 * reachable and announces its state.
 */
export function AvailabilityToggle({
  productId,
  available,
}: {
  productId: string;
  available: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(available);

  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <span className="sr-only">
        {optimistic ? "Mark sold out today" : "Put back on the menu"}
      </span>

      <span
        aria-hidden="true"
        className={`text-[0.78rem] font-medium ${
          optimistic ? "text-emerald-800" : "text-amber-800"
        }`}
      >
        {optimistic ? "Available" : "Sold out"}
      </span>

      <input
        type="checkbox"
        checked={optimistic}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.checked;
          startTransition(async () => {
            setOptimistic(next);
            await toggleProductAvailability(productId, next);
            router.refresh();
          });
        }}
        className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-neutral-300 transition-colors duration-200 checked:bg-emerald-600 disabled:opacity-50
          before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-white before:transition-transform before:duration-200
          checked:before:translate-x-[1.125rem]"
      />
    </label>
  );
}
