import type { ImageKey } from "./images";

/** Gallery filter groups. Every entry points at a key in `images`. */

export const galleryCategories = [
  { id: "all", label: "All" },
  { id: "sweets", label: "Our Sweets" },
  { id: "platters", label: "Platters" },
  { id: "in-store", label: "In Store" },
  { id: "celebrations", label: "Celebrations" },
] as const;

export type GalleryCategoryId = (typeof galleryCategories)[number]["id"];

export type GalleryItem = {
  image: ImageKey;
  category: Exclude<GalleryCategoryId, "all">;
  /** Short caption shown on hover and in the lightbox. */
  caption: string;
};

export const gallery: GalleryItem[] = [
  { image: "hero-pistachio-baklava", category: "sweets", caption: "Pistachio baklava fingers" },
  { image: "in-store-display", category: "in-store", caption: "The counter, mid-morning" },
  { image: "halawet-el-jeben", category: "sweets", caption: "Halawet el jeben with ashta" },
  { image: "celebration-table", category: "celebrations", caption: "Laid out for a celebration" },
  { image: "gift-tins", category: "platters", caption: "Gift tins, packed to order" },
  { image: "knafeh-ashta", category: "sweets", caption: "Knafeh, straight from the tray" },
  { image: "display-counter", category: "in-store", caption: "Trays going out for the day" },
  { image: "mixed-platter", category: "platters", caption: "A mixed box with crushed pistachio" },
  { image: "craft-pistachio", category: "in-store", caption: "Trays of pistachio pastries on the counter" },
  { image: "eid-sweets", category: "celebrations", caption: "Sweets for Eid" },
  { image: "baklava-trays", category: "sweets", caption: "Baklava cooling on the trays" },
  { image: "sharing-tray", category: "celebrations", caption: "Made to be passed around" },
  { image: "pistachio-mix", category: "sweets", caption: "The pistachio mix" },
  { image: "gift-box-rolls", category: "platters", caption: "Boxed pastry rolls" },
  { image: "in-store-serving", category: "in-store", caption: "Plating an order" },
  { image: "market-spread", category: "in-store", caption: "A full tray, straight from the oven" },
  { image: "znoud-nutella", category: "sweets", caption: "Znoud, finished in syrup" },
  { image: "in-store-counter", category: "in-store", caption: "Rows along the counter" },
  { image: "ashta-mix-plate", category: "platters", caption: "An ashta mix, ready to go out" },
  { image: "fatayer-ashta", category: "platters", caption: "Pastries plated on a serving tray" },
];
