"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEnquiryStatus } from "../actions";

const OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "CLOSED", label: "Closed" },
] as const;

/** Small status select. Labelled, so it is not a bare dropdown to a screen reader. */
export function EnquiryStatusControl({
  id,
  status,
}: {
  id: string;
  status: "NEW" | "IN_PROGRESS" | "CLOSED";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-[0.8rem] text-ink-soft">
      <span className="sr-only">Enquiry status</span>
      <select
        value={status}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value as (typeof OPTIONS)[number]["value"];
          startTransition(async () => {
            await setEnquiryStatus(id, next);
            router.refresh();
          });
        }}
        className="rounded-[8px] border border-forest-800/20 bg-white px-3 py-1.5 text-[0.82rem] text-ink disabled:opacity-50"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
