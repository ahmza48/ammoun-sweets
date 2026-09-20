import fs from "node:fs";

/** Swap out Unsplash+ (watermarked) photos for free-licence equivalents. */
const REPLACEMENTS = [
  ["hero-pistachio-baklava", "OEDeQheVySQ", "Layered pastries generously filled with pistachio", 2400],
  ["pistachio-mix",          "WelqOU5iVsM", "Rows of pistachio-dusted pastry rolls on a tray",   1800],
  ["craft-pistachio",        "YdKH9p9Jmm8", "Pastry shells being filled by hand in the kitchen", 2000],
  ["market-spread",          "45HPU1_TrZY", "A shop window packed with assorted sweets",         1800],
  ["baklava-trays",          "7olc_HBn5co", "Baklava on display behind the counter glass",       1800],
];

function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error("no SOF marker");
}

const all = JSON.parse(fs.readFileSync("scripts/unsplash.json", "utf8"));
const byId = new Map(all.map((o) => [o.id, o]));
const manifest = JSON.parse(fs.readFileSync("scripts/images.manifest.json", "utf8"));

for (const [slug, id, alt, width] of REPLACEMENTS) {
  const src = byId.get(id);
  if (!src) throw new Error(`unknown id ${id}`);
  if (src.raw.includes("plus.unsplash.com") || src.raw.includes("premium_photo")) {
    throw new Error(`${id} is still an Unsplash+ image`);
  }

  const buf = Buffer.from(await (await fetch(`${src.raw}&w=${width}&q=78&fm=jpg&fit=max`)).arrayBuffer());
  fs.writeFileSync(`public/images/${slug}.jpg`, buf);

  const tiny = Buffer.from(
    await (await fetch(`${src.raw}&w=16&h=11&fit=crop&q=20&fm=jpg&auto=compress`)).arrayBuffer(),
  );

  const entry = manifest.find((e) => e.slug === slug);
  Object.assign(entry, {
    alt,
    ...jpegSize(buf),
    blurDataURL: `data:image/jpeg;base64,${tiny.toString("base64")}`,
    credit: { photographer: src.user, username: src.username, source: "Unsplash", url: src.link },
  });
  console.log(slug, "->", id, `${entry.width}x${entry.height}`, (buf.length / 1024).toFixed(0) + "kb");
}

fs.writeFileSync("scripts/images.manifest.json", JSON.stringify(manifest, null, 2));

// Final guard: no Unsplash+ photo may remain anywhere in the set.
const byLink = new Map(all.map((o) => [o.link, o]));
const stillPremium = manifest.filter((e) => {
  const s = byLink.get(e.credit.url);
  return s && (s.raw.includes("plus.unsplash.com") || s.raw.includes("premium_photo"));
});
console.log(stillPremium.length === 0 ? "OK: no watermarked images remain" : `FAIL: ${stillPremium.map(e => e.slug)}`);
