import fs from "node:fs";
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
const [slug, id, alt, width] = [process.argv[2], process.argv[3], process.argv[4], Number(process.argv[5] || 1600)];
const all = JSON.parse(fs.readFileSync("scripts/unsplash.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("scripts/images.manifest.json", "utf8"));
const src = all.find((o) => o.id === id);
if (src.raw.includes("premium_photo") || src.raw.includes("plus.unsplash.com")) throw new Error("premium");
const buf = Buffer.from(await (await fetch(`${src.raw}&w=${width}&q=78&fm=jpg&fit=max`)).arrayBuffer());
fs.writeFileSync(`public/images/${slug}.jpg`, buf);
const tiny = Buffer.from(await (await fetch(`${src.raw}&w=16&h=11&fit=crop&q=20&fm=jpg&auto=compress`)).arrayBuffer());
const e = manifest.find((x) => x.slug === slug);
Object.assign(e, { alt, ...jpegSize(buf), blurDataURL: `data:image/jpeg;base64,${tiny.toString("base64")}`,
  credit: { photographer: src.user, username: src.username, source: "Unsplash", url: src.link } });
fs.writeFileSync("scripts/images.manifest.json", JSON.stringify(manifest, null, 2));
console.log(slug, "->", id, `${e.width}x${e.height}`, (buf.length / 1024).toFixed(0) + "kb");
