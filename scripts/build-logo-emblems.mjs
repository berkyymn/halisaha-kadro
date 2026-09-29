#!/usr/bin/env node
/**
 * Logo sembollerini game-icons.net setinden (CC BY 3.0) çıkarıp
 * src/lib/logoEmblems.generated.ts dosyasına yazar. Setin tamamı birkaç MB;
 * uygulamaya yalnızca burada seçilen semboller girer.
 *
 * Sembol eklemek/değiştirmek: EMBLEMS listesini düzenle → `npm run emblems`.
 * Ad listesi: https://game-icons.net
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const set = require("@iconify-json/game-icons/icons.json");

/** [uygulama kimliği, game-icons adı, Türkçe etiket] — sıra seçicideki sıradır */
const EMBLEMS = [
  ["eagle", "eagle-emblem", "Kartal"],
  ["falcon", "eagle-head", "Şahin"],
  ["lion", "lion", "Aslan"],
  ["tiger", "tiger-head", "Kaplan"],
  ["wolf", "wolf-head", "Kurt"],
  ["bear", "bear-head", "Ayı"],
  ["bull", "bull", "Boğa"],
  ["horse", "horse-head", "At"],
  ["fox", "fox-head", "Tilki"],
  ["shark", "shark-jaws", "Köpekbalığı"],
  ["crocodile", "croc-jaws", "Timsah"],
  ["snake", "snake", "Yılan"],
  ["scorpion", "scorpion", "Akrep"],
  ["dragon", "dragon-head", "Ejderha"],
  ["spartan", "spartan-helmet", "Spartalı"],
  ["sword", "crossed-swords", "Kılıçlar"],
  ["skull", "crowned-skull", "Kurukafa"],
  ["crown", "crenel-crown", "Taç"],
  ["laurel", "laurel-crown", "Defne tacı"],
  ["castle", "castle", "Kale"],
  ["anchor", "anchor", "Çapa"],
  ["shield", "bordered-shield", "Kalkan"],
  ["wings", "feathered-wing", "Kanat"],
  ["star", "round-star", "Yıldız"],
  ["lightning", "focused-lightning", "Şimşek"],
  ["flame", "flame", "Alev"],
  ["trophy", "trophy-cup", "Kupa"],
  ["ball", "soccer-ball", "Top"],
];

const size = set.width ?? 512;
const entries = EMBLEMS.map(([id, name, label]) => {
  const icon = set.icons[name];
  if (!icon) throw new Error(`game-icons içinde yok: ${name}`);
  const paths = [...icon.body.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
  if (paths.length === 0) throw new Error(`yol bulunamadı: ${name}`);
  return { id, name, label, paths };
});

const out = `// OTOMATİK ÜRETİLDİ — elle düzenleme; scripts/build-logo-emblems.mjs → \`npm run emblems\`
//
// Semboller: game-icons.net (Lorc, Delapouite ve katkıcılar), CC BY 3.0
// https://game-icons.net — https://creativecommons.org/licenses/by/3.0/
// Atıf: /gizlilik sayfasındaki "Kullanılan içerikler" bölümü.

export const EMBLEM_VIEWBOX = ${size};

export type EmblemId =
${entries.map((e) => `  | "${e.id}"`).join("\n")};

export const EMBLEMS: { id: EmblemId; label: string; source: string; paths: string[] }[] = [
${entries
  .map(
    (e) =>
      `  { id: "${e.id}", label: "${e.label}", source: "${e.name}", paths: ${JSON.stringify(e.paths)} },`
  )
  .join("\n")}
];
`;

const target = new URL("../src/lib/logoEmblems.generated.ts", import.meta.url);
const previous = (() => {
  try {
    return readFileSync(target, "utf8");
  } catch {
    return "";
  }
})();
writeFileSync(target, out);
console.log(
  `${entries.length} sembol yazıldı (${(out.length / 1024).toFixed(1)} KB)${previous === out ? ", değişiklik yok" : ""}`
);
