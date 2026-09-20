import fs from "node:fs";
import path from "node:path";

/**
 * Downloads the DEMO placeholder photography set.
 * Every image here is a free-licence Unsplash photo standing in for real
 * Ammoun Sweets photography. Replace the files in /public/images with the
 * owner's own photos (same filenames) and nothing else needs to change.
 */
const PICKS = [
  ["hero-pistachio-baklava",        "bF9lNWhx5js", "Trays of pistachio-topped Lebanese baklava fingers", 2400],
  ["baklava-mix",                   "PVL6nXxver0", "Rows of glossy baklava topped with crushed pistachio", 1600],
  ["pistachio-mix",                 "OEDeQheVySQ", "Layered pastries generously filled with pistachio", 1600],
  ["halawet-el-jeben",              "C_thMasRqGI", "Soft rolls coated in pistachio and piped with ashta cream", 1600],
  ["knafeh-ashta",                  "d-8fqEUZ7Eg", "Golden knafeh with a soft cream centre", 1600],
  ["mafroukeh",                     "xoeTLUi_XyA", "Semolina and pistachio slice topped with cream", 1600],
  ["ashta-mix-plate",               "zNwEeU0AOaM", "A mixed tray of cream-filled and pistachio sweets", 1600],
  ["barma-pistachio",               "NzNFM69MMnI", "Shredded pastry nest filled with pistachio", 1600],
  ["halawet-el-shmayse",            "WEPYQ0MwzAk", "Small shredded-pastry sweet topped with pistachio", 1600],
  ["balouryeh",                     "2i6PoFKsx4A", "Fine layered pastry fanned around a pistachio centre", 1600],
  ["namoura",                       "oyVe1GRV7K8", "Semolina cake glazed with syrup and topped with almonds", 1600],
  ["basbousa",                      "y3TaDsK0eDo", "Syrup-soaked semolina squares", 1600],
  ["maamoul-mad-ashta",             "MC63Y6DG7wU", "Layered pastry rolls topped with nuts", 1600],
  ["znoud-nutella",                 "YjBkmZACDKE", "Crisp pastry rolls arranged on a silver tray", 1600],
  ["fatayer-ashta",                 "4eFIakLLpd4", "Golden pastry parcels on a serving tray", 1600],
  ["wared-el-sham",                 "kaIrUDYVv7g", "Cream-filled pastry dusted with pistachio", 1600],
  ["baklava-slice",                 "my6bT4upQqg", "A single slice of layered pistachio baklava", 1600],
  ["mixed-platter",                 "pznb7gyc3kg", "An assorted sweets box served with crushed pistachio", 1600],
  ["gift-tins",                     "lqd04yzJrYo", "Gift tins packed with an assortment of sweets", 1600],
  ["gift-box-rolls",                "19Jxxi8bO2Y", "A gift box of pastry rolls in syrup", 1600],
  ["display-counter",               "W_m9_h_bShI", "Trays of assorted sweets laid out in the display counter", 2000],
  ["in-store-display",              "ivQimwNATO0", "A display of pistachio-topped sweets ready to serve", 2000],
  ["in-store-serving",              "ocN9ANFB3gY", "Sweets being selected and plated for a customer", 1600],
  ["in-store-counter",              "hZesFurZUIw", "Rows of rolled sweets on the shop counter", 1600],
  ["craft-pistachio",               "Dw7L71hgaFg", "Pistachio being scattered over pastry by hand", 2000],
  ["sharing-tray",                  "z6LRcWD4wsk", "A tray of sweets being offered and shared", 2000],
  ["celebration-table",             "qfbS3xmZ59o", "Pastries plated for a celebration table", 2000],
  ["eid-sweets",                    "VdIx-tKiIQg", "Traditional sweets laid out beside a candle for a celebration", 1600],
  ["market-spread",                 "M6wdKdeAYAM", "A generous spread of Middle Eastern pastries", 1600],
  ["pistachio-texture",             "bLV15ZhR-YU", "Whole and ground pistachios", 1600],
  ["baklava-trays",                 "79bTAnmPF-Y", "Freshly baked baklava cooling on trays", 1600],
  ["baklava-rows",                  "OOv-PmJwbNI", "Rows of syrup-glazed pastry rolls", 1600],
];

const all = JSON.parse(fs.readFileSync("scripts/unsplash.json", "utf8"));
const byId = new Map(all.map((o) => [o.id, o]));
const outDir = "public/images";
fs.mkdirSync(outDir, { recursive: true });

const manifest = [];
for (const [slug, id, alt, width] of PICKS) {
  const src = byId.get(id);
  if (!src) { console.error("MISSING", slug, id); continue; }
  const url = `${src.raw}&w=${width}&q=78&fm=jpg&fit=max`;
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  fs.writeFileSync(path.join(outDir, `${slug}.jpg`), buf);

  // tiny blurred LQIP used as blurDataURL to avoid layout flash
  const tiny = Buffer.from(await (await fetch(`${src.raw}&w=16&q=40&fm=jpg&fit=max&blur=40`)).arrayBuffer());
  manifest.push({
    slug, alt,
    file: `/images/${slug}.jpg`,
    blurDataURL: `data:image/jpeg;base64,${tiny.toString("base64")}`,
    credit: { photographer: src.user, username: src.username, source: "Unsplash", url: src.link },
  });
  console.log(slug, (buf.length / 1024).toFixed(0) + "kb");
}
fs.writeFileSync("scripts/images.manifest.json", JSON.stringify(manifest, null, 2));
console.log("wrote", manifest.length);
