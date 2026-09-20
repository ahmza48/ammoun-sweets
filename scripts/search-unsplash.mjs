import fs from "node:fs";
const queries = ["baklava","kunafa","knafeh","arabic sweets","middle eastern dessert","pistachio dessert","turkish baklava pistachio","maamoul","lebanese sweets","pastry shop display case","dessert platter","pistachio nuts","turkish delight","bakery interior warm","gift box sweets","arabic coffee dessert","phyllo pastry","semolina cake","syrup pastry","sweet shop counter"];
const out = [];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
for (const q of queries) {
  const r = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(q)}&per_page=12`, { headers: { Accept: "application/json" } });
  const j = await r.json();
  for (const p of j.results ?? []) {
    out.push({ q, id: p.id, w: p.width, h: p.height,
      alt: p.alt_description || p.description || "",
      user: p.user?.name, username: p.user?.username,
      link: `https://unsplash.com/photos/${p.id}`,
      raw: p.urls?.raw, thumb: p.urls?.small });
  }
  await sleep(600);
}
const uniq = [...new Map(out.map(o => [o.id, o])).values()];
fs.writeFileSync("scripts/unsplash.json", JSON.stringify(uniq, null, 1));
console.log("unique:", uniq.length);
console.log(uniq.map((o, i) => `${i}\t${o.q}\t${o.id}\t${o.w}x${o.h}\t${o.alt.slice(0,70)}`).join("\n"));
