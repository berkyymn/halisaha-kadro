// Firestore/Storage güvenlik kuralları duman testi (yalnızca emülatöre karşı).
// Kullanım: npm run emulators (ayrı terminal) → node scripts/rules-smoke.mjs
const PROJECT = "hali-saha-kadro-97082";
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const ST = `http://127.0.0.1:9199/v0/b/${PROJECT}.firebasestorage.app/o`;

// Emülatör imzasız (alg: none) kimlik belirteçlerini kabul eder.
function token(uid) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: "none", typ: "JWT" })}.${b64({
    iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, sub: uid, user_id: uid,
    iat: now, exp: now + 3600, auth_time: now, firebase: { sign_in_provider: "password" },
  })}.`;
}

const str = (v) => ({ stringValue: v });
const int = (v) => ({ integerValue: String(v) });
const list = (n) => ({ arrayValue: { values: Array.from({ length: n }, (_, i) => str(`b${i}`)) } });
const players = (n) => ({ mapValue: { fields: Object.fromEntries(Array.from({ length: n }, (_, i) => [`p${i}`, { mapValue: { fields: { name: str(`P${i}`) } } }])) } });

function doc({ revision, bench = 0, saved = 2 }) {
  return { fields: {
    data: { mapValue: { fields: { benchPlayerIds: list(bench), savedPlayers: players(saved) } } },
    updatedAt: str(new Date().toISOString()),
    revision: int(revision),
  } };
}

async function write(uid, target, body) {
  const res = await fetch(`${FS}/posters/${target}`, {
    method: "PATCH", headers: { Authorization: `Bearer ${token(uid)}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.status;
}

async function upload(uid, path, bytes, type) {
  const res = await fetch(`${ST}?name=${encodeURIComponent(path)}`, {
    method: "POST", headers: { Authorization: `Bearer ${token(uid)}`, "Content-Type": type },
    body: Buffer.alloc(bytes),
  });
  return res.status;
}

const uid = `smoke-${Date.now()}`;
const cases = [
  ["ilk kayıt (revision 1)", () => write(uid, uid, doc({ revision: 1 })), 200],
  ["revision atlama (3)", () => write(uid, uid, doc({ revision: 3 })), 403],
  ["sıradaki revision (2)", () => write(uid, uid, doc({ revision: 2 })), 200],
  ["41 yedek", () => write(uid, uid, doc({ revision: 3, bench: 41 })), 403],
  ["61 kayıtlı oyuncu", () => write(uid, uid, doc({ revision: 3, saved: 61 })), 403],
  ["20 yedek / 36 oyuncu", () => write(uid, uid, doc({ revision: 3, bench: 20, saved: 36 })), 200],
  ["başka kullanıcının dokümanı", () => write(uid, "baska-kullanici", doc({ revision: 1 })), 403],
  ["300 KB fotoğraf", () => upload(uid, `users/${uid}/players/x/cutout.webp`, 300_000, "image/webp"), 200],
  ["2 MB fotoğraf", () => upload(uid, `users/${uid}/players/x/cutout.webp`, 2_000_000, "image/webp"), 403],
  ["izinsiz dosya adı", () => upload(uid, `users/${uid}/players/x/evil.exe`, 1000, "image/webp"), 403],
  ["başkasının klasörü", () => upload(uid, `users/baska/players/x/cutout.webp`, 1000, "image/webp"), 403],
];

let failed = 0;
for (const [name, run, expected] of cases) {
  const status = await run();
  const ok = status === expected;
  if (!ok) failed += 1;
  console.log(`${ok ? "✅" : "❌"} ${name}: ${status} (beklenen ${expected})`);
}
process.exit(failed ? 1 : 0);
