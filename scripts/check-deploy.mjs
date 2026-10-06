// Canlıya yalnızca güncel ve temiz `main` gider. Uzun süren dallardaki
// (ör. mobil-web) yarım iş yanlışlıkla deploy edilmesin diye her deploy'dan
// önce çalışır: npm deploy:* komutlarında ve firebase.json predeploy'unda.
//
// Önizleme kanalı (DEPLOY_TARGET=preview, `npm run deploy:preview`): canlıyı
// etkilemediği için herhangi bir daldan yapılabilir; yine de çalışma alanı temiz
// ve dal GitHub'a gönderilmiş olmalı (önizlemede ne olduğu her zaman bilinsin).
import { execSync } from "node:child_process";

const git = (cmd) => execSync(`git ${cmd}`, { encoding: "utf8" }).trim();
const fail = (msg) => {
  console.error(`\n✖ Deploy durduruldu: ${msg}\n`);
  process.exit(1);
};

const preview = process.env.DEPLOY_TARGET === "preview";
const branch = git("rev-parse --abbrev-ref HEAD");
if (!preview && branch !== "main") {
  fail(`aktif dal "${branch}". Canlıya yalnızca main deploy edilir (önizleme için: npm run deploy:preview).`);
}

if (git("status --porcelain")) fail("commitlenmemiş değişiklik var. Yalnızca commitlenmiş kod deploy edilir.");

try {
  git(`fetch --quiet origin ${branch}`);
} catch {
  fail(`origin/${branch} alınamadı (internet ya da dal gönderilmemiş). Güncel olduğundan emin olmadan deploy edilmez.`);
}
const local = git("rev-parse HEAD");
const remote = git(`rev-parse origin/${branch}`);
if (local !== remote) fail(`yerel ${branch}, origin/${branch} ile aynı değil (git push / git pull eksik).`);

console.log(
  preview
    ? `✔ Önizleme kontrolü: ${branch} ${local.slice(0, 7)} temiz ve GitHub'da.`
    : `✔ Deploy kontrolü: main ${local.slice(0, 7)} temiz ve güncel.`
);
