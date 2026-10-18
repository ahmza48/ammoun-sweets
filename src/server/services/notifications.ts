import "server-only";
import { env } from "@/server/env";
import { formatMoney } from "@/lib/money";
import { formatAuPhone } from "@/lib/validation";
import { formatDayLabel, formatSlotLabel } from "./fulfilment";
import { logError, logInfo } from "./security";
import type { OrderWithItems } from "./orders";
import type { StoreSettings } from "@/server/db/schema";

/**
 * Transactional notifications.
 *
 * ── Channel abstraction ───────────────────────────────────────────────────
 * `NotificationChannel` is the seam. Today there is an email channel with two
 * transports (Resend, or a console logger when no API key is configured); SMS
 * can be added later as another channel without touching order code, because
 * order code only ever calls the `notify*` functions below.
 *
 * ── Never blocking ────────────────────────────────────────────────────────
 * Sending is best-effort and always caught. A customer who has just paid must
 * see their confirmation page even if the mail provider is having an outage —
 * the order is already safely in the database, and a failed send is logged for
 * the shop to follow up.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export interface EmailTransport {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

/** Development default: logs instead of sending, so nothing is silently lost. */
const consoleTransport: EmailTransport = {
  name: "console",
  async send(message) {
    logInfo("email.console", {
      to: message.to,
      subject: message.subject,
      preview: message.text.slice(0, 200),
    });
  },
};

const resendTransport: EmailTransport = {
  name: "resend",
  async send(message) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.email.resendApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.email.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend responded ${response.status}: ${await response.text()}`);
    }
  },
};

export function getEmailTransport(): EmailTransport {
  return env.email.provider === "resend" ? resendTransport : consoleTransport;
}

async function send(message: EmailMessage): Promise<boolean> {
  try {
    await getEmailTransport().send(message);
    return true;
  } catch (error) {
    logError("email.send_failed", error, { to: message.to, subject: message.subject });
    return false;
  }
}

/* ── Templates ──────────────────────────────────────────────────────────── */

const BRAND = {
  green: "#123b2a",
  gold: "#c9a45c",
  cream: "#faf7f0",
  ink: "#25241e",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Table-based layout with inline styles — the lowest common denominator that
 * survives Outlook and Gmail. Matches the site's green/gold palette.
 */
function layout(heading: string, body: string, settings: StoreSettings): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${BRAND.cream};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};padding:28px 12px">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fffdf8;border:1px solid #e3d7bf;border-radius:14px;overflow:hidden">
      <tr><td style="background:${BRAND.green};padding:26px 28px;text-align:center">
        <div style="color:${BRAND.gold};font-size:19px;letter-spacing:6px;font-weight:600">AMMOUN</div>
        <div style="color:${BRAND.gold};font-size:11px;letter-spacing:9px;margin-top:5px">SWEETS</div>
      </td></tr>
      <tr><td style="padding:30px 28px">
        <h1 style="margin:0 0 18px;font-size:22px;font-weight:600;color:${BRAND.green}">${escapeHtml(heading)}</h1>
        ${body}
      </td></tr>
      <tr><td style="background:${BRAND.green};padding:20px 28px;color:rgba(250,247,240,.75);font-size:12px;line-height:1.7">
        ${escapeHtml(settings.businessName)}<br>
        ${escapeHtml(settings.addressLine)}, ${escapeHtml(settings.suburb)} ${escapeHtml(settings.state)} ${escapeHtml(settings.postcode)}<br>
        <a href="tel:${escapeHtml(settings.phone)}" style="color:${BRAND.gold};text-decoration:none">${escapeHtml(formatAuPhone(settings.phone))}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function itemsTableHtml(order: OrderWithItems): string {
  const rows = order.items
    .map(
      (item) => `<tr>
        <td style="padding:9px 0;border-bottom:1px solid #f0e7d6">
          <strong style="color:${BRAND.green}">${escapeHtml(item.productName)}</strong><br>
          <span style="color:#6b6859;font-size:13px">${escapeHtml(item.variantName)} × ${item.quantity}</span>
        </td>
        <td align="right" style="padding:9px 0;border-bottom:1px solid #f0e7d6;white-space:nowrap">${formatMoney(item.total)}</td>
      </tr>`,
    )
    .join("");

  const totalRow = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:5px 0;${bold ? `font-weight:700;color:${BRAND.green};font-size:16px` : "color:#55534a"}">${label}</td>
     <td align="right" style="padding:5px 0;${bold ? `font-weight:700;color:${BRAND.green};font-size:16px` : ""}">${value}</td></tr>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
    ${rows}
    <tr><td colspan="2" style="height:10px"></td></tr>
    ${totalRow("Subtotal", formatMoney(order.subtotal))}
    ${order.discount > 0 ? totalRow(`Discount${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ""}`, `−${formatMoney(order.discount)}`) : ""}
    ${order.deliveryFee > 0 ? totalRow("Delivery", formatMoney(order.deliveryFee)) : ""}
    ${totalRow("Total", formatMoney(order.total), true)}
  </table>`;
}

