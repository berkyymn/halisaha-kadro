// Canlıya yalnızca güncel ve temiz `main` gider. Uzun süren dallardaki
// (ör. mobil-web) yarım iş yanlışlıkla deploy edilmesin diye her deploy'dan
// önce çalışır: npm deploy:* komutlarında ve firebase.json predeploy'unda.
import { execSync } from "node:child_process";

const git = (cmd) => execSync(`git ${cmd}`, { encoding: "utf8" }).trim();
const fail = (msg) => {
  console.error(`\n✖ Deploy durduruldu: ${msg}\n`);
  process.exit(1);
};

const branch = git("rev-parse --abbrev-ref HEAD");
if (branch !== "main") fail(`aktif dal "${branch}". Yalnızca main deploy edilir (git checkout main).`);

if (git("status --porcelain")) fail("commitlenmemiş değişiklik var. Canlıya yalnızca commitlenmiş kod gider.");

try {
  git("fetch --quiet origin main");
} catch {
  fail("origin/main alınamadı (internet?). Güncel olduğundan emin olmadan deploy edilmez.");
}
const local = git("rev-parse HEAD");
const remote = git("rev-parse origin/main");
if (local !== remote) fail("yerel main, origin/main ile aynı değil (git pull / PR birleştirme eksik).");

console.log(`✔ Deploy kontrolü: main ${local.slice(0, 7)} temiz ve güncel.`);
