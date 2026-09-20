"use client";

import { useMemo, useState } from "react";
import { business } from "@/data/business";
import { enquiryTypes } from "@/data/occasions";
import { Button } from "./Button";

/**
 * Large-order enquiry form.
 *
 * DEMO BEHAVIOUR: there is no backend, so this composes a pre-filled email
 * (and offers a phone fallback) rather than silently pretending to submit.
 * When the owner picks an inbox or a form service, replace `handleSubmit`
 * with a POST — the markup and validation stay as they are.
 */

const FIELD =
  "w-full rounded-[10px] border border-sand-dark bg-ivory px-4 py-3 text-[0.95rem] text-ink " +
  "placeholder:text-ink-faint/70 transition-colors duration-300 " +
  "focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-700/25";

const LABEL = "block text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-forest-800";

export function EnquiryForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [type, setType] = useState<string>(enquiryTypes[0]);
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("");
  const [details, setDetails] = useState("");
  const [sent, setSent] = useState(false);

  const mailto = useMemo(() => {
    const subject = `Large order enquiry — ${type}`;
    const body = [
      `Name: ${name || "—"}`,
      `Best contact: ${contact || "—"}`,
      `Occasion: ${type}`,
      `Date needed: ${date || "—"}`,
      `Approx. number of people: ${guests || "—"}`,
      "",
      "Details:",
      details || "—",
    ].join("\n");

    // DEMO: no public enquiry inbox is confirmed, so this opens the
    // customer's own mail client with everything filled in.
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [name, contact, type, date, guests, details]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.location.href = mailto;
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} className="on-light" noValidate={false}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="enq-name">
            Your name
          </label>
          <input
            id="enq-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`mt-2 ${FIELD}`}
            placeholder="First and last name"
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="enq-contact">
            Phone or email
          </label>
          <input
            id="enq-contact"
            name="contact"
            type="text"
            required
            autoComplete="tel"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className={`mt-2 ${FIELD}`}
            placeholder="How should we get back to you?"
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="enq-type">
            What&rsquo;s the occasion?
          </label>
          <select
            id="enq-type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={`mt-2 ${FIELD}`}
          >
            {enquiryTypes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL} htmlFor="enq-date">
            Date you need it
          </label>
          <input
            id="enq-date"
            name="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`mt-2 ${FIELD}`}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL} htmlFor="enq-guests">
            Roughly how many people?
          </label>
          <input
            id="enq-guests"
            name="guests"
            type="text"
            inputMode="numeric"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className={`mt-2 ${FIELD}`}
            placeholder="e.g. 40"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL} htmlFor="enq-details">
            Tell us what you have in mind
          </label>
          <textarea
            id="enq-details"
            name="details"
            rows={5}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className={`mt-2 resize-y ${FIELD}`}
            placeholder="Which sweets you're after, whether you'd like a mixed platter, anything to avoid…"
          />
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button type="submit" variant="gold" size="lg">
          Send Enquiry
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

      <p
        aria-live="polite"
        className={`mt-5 text-[0.85rem] ${sent ? "text-forest-700" : "sr-only"}`}
      >
        {sent
          ? "Your email app should have opened with the enquiry ready to send. If it didn't, please call the shop instead."
          : ""}
      </p>

      {/* DEMO NOTE — remove once a real enquiry inbox or form service is wired up. */}
      <p className="mt-6 rounded-[10px] border border-sand-dark bg-sand/50 px-4 py-3 text-[0.78rem] leading-relaxed text-ink-soft">
        <strong className="font-semibold text-forest-800">Demo note:</strong>{" "}
        this form opens your email app with the details filled in. Once
        Ammoun Sweets confirms an enquiry inbox, it will submit directly to
        the shop instead.
      </p>
    </form>
  );
}
