import type { ImageKey } from "./images";

/**
 * THE MENU — the only place menu content lives.
 *
 * Items and prices here are transcribed from Ammoun Sweets' public online
 * ordering listings. Prices on delivery platforms usually carry a platform
 * margin and change without notice, so the site renders them as a guide with
 * a disclaimer rather than as a promise.
 *
 * To update: edit this file only. Adding a category or an item needs no code
 * changes — the menu page, the home page preview and the search-engine
 * structured data all read from here.
 */

export type MenuItem = {
  id: string;
  name: string;
  /** Arabic spelling, shown as a subtle subtitle where we have it. */
  alsoKnownAs?: string;
  description: string;
  /** Sold-by unit, e.g. "Half kg" or "6 pieces". */
  size?: string;
  /** AUD. `null` renders as "Ask in store" — never invent a number. */
  price: number | null;
  image: ImageKey;
  /** Surfaces on the home page "Our Signature Sweets" section. */
  featured?: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  tagline: string;
  image: ImageKey;
  items: MenuItem[];
};

export const priceDisclaimer =
  "Prices are a guide taken from our online ordering listing and can change. In-store prices, platter sizes and seasonal items are confirmed at the counter.";

export const menu: MenuCategory[] = [
  {
    id: "signature",
    name: "Signature Favourites",
    tagline: "The plates our regulars come back for.",
    image: "ashta-mix-plate",
    items: [
      {
        id: "ashta-mix-plate",
        name: "Ashta Mix Plate",
        description:
          "A mixed selection of cream-filled pastries and sweets, finished with syrup and crushed pistachio.",
        size: "Half kg",
        price: 30,
        image: "ashta-mix-plate",
        featured: true,
      },
      {
        id: "halawet-el-jeben",
        name: "Halawet El Jeben",
        alsoKnownAs: "حلاوة الجبن",
        description:
          "Soft semolina-and-cheese rolls filled with fragrant ashta, scattered with pistachio.",
        size: "Half kg",
        price: 26,
        image: "halawet-el-jeben",
        featured: true,
      },
      {
        id: "mafroukeh",
        name: "Mafroukeh",
        alsoKnownAs: "مفروكة",
        description:
          "Rich semolina and pistachio dessert layered with a generous creamy filling.",
        size: "Half kg",
        price: 26,
        image: "mafroukeh",
        featured: true,
      },
      {
        id: "knafeh-ashta",
        name: "Knafeh Ashta",
        alsoKnownAs: "كنافة بالقشطة",
        description:
          "Classic knafeh pastry baked golden and layered with rich, creamy ashta.",
        size: "Half kg",
        price: 26,
        image: "knafeh-ashta",
        featured: true,
      },
    ],
  },
  {
    id: "baklava-pistachio",
    name: "Baklava & Pistachio",
    tagline: "Thin layers, slow syrup, and a lot of pistachio.",
    image: "baklava-mix",
    items: [
      {
        id: "baklava-mix",
        name: "Baklava Mix",
        alsoKnownAs: "بقلاوة",
        description:
          "An assortment of crisp layered pastries with nuts and syrup — the easiest way to try a bit of everything.",
        size: "Half kg",
        price: 30,
        image: "baklava-mix",
        featured: true,
      },
      {
        id: "pistachio-mix",
        name: "Pistachio Mix",
        description:
          "A premium assortment built around our richest pistachio-filled favourites.",
        size: "Half kg",
        price: 36,
        image: "pistachio-mix",
        featured: true,
      },
      {
        id: "barma-pistachio",
        name: "Barma Pistachio",
        description:
          "Fine shredded pastry wrapped around whole pistachios and soaked in syrup.",
        size: "Half kg",
        price: null,
        image: "barma-pistachio",
      },
      {
        id: "balouryeh",
        name: "Balouryeh",
        description:
          "Delicate strands of pastry pressed around a pistachio centre and cut into fingers.",
        size: "Half kg",
        price: null,
        image: "balouryeh",
      },
    ],
  },
  {
    id: "traditional",
    name: "Traditional Lebanese Sweets",
    tagline: "The everyday classics, made the way they should be.",
    image: "namoura",
    items: [
      {
        id: "namoura",
        name: "Namoura",
        alsoKnownAs: "نمورة",
        description:
          "Golden semolina cake soaked in syrup and finished with almonds.",
        size: "Half kg",
        price: 22,
        image: "namoura",
      },
      {
        id: "maamoul-mad-ashta",
        name: "Maamoul Mad Ashta",
        alsoKnownAs: "معمول مد بالقشطة",
        description:
          "Pressed semolina pastry layered with ashta cream and cut into squares.",
        size: "Half kg",
        price: 25,
        image: "maamoul-mad-ashta",
      },
      {
        id: "basbousa-pistachio",
        name: "Basbousa Pistachio",
        description: "Syrup-soaked semolina slice topped with pistachio.",
        size: "Half kg",
        price: null,
        image: "basbousa",
      },
      {
        id: "basbousa-cashew",
        name: "Basbousa Cashew",
        description: "The same tender semolina slice, finished with cashews.",
        size: "Half kg",
        price: null,
        image: "basbousa",
      },
      {
        id: "mad-joz",
        name: "Mad Joz",
        description: "Layered semolina pastry with a walnut filling.",
        size: "Half kg",
        price: null,
        image: "maamoul-mad-ashta",
      },
    ],
  },
  {
    id: "ashta-cream",
    name: "Ashta & Cream Sweets",
    tagline: "Everything built around thick, fragrant ashta.",
    image: "wared-el-sham",
    items: [
      {
        id: "wared-el-sham",
        name: "Wared El Sham",
        alsoKnownAs: "ورد الشام",
        description:
          "Crisp pastry shells filled with ashta and dusted with pistachio.",
        size: "Pieces",
        price: null,
        image: "wared-el-sham",
      },
      {
        id: "fatayer-ashta",
        name: "Fatayer Ashtah",
        description: "Golden pastry parcels folded around a soft ashta filling.",
        size: "Pieces",
        price: null,
        image: "fatayer-ashta",
      },
      {
        id: "fatayer-joz",
        name: "Fatayer Joz",
        description: "The same golden parcels, filled with spiced walnut.",
        size: "Pieces",
        price: null,
        image: "fatayer-ashta",
      },
      {
        id: "halawet-el-shmayse",
        name: "Halawet El Shmayse",
        description:
          "Delicate pastry rounds filled with cream and finished with pistachio.",
        size: "Half kg",
        price: null,
        image: "halawet-el-shmayse",
      },
      {
        id: "shamiyeh",
        name: "Shamiyeh / Halawet El Jeben Roll",
        description:
          "Halawet el jeben rolled long, sliced, and topped with pistachio.",
        size: "Half kg",
        price: null,
        image: "halawet-el-jeben",
      },
    ],
  },
  {
    id: "contemporary",
    name: "Contemporary Favourites",
    tagline: "Traditional technique, a more modern filling.",
    image: "znoud-nutella",
    items: [
      {
        id: "znoud-nutella",
        name: "Znoud Nutella",
        alsoKnownAs: "Znoud El Sit",
        description:
          "Crisp fried pastry rolls filled with Nutella and finished in syrup.",
        size: "6 pieces",
        price: 26,
        image: "znoud-nutella",
      },
    ],
  },
];

/** Flattened list — used for structured data and cross-page lookups. */
export const allMenuItems: MenuItem[] = menu.flatMap((c) => c.items);

export const featuredItems: MenuItem[] = allMenuItems.filter((i) => i.featured);

const audFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 0,
});

export function formatPrice(price: number | null): string {
  return price === null ? "Ask in store" : audFormatter.format(price);
}
