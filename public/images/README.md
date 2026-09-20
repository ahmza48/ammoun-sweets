# Demo photography — replace before launch

Every image in this folder is a **free-licence Unsplash photo acting as a
placeholder**. None of them are photographs of Ammoun Sweets. They were picked
to match the shop's real products — pistachio baklava, knafeh, ashta sweets,
gift trays, display counters — rather than generic Western cakes, so the demo
reads correctly, but they must be swapped for the owner's own photos.

## How to replace an image

1. Save the new photo over the existing file, keeping the **same filename**
   (e.g. `public/images/knafeh-ashta.jpg`).
2. Open `src/data/images.ts` and update that entry's `width`, `height` and
   `alt` text, then delete its `credit` and `creditUrl` fields.
3. Once no entry has a `credit`, the placeholder attribution note at the
   bottom of the footer disappears on its own.

Nothing else in the codebase references image paths directly — components only
ever ask for a key from `images`.

## Recommended specs for real photos

- Landscape product shots: at least 1600px wide.
- Portrait/hero shots: at least 2000px on the long edge.
- Shoot on the real counter where possible; natural light, minimal props.
- JPEG is fine — Next.js converts to AVIF/WebP and resizes at request time.

## Current placeholder set

| File | Size | Stands in for | Placeholder credit |
| --- | --- | --- | --- |
| `hero-pistachio-baklava.jpg` | 1267x1900 | Layered pastries generously filled with pistachio | Benjamin Chambon |
| `baklava-mix.jpg` | 1067x1600 | Rows of glossy baklava topped with crushed pistachio | Shoeib Abolhassani |
| `pistachio-mix.jpg` | 1600x1076 | Rows of pistachio-dusted pastry rolls on a tray | yasara hansani |
| `halawet-el-jeben.jpg` | 1600x1067 | Soft rolls coated in pistachio and piped with ashta cream | Adam Smaali |
| `knafeh-ashta.jpg` | 1600x900 | Golden knafeh with a soft cream centre | Murat Demir |
| `mafroukeh.jpg` | 1600x1067 | Pistachio and cream dessert dusted with cocoa | Youssef Mubarak |
| `ashta-mix-plate.jpg` | 1067x1600 | A mixed tray of cream-filled and pistachio sweets | Hicham Rachidi |
| `barma-pistachio.jpg` | 1600x1067 | Shredded pastry nest filled with pistachio | Shoeib Abolhassani |
| `halawet-el-shmayse.jpg` | 1600x1067 | Small shredded-pastry sweet topped with pistachio | Shoeib Abolhassani |
| `balouryeh.jpg` | 1600x1067 | Fine layered pastry fanned around a pistachio centre | Shoeib Abolhassani |
| `namoura.jpg` | 1600x1067 | Semolina cake glazed with syrup and topped with almonds | Mohammad Fahim |
| `basbousa.jpg` | 1088x1600 | Syrup-soaked semolina squares | Raymond Petrik |
| `maamoul-mad-ashta.jpg` | 1206x1600 | Layered pastry rolls topped with nuts | Sofia Lasheva |
| `znoud-nutella.jpg` | 1600x1068 | Crisp pastry rolls arranged on a silver tray | Jonathan Borba |
| `fatayer-ashta.jpg` | 1600x1068 | Golden pastry parcels on a serving tray | Jonathan Borba |
| `wared-el-sham.jpg` | 1600x1067 | Cream-filled pastry dusted with pistachio | Shoeib Abolhassani |
| `baklava-slice.jpg` | 1600x1067 | A single slice of layered pistachio baklava | kourosh mirzaei |
| `mixed-platter.jpg` | 1600x1067 | An assorted sweets box served with crushed pistachio | Chez Le Libanais |
| `gift-tins.jpg` | 1067x1600 | Gift tins packed with an assortment of sweets | Екатерина Коробова |
| `gift-box-rolls.jpg` | 1600x1067 | A gift box of pastry rolls in syrup | engin akyurt |
| `display-counter.jpg` | 1600x1200 | Trays of assorted sweets laid out in the display counter | Maarten van den Heuvel |
| `in-store-display.jpg` | 1600x1067 | A display of pistachio-topped sweets ready to serve | Adam Smaali |
| `in-store-serving.jpg` | 1600x1067 | Sweets being selected and plated for a customer | Dharambir Pradhan |
| `in-store-counter.jpg` | 1600x1067 | Rows of rolled sweets on the shop counter | Recepcan Kazanc |
| `craft-pistachio.jpg` | 1200x1600 | Trays of pistachio-filled pastries lined up on the counter | Gamze Teoman |
| `sharing-tray.jpg` | 1067x1600 | A tray of sweets being offered and shared | Abdul Raheem Kannath |
| `celebration-table.jpg` | 1600x1068 | Pastries plated for a celebration table | Jonathan Borba |
| `eid-sweets.jpg` | 1067x1600 | Traditional sweets laid out beside a candle for a celebration | Gaurav Kumar |
| `market-spread.jpg` | 1600x1067 | A full tray of baklava fresh from the oven with syrup ladle | Çağlar Oskay |
| `pistachio-texture.jpg` | 1067x1600 | Whole and ground pistachios | Malicki M Beser |
| `baklava-trays.jpg` | 1600x1067 | Baklava on display behind the counter glass | Ian ODonnell |
| `baklava-rows.jpg` | 1600x1067 | Rows of syrup-glazed pastry rolls | Tadeusz Zachwieja |

All placeholders are used under the [Unsplash License](https://unsplash.com/license).