function fulfilmentHtml(order: OrderWithItems): string {
  if (order.fulfilmentType === "PICKUP") {
    const when =
      order.pickupDate && order.pickupTime
        ? `${formatDayLabel(order.pickupDate)} at ${formatSlotLabel(order.pickupTime)}`
        : "To be confirmed";
    return `<p style="margin:0 0 6px"><strong>Collection</strong></p>
            <p style="margin:0;color:#55534a">${escapeHtml(when)}</p>`;
  }
  const address = [
    order.deliveryAddress1,
    order.deliveryAddress2,
    `${order.deliverySuburb} ${order.deliveryState} ${order.deliveryPostcode}`,
  ]
    .filter(Boolean)
    .map((l) => escapeHtml(String(l)))
    .join("<br>");
  return `<p style="margin:0 0 6px"><strong>Delivery to</strong></p>
          <p style="margin:0;color:#55534a">${address}</p>`;
}

function itemsText(order: OrderWithItems): string {
  const lines = order.items.map(
    (i) => `  ${i.quantity} × ${i.productName} (${i.variantName})  ${formatMoney(i.total)}`,
  );
  return [
    ...lines,
    "",
    `  Subtotal: ${formatMoney(order.subtotal)}`,
    order.discount > 0 ? `  Discount: -${formatMoney(order.discount)}` : "",
    order.deliveryFee > 0 ? `  Delivery: ${formatMoney(order.deliveryFee)}` : "",
    `  Total: ${formatMoney(order.total)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/* ── Customer notifications ─────────────────────────────────────────────── */

export async function notifyOrderReceived(
  order: OrderWithItems,
  settings: StoreSettings,
): Promise<boolean> {
  const unpaid = order.paymentStatus !== "PAID";
  const body = `
    <p style="margin:0 0 18px;line-height:1.7">Thanks ${escapeHtml(order.firstName)} — we've received your order <strong>${escapeHtml(order.orderNumber)}</strong>.</p>
    ${unpaid ? `<p style="margin:0 0 18px;padding:12px 14px;background:#f2ead9;border-radius:8px;line-height:1.6">Payment will be taken when you collect your order.</p>` : ""}
    <div style="margin:0 0 20px">${fulfilmentHtml(order)}</div>
    ${itemsTableHtml(order)}
    <p style="margin:22px 0 0;color:#6b6859;font-size:13px;line-height:1.7">If anything looks wrong, call us on ${escapeHtml(formatAuPhone(settings.phone))} and we'll sort it out.</p>`;

  return send({
    to: order.email,
    subject: `Order ${order.orderNumber} received — Ammoun Sweets`,
    html: layout("We've got your order", body, settings),
    text: `Thanks ${order.firstName}, we've received order ${order.orderNumber}.\n\n${itemsText(order)}\n\nQuestions? Call ${formatAuPhone(settings.phone)}.`,
  });
}

export async function notifyPaymentConfirmed(
  order: OrderWithItems,
  settings: StoreSettings,
): Promise<boolean> {
  const body = `
    <p style="margin:0 0 18px;line-height:1.7">Your payment for <strong>${escapeHtml(order.orderNumber)}</strong> has gone through. We'll start getting it ready.</p>
    <div style="margin:0 0 20px">${fulfilmentHtml(order)}</div>
    ${itemsTableHtml(order)}`;

  return send({
    to: order.email,
    subject: `Payment confirmed — ${order.orderNumber}`,
    html: layout("Payment confirmed", body, settings),
    text: `Payment confirmed for order ${order.orderNumber}.\n\n${itemsText(order)}`,
  });
}

export async function notifyOrderStatus(
  order: OrderWithItems,
  settings: StoreSettings,
): Promise<boolean> {
  const copy: Partial<Record<string, { subject: string; heading: string; body: string }>> = {
    PREPARING: {
      subject: `We're preparing ${order.orderNumber}`,
      heading: "Your order is being prepared",
      body: "Our team has started on your order.",
    },
    READY_FOR_PICKUP: {
      subject: `${order.orderNumber} is ready for collection`,
      heading: "Ready for collection",
      body: `Your order is boxed and waiting at ${escapeHtml(settings.addressLine)}, ${escapeHtml(settings.suburb)}.`,
    },
    OUT_FOR_DELIVERY: {
      subject: `${order.orderNumber} is on its way`,
      heading: "Out for delivery",
      body: "Your order has left the shop and is on its way to you.",
    },
    COMPLETED: {
      subject: `Thanks for your order, ${order.firstName}`,
      heading: "Thank you",
      body: "We hope you enjoy them. We'd love to see you again soon.",
    },
    CANCELLED: {
      subject: `Order ${order.orderNumber} cancelled`,
      heading: "Your order has been cancelled",
      body: "If this wasn't expected, please get in touch and we'll help.",
    },
  };

  const template = copy[order.orderStatus];
  if (!template) return false;

  const body = `
    <p style="margin:0 0 18px;line-height:1.7">${template.body}</p>
    <div style="margin:0 0 20px">${fulfilmentHtml(order)}</div>
    ${itemsTableHtml(order)}`;

  return send({
    to: order.email,
    subject: template.subject,
    html: layout(template.heading, body, settings),
    text: `${template.heading}\n\n${template.body.replace(/<[^>]*>/g, "")}\n\n${itemsText(order)}`,
  });
}

/* ── Business notifications ─────────────────────────────────────────────── */

export async function notifyShopNewOrder(
  order: OrderWithItems,
  settings: StoreSettings,
): Promise<boolean> {
  const to = settings.orderNotificationEmail || settings.email;
  if (!to) {
    logInfo("email.no_shop_recipient", { orderNumber: order.orderNumber });
    return false;
  }

  const body = `
    <p style="margin:0 0 16px;line-height:1.7"><strong>${escapeHtml(order.firstName)} ${escapeHtml(order.lastName)}</strong><br>
      <a href="tel:${escapeHtml(order.phone)}" style="color:${BRAND.green}">${escapeHtml(formatAuPhone(order.phone))}</a> ·
      <a href="mailto:${escapeHtml(order.email)}" style="color:${BRAND.green}">${escapeHtml(order.email)}</a></p>
    <div style="margin:0 0 18px">${fulfilmentHtml(order)}</div>
    ${order.customerNotes ? `<p style="margin:0 0 18px;padding:12px 14px;background:#f2ead9;border-radius:8px"><strong>Notes:</strong> ${escapeHtml(order.customerNotes)}</p>` : ""}
    ${itemsTableHtml(order)}
    <p style="margin:22px 0 0"><a href="${env.appUrl}/admin/orders" style="background:${BRAND.gold};color:${BRAND.green};padding:11px 20px;border-radius:999px;text-decoration:none;font-weight:600;font-size:13px">Open in admin</a></p>`;

  return send({
    to,
    subject: `New order ${order.orderNumber} — ${formatMoney(order.total)}`,
    html: layout(`New order ${order.orderNumber}`, body, settings),
    text: `New order ${order.orderNumber} from ${order.firstName} ${order.lastName} (${formatAuPhone(order.phone)}).\n\n${itemsText(order)}`,
  });
}

export async function notifyShopCateringEnquiry(
  enquiry: {
    name: string;
    email?: string | null;
    phone?: string | null;
    eventDate?: string | null;
    guests?: number | null;
    occasion?: string | null;
    message?: string | null;
  },
  settings: StoreSettings,
): Promise<boolean> {
  const to = settings.orderNotificationEmail || settings.email;
  if (!to) return false;

  const row = (label: string, value?: string | null) =>
    value ? `<tr><td style="padding:4px 12px 4px 0;color:#6b6859">${label}</td><td style="padding:4px 0"><strong>${escapeHtml(value)}</strong></td></tr>` : "";

  const body = `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:16px">
      ${row("Name", enquiry.name)}
      ${row("Email", enquiry.email)}
      ${row("Phone", enquiry.phone ? formatAuPhone(enquiry.phone) : null)}
      ${row("Event date", enquiry.eventDate)}
      ${row("Guests", enquiry.guests ? String(enquiry.guests) : null)}
      ${row("Occasion", enquiry.occasion)}
    </table>
    ${enquiry.message ? `<p style="margin:0;padding:12px 14px;background:#f2ead9;border-radius:8px;line-height:1.7">${escapeHtml(enquiry.message)}</p>` : ""}`;

  return send({
    to,
    subject: `Catering enquiry — ${enquiry.name}`,
    html: layout("New catering enquiry", body, settings),
    text: `Catering enquiry from ${enquiry.name}\nEmail: ${enquiry.email ?? "-"}\nPhone: ${enquiry.phone ?? "-"}\nDate: ${enquiry.eventDate ?? "-"}\nGuests: ${enquiry.guests ?? "-"}\n\n${enquiry.message ?? ""}`,
  });
}

export async function sendPasswordReset(
  to: string,
  resetUrl: string,
  settings: StoreSettings,
): Promise<boolean> {
  const body = `
    <p style="margin:0 0 18px;line-height:1.7">Someone asked to reset the password for this email address. The link works for one hour.</p>
    <p style="margin:0 0 22px"><a href="${resetUrl}" style="background:${BRAND.gold};color:${BRAND.green};padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Choose a new password</a></p>
    <p style="margin:0;color:#6b6859;font-size:13px;line-height:1.7">If it wasn't you, you can ignore this email — nothing has changed.</p>`;

  return send({
    to,
    subject: "Reset your Ammoun Sweets password",
    html: layout("Reset your password", body, settings),
    text: `Reset your password using this link (valid for one hour):\n${resetUrl}\n\nIf it wasn't you, ignore this email.`,
  });
}
