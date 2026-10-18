"use server";

import { db } from "@/server/db";
import { cateringEnquiries } from "@/server/db/schema";
import { cateringEnquirySchema, toFieldErrors, type FieldErrors } from "@/lib/validation";
import { getStoreSettings } from "@/server/services/settings";
import { notifyShopCateringEnquiry } from "@/server/services/notifications";
import { clientIp, logError, logInfo, rateLimit } from "@/server/services/security";

/**
 * Catering enquiry.
 *
 * Stored in the database *and* emailed. Email alone is fragile — a spam filter
 * or a mistyped forwarding rule loses a lead silently — so the record is the
 * source of truth and the email is the notification.
 *
 * Spam handling is a honeypot plus a rate limit rather than a CAPTCHA: this
 * form is low-volume, and a CAPTCHA would cost every legitimate customer time
 * to stop a problem the shop may never have.
 */

export type EnquiryState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: FieldErrors;
};

export async function submitCateringEnquiry(
  _previous: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> {
  const ip = await clientIp();
  const limit = await rateLimit(`enquiry:${ip}`, 5, 60 * 30);
  if (!limit.allowed) {
    return {
      status: "error",
      message: "You've sent a few enquiries already — please call the shop instead.",
    };
  }

  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const guestsRaw = text("guests");

  const parsed = cateringEnquirySchema.safeParse({
    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    eventDate: text("eventDate"),
    guests: guestsRaw ? Number(guestsRaw) : null,
    occasion: text("occasion"),
    message: text("message"),
    website: text("website"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const input = parsed.data;

  // Honeypot: a real person never fills a field they cannot see.
  if (input.website) {
    logInfo("enquiry.honeypot_tripped", { ip });
    // Report success so a bot gets no signal about what blocked it.
    return { status: "success", message: "Thanks — we'll be in touch shortly." };
  }

  try {
    await db.insert(cateringEnquiries).values({
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      eventDate: input.eventDate || null,
      guests: input.guests ?? null,
      occasion: input.occasion || null,
      message: input.message || null,
    });

    const settings = await getStoreSettings();
    void notifyShopCateringEnquiry(
      {
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        eventDate: input.eventDate || null,
        guests: input.guests ?? null,
        occasion: input.occasion || null,
        message: input.message || null,
      },
      settings,
    );

    logInfo("enquiry.received", { occasion: input.occasion });

    return {
      status: "success",
      message:
        "Thanks — we've got your enquiry and someone from the shop will be in touch shortly.",
    };
  } catch (error) {
    logError("enquiry.failed", error);
    return {
      status: "error",
      message: "We couldn't send that just now. Please call the shop and we'll help.",
    };
  }
}
