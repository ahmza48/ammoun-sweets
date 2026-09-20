/**
 * SINGLE SOURCE OF TRUTH for every business fact used across the site.
 * Nothing below should be duplicated inside components.
 *
 * ── Verification status ───────────────────────────────────────────────────
 * VERIFIED   name, address, phone, coordinates, Google Maps place link,
 *            Instagram + Facebook handles, DoorDash ordering page.
 * TO CONFIRM opening hours (public listings disagree — see `hours.note`),
 *            rating/review count (changes over time), ABN, logo, photography.
 * NOT CLAIMED  founding year, owner names, awards, certifications, sourcing.
 *              Do not add any of these without written confirmation.
 */

export const business = {
  name: "Ammoun Sweets",
  legalTagline: "Lebanese Sweets & Pastries",
  shortDescription:
    "Traditional Lebanese sweets, baklava, knafeh, ashta desserts and celebration platters in Bass Hill, NSW.",

  // ── Contact ───────────────────────────────────────────────────────────────
  phone: "+61287641676", // tel: link value
  displayPhone: "(02) 8764 1676",
  internationalPhone: "+61 2 8764 1676",

  // ── Address ───────────────────────────────────────────────────────────────
  address: {
    shop: "Shop 2",
    street: "972 Hume Highway",
    suburb: "Bass Hill",
    state: "NSW",
    postcode: "2197",
    country: "Australia",
    countryCode: "AU",
  },

  geo: { latitude: -33.896156, longitude: 150.9913566 },

  // ── External links ────────────────────────────────────────────────────────
  links: {
    googleMaps:
      "https://www.google.com/maps/place/Ammoun+Sweets/@-33.896156,150.9913566,17z/data=!3m1!4b1!4m6!3m5!1s0x6b12bd4c5e747e45:0xf827fb737b76b4b6!8m2!3d-33.896156!4d150.9913566!16s%2Fg%2F11h7pz87k9",
    directions:
      "https://www.google.com/maps/dir/?api=1&destination=Ammoun+Sweets%2C+972+Hume+Highway%2C+Bass+Hill+NSW+2197&destination_place_id=ChIJRX50Xky9EmsRtrR2e3P7J_g",
    /**
     * Ordering: DoorDash is the listing that is currently live.
     * The Uber Eats and Menulog listings we found are both marked closed, so
     * they are deliberately not linked. Swap `order` for whichever platform
     * the owner prefers — it is referenced everywhere via `business.links.order`.
     */
    order: "https://www.doordash.com/store/ammoun-sweets-bass-hill-25502025/",
    orderPlatform: "DoorDash",
    instagram: "https://www.instagram.com/ammoun_sweets/",
    facebook: "https://www.facebook.com/ammounsweets/",
  },

  /**
   * Google rating. Displayed in exactly one component (GoogleRating) which
   * reads these two values — update here and the whole site follows.
   * Last checked against public listings: September 2026.
   */
  google: {
    rating: 4.3,
    reviewCount: 130,
    /** Shown as "130+ reviews" rather than an exact figure, since it moves. */
    reviewCountIsApproximate: true,
  },

  /**
   * Opening hours, 24h "HH:MM" strings. `null` = closed that day.
   * Public listings currently disagree (9am–10pm on two directories,
   * 9am–9pm on another), and the DoorDash *delivery* window (around
   * 12:00–20:15) is NOT the same as shop trading hours.
   * These are the most widely listed shop hours; confirm with the owner.
   */
  hours: {
    note: "Hours can vary on public holidays and during Ramadan — please call ahead.",
    verified: false,
    days: [
      { day: "Monday", short: "Mon", schema: "Mo", open: "09:00", close: "22:00" },
      { day: "Tuesday", short: "Tue", schema: "Tu", open: "09:00", close: "22:00" },
      { day: "Wednesday", short: "Wed", schema: "We", open: "09:00", close: "22:00" },
      { day: "Thursday", short: "Thu", schema: "Th", open: "09:00", close: "22:00" },
      { day: "Friday", short: "Fri", schema: "Fr", open: "09:00", close: "22:00" },
      { day: "Saturday", short: "Sat", schema: "Sa", open: "09:00", close: "22:00" },
      { day: "Sunday", short: "Sun", schema: "Su", open: "09:00", close: "22:00" },
    ],
  },

  /** Demo deployment origin. Replace with the real domain before launch. */
  siteUrl: "https://ammounsweets.example.com",
} as const;

export type BusinessHoursDay = (typeof business.hours.days)[number];

export const formattedAddress = `${business.address.shop}, ${business.address.street}, ${business.address.suburb} ${business.address.state} ${business.address.postcode}`;

export const addressLines = [
  `${business.address.shop}, ${business.address.street}`,
  `${business.address.suburb} ${business.address.state} ${business.address.postcode}`,
];

/** "9:00am – 10:00pm" from a 24h "HH:MM" pair. */
export function formatTimeRange(open: string, close: string) {
  return `${formatTime(open)} – ${formatTime(close)}`;
}

export function formatTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, "0")}${suffix}`;
}

/**
 * Collapses consecutive days that share the same hours, e.g.
 * [{ label: "Monday – Sunday", hours: "9am – 10pm" }]
 */
export function groupedHours() {
  const groups: { label: string; hours: string }[] = [];
  for (const day of business.hours.days) {
    const hours = day.open && day.close ? formatTimeRange(day.open, day.close) : "Closed";
    const last = groups.at(-1);
    if (last && last.hours === hours) {
      last.label = `${last.label.split(" – ")[0]} – ${day.day}`;
    } else {
      groups.push({ label: day.day, hours });
    }
  }
  return groups;
}
