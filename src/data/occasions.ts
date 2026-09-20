import type { ImageKey } from "./images";

/**
 * Occasion / use-case cards. Deliberately written as invitations to ask rather
 * than as promises — we have not verified any specific catering capability,
 * minimum order, lead time or delivery radius.
 */

export type Occasion = {
  id: string;
  title: string;
  description: string;
  image: ImageKey;
};

export const occasions: Occasion[] = [
  {
    id: "everyday",
    title: "Everyday Favourites",
    description:
      "A half kilo of baklava or a few pieces of knafeh to take home after dinner.",
    image: "baklava-slice",
  },
  {
    id: "family",
    title: "Family Gatherings",
    description:
      "Mixed plates built so there is something on the table for everyone.",
    image: "sharing-tray",
  },
  {
    id: "celebrations",
    title: "Celebrations",
    description:
      "Engagements, birthdays and graduations — sweets arranged to be put out and shared.",
    image: "celebration-table",
  },
  {
    id: "eid",
    title: "Eid & Special Occasions",
    description:
      "Traditional selections for the times of year when sweets matter most.",
    image: "eid-sweets",
  },
  {
    id: "gifts",
    title: "Gift Platters",
    description:
      "Assortments boxed and presented to be given, not just eaten.",
    image: "gift-tins",
  },
  {
    id: "corporate",
    title: "Corporate & Event Orders",
    description:
      "Office shouts, client thank-yous and function tables — tell us the numbers.",
    image: "mixed-platter",
  },
];

/** Enquiry reasons offered in the catering form's select. */
export const enquiryTypes = [
  "Family gathering",
  "Eid or religious occasion",
  "Engagement or wedding",
  "Birthday",
  "Workplace or corporate event",
  "Gift platter",
  "Custom sweet assortment",
  "Something else",
] as const;
