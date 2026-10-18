"use client";

import { useActionState } from "react";
import { business } from "@/data/business";
import { enquiryTypes } from "@/data/occasions";
import { Button } from "./Button";
import { submitCateringEnquiry, type EnquiryState } from "@/app/catering/actions";

/**
 * Large-order enquiry form.
 *
 * Submits to a Server Action that stores the enquiry in the database and
 * notifies the shop — it is no longer a mailto: link. The shop sees every
 * enquiry in the admin panel whether or not the email got through.
 */

const FIELD =
  "w-full rounded-[10px] border border-sand-dark bg-ivory px-4 py-3 text-[0.95rem] text-ink " +
  "placeholder:text-ink-faint/70 transition-colors duration-300 " +
  "focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-700/25";

const LABEL = "block text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-forest-800";

const initial: EnquiryState = { status: "idle" };

export function EnquiryForm() {
  const [state, formAction, pending] = useActionState(submitCateringEnquiry, initial);

  const error = (key: string) => state.fieldErrors?.[key];

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-[12px] border border-forest-700/30 bg-forest-800/5 px-6 py-8 text-center">
        <p className="font-display text-[1.6rem] text-forest-800">Thank you</p>
        <p className="mx-auto mt-3 max-w-[40ch] text-[0.95rem] leading-relaxed text-ink-soft">
          {state.message}
        </p>
        <p className="mt-4 text-[0.88rem] text-ink-soft">
          In a hurry? Call us on{" "}
          <a
            href={`tel:${business.phone}`}
            className="font-semibold text-forest-800 underline underline-offset-4"
          >
            {business.displayPhone}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="on-light">
      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="mb-5 rounded-[10px] border border-red-300 bg-red-50 px-4 py-3 text-[0.88rem] text-red-900"
        >
          {state.message}
        </p>
      ) : null}

      {/*
        Honeypot. Hidden from sight and from assistive tech, and never
        autofilled — only a bot fills it in.
      */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Leave this empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="name">Your name</label>
          <input id="name" name="name" type="text" required autoComplete="name" className={`mt-2 ${FIELD}`} placeholder="First and last name" />
          {error("name") ? <p className="mt-1.5 text-[0.82rem] text-red-700">{error("name")}</p> : null}
        </div>

        <div>
          <label className={LABEL} htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={`mt-2 ${FIELD}`} placeholder="0412 345 678" />
          {error("phone") ? <p className="mt-1.5 text-[0.82rem] text-red-700">{error("phone")}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" className={`mt-2 ${FIELD}`} placeholder="you@example.com" />
          {error("email") ? <p className="mt-1.5 text-[0.82rem] text-red-700">{error("email")}</p> : null}
        </div>

        <div>
          <label className={LABEL} htmlFor="occasion">What&rsquo;s the occasion?</label>
          <select id="occasion" name="occasion" className={`mt-2 ${FIELD}`} defaultValue={enquiryTypes[0]}>
            {enquiryTypes.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL} htmlFor="eventDate">Date you need it</label>
          <input id="eventDate" name="eventDate" type="date" className={`mt-2 ${FIELD}`} />
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL} htmlFor="guests">Roughly how many people?</label>
          <input id="guests" name="guests" type="text" inputMode="numeric" className={`mt-2 ${FIELD}`} placeholder="e.g. 40" />
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL} htmlFor="message">Tell us what you have in mind</label>
          <textarea
            id="message"
            name="message"
            rows={5}
            maxLength={2000}
            className={`mt-2 resize-y ${FIELD}`}
            placeholder="Which sweets you're after, whether you'd like a mixed platter, anything to avoid…"
          />
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button type="submit" variant="gold" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send Enquiry"}
        </Button>
        <p className="text-[0.85rem] leading-relaxed text-ink-soft">
          Prefer to talk it through? Call{" "}
          <a
            href={`tel:${business.phone}`}
            className="font-semibold text-forest-800 underline underline-offset-4 transition-colors hover:text-forest-700"
          >
            {business.displayPhone}
          </a>
          .
        </p>
      </div>

      <p aria-live="polite" className="sr-only">
        {pending ? "Sending your enquiry" : (state.message ?? "")}
      </p>
    </form>
  );
}
