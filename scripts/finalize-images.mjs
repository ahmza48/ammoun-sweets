import fs from "node:fs";

/** Reads intrinsic dimensions straight out of the JPEG SOF marker. */
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

for (const entry of manifest) {
  const file = fs.readFileSync(`public${entry.file}`);
  Object.assign(entry, jpegSize(file));
  const src = [...byId.values()].find((o) => o.link === entry.credit.url);
  const tiny = Buffer.from(
    await (await fetch(`${src.raw}&w=16&h=11&fit=crop&q=20&fm=jpg&auto=compress`)).arrayBuffer(),
  );
  entry.blurDataURL = `data:image/jpeg;base64,${tiny.toString("base64")}`;
}
fs.writeFileSync("scripts/images.manifest.json", JSON.stringify(manifest, null, 2));
console.log("blur avg", Math.round(manifest.reduce((a, e) => a + e.blurDataURL.length, 0) / manifest.length));
console.log(manifest.map((m) => `${m.slug} ${m.width}x${m.height}`).join("\n"));
