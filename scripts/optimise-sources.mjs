import fs from "node:fs";

/**
 * Caps the source files at a sensible size.
 *
 * next/image resizes and re-encodes on request, so the originals only need to
 * be big enough for the largest rendered size (roughly 1600px on the long edge
 * at 2x DPR for our layouts). Anything bigger just slows the build and the
 * first optimisation pass.
 */
const MAX_LONG_EDGE = 1600;
const TARGET_KB = 420;

function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m))
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error("no SOF");
}

const all = JSON.parse(fs.readFileSync("scripts/unsplash.json", "utf8"));
const byLink = new Map(all.map((o) => [o.link, o]));
const manifest = JSON.parse(fs.readFileSync("scripts/images.manifest.json", "utf8"));

// The hero is the LCP image and is rendered largest — give it more headroom.
const HERO = "hero-pistachio-baklava";

for (const entry of manifest) {
  const path = `public${entry.file}`;
  const currentKb = fs.statSync(path).size / 1024;
  const longEdge = Math.max(entry.width, entry.height);
  const maxEdge = entry.slug === HERO ? 1900 : MAX_LONG_EDGE;
  const budget = entry.slug === HERO ? 520 : TARGET_KB;

  if (currentKb <= budget && longEdge <= maxEdge) continue;

  const src = byLink.get(entry.credit.url);
  if (!src) { console.warn("no source for", entry.slug); continue; }

  const portrait = entry.height > entry.width;
  const dimension = portrait ? `h=${maxEdge}` : `w=${maxEdge}`;

  let quality = 76;
  let buf;
  do {
    buf = Buffer.from(
      await (await fetch(`${src.raw}&${dimension}&q=${quality}&fm=jpg&fit=max`)).arrayBuffer(),
    );
    quality -= 8;
  } while (buf.length / 1024 > budget && quality >= 52);

  fs.writeFileSync(path, buf);
  Object.assign(entry, jpegSize(buf));
  console.log(
    `${entry.slug}: ${currentKb.toFixed(0)}kb -> ${(buf.length / 1024).toFixed(0)}kb  ${entry.width}x${entry.height}`,
  );
}

fs.writeFileSync("scripts/images.manifest.json", JSON.stringify(manifest, null, 2));
const total = manifest.reduce((a, e) => a + fs.statSync(`public${e.file}`).size, 0);
console.log(`total ${(total / 1024 / 1024).toFixed(1)}MB across ${manifest.length} images`);
