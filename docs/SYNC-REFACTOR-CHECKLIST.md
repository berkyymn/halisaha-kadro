# Sync Refactor Regression Checklist

Her cloud-sync refactor phase'i sonrası bu maddelerin tamamını manuel test et.
**Amaç:** Phase'ler arası sync regresyonu yakalamak.

**Referans belgeler:**
- `docs/IMPLEMENTATION.md` §11 (Cloud sync), §5.4 (Sync revisions), §5.5 (Firestore doc)
- `docs/QA-CHECKLIST.md` §7b (Logo kalıcılığı), §11 (Bulut sync stabilitesi)
- `docs/TODO.md` Phase 22 (Sync baseline fix)

> Gereksinim: Firebase yapılandırılmış ortam, giriş yapmış kullanıcı.
> Guest/offline maddeleri hariç tüm testler kimlik doğrulamalı çalıştırılır.

---

## §S1 — No-op açılış idle kalır (STARTUP INVARIANT)

**Korunan invariant:** `applyCloudRow` her zaman `markSynced` çağırır; `pendingRepush` sadece `localTime > cloudTime` ise `true` olur.
**İlgili fix:** Phase 22 (TODO.md),  `AuthContext.applyCloudRow:181-188`

| # | Adım | Beklenen |
|---|------|----------|
| 1 | Uygulamayı aç, giriş yap | Yükleniyor ekranı → poster görünür |
| 2 | **Hiçbir şeye dokunma**, sadece toolbar'ı izle | Sync indikatörü görünmez (ne "Kaydediliyor..." ne "Buluta kaydediliyor...") |
| 3 | 10 sn bekle | Sync indikatörü halen görünmez |
| 4 | Sekmeyi yenile (F5) | Aynı — idle kalır |

- [ ] Geçti

---

## §S2 — Veri değişikliği sync akışı

**Korunan invariant:** Store `set()` → `syncRevisions` bump → `hasUnsyncedRevisions` → `markDirty` → debounce (8s) → flush → `lastSyncedRevisions` güncellenir → idle.

| # | Adım | Beklenen |
|---|------|----------|
| 1 | Bir oyuncunun adını değiştir, kaydet | Araç çubuğunda ~2-3 sn içinde "Kaydediliyor..." belirir |
| 2 | 8-10 sn bekle | "Buluta kaydediliyor..." → indikatör kaybolur (idle) |
| 3 | Sayfayı yenile | Değişiklik korunur, açılış idle |

- [ ] Geçti

---

## §S3 — Branding-only değişiklik akışı

**Korunan invariant:** Branding-only dirty → `saveUserBranding` (priority queue, ~5KB) → data yazılmaz. `lastSyncedRevisions.branding` güncellenir, diğer domain'ler değişmez.

| # | Adım | Beklenen |
|---|------|----------|
| 1 | Bir takımın logosunu değiştir (başka hiçbir şeye dokunma) | Logo güncellenir |
| 2 | 5-8 sn bekle | Sync indikatörü akışı: pending → syncing → idle |
| 3 | Sayfayı yenile | Logo korunur, açılış idle |
| 4 | Firestore console'dan kontrol et | `branding` alanı güncellenmiş, `updatedAt` (data) değişmemiş olmalı |

- [ ] Geçti

---

## §S4 — Medya/fotoğraf sync akışı

**Korunan invariant:** Fotoğraf ekleme `media` revision'ını bump eder → `saveUserPoster` → `uploadPlayerMediaForCloud` (Storage'a data URL) → `slimSnapshotForCloud` (Storage path'li). Sayfa yenilemede `hydratePlayerPhotosFromStorage` çalışır.

| # | Adım | Beklenen |
|---|------|----------|
| 1 | Bir oyuncuya fotoğraf ekle (tercihen arka plan kaldır) | Fotoğraf posterde görünür |
| 2 | 10 sn bekle | Sync akışı tamamlanır → idle |
| 3 | Sayfayı yenile | Fotoğraf korunur (Storage'dan download URL çözülür) |
| 4 | Açılış sonrası sync indikatörü | idle |

- [ ] Geçti

---

## §S5 — Kayıt sonrası yeniden açılış idle

**Korunan invariant:** Başarılı bir save sonrası `lastSyncedRevisions` günceldir. Yeniden açılışta `lastSyncedRevisions === store.syncRevisions` → `hasPendingSync() = false` → idle.

| # | Adım | Beklenen |
|---|------|----------|
| 1 | Herhangi bir değişiklik yap (isim, logo, tema fark etmez) | Sync tamamlanır → idle |
| 2 | Sayfayı yenile | Açılış: loading → poster → **idle** (indikatör yok) |
| 3 | Tarayıcıyı tamamen kapat, yeniden aç | Aynı — idle |

- [ ] Geçti

---

## §S6 — Multi-tab / foreign update

**Korunan invariant:** BroadcastChannel `halisaha-poster-sync` üzerinden diğer sekmeler haberdar edilir. `lastRemoteUpdatedAt` karşılaştırması ile stale detection.

| # | Adım | Beklenen |
|---|------|----------|
| 1 | A sekmesi: aç, giriş yap, idle'ı bekle | idle |
| 2 | B sekmesi: aynı kullanıcıyla aç | idle |
| 3 | A'da oyuncu adı değiştir, sync'in bitmesini bekle | A: pending → syncing → idle |
| 4 | B sekmesine geç | B: kısa süreliğine senkronizasyon olur, sonra idle. Değişiklik B'de de görünür |
| 5 | Her iki sekmede de son durum idle | idle |

- [ ] Geçti

---

## §S7 — Oturum kapat / kullanıcı değiştir

**Korunan invariant:** Sign-out → `resetCloudSyncState()` → `lastSyncedRevisions = null`, `dirty = false`, queue reset. Yeni kullanıcı girişi → temiz state.

| # | Adım | Beklenen |
|---|------|----------|
| 1 | Giriş yapmışken çıkış yap | Sync indikatörü kaybolur |
| 2 | Farklı bir kullanıcıyla giriş yap | O kullanıcının verisi yüklenir |
| 3 | Açılışta idle | idle (indikatör yok) |

- [ ] Geçti

---

## §S8 — Guest / Firebase yapılandırılmamış

**Korunan invariant:** Firebase env değişkenleri yoksa veya kullanıcı giriş yapmamışsa, cloudSyncManager `enabled = false` → `stop()` → hiçbir sync aktivitesi olmaz.

| # | Adım | Beklenen |
|---|------|----------|
| 1 | `.env.local`'den Firebase değişkenlerini geçici kaldır, uygulamayı aç | Poster yüklenir, sync indikatörü yok |
| 2 | Değişiklik yap, sayfayı yenile | localStorage persist çalışır, değişiklik korunur |
| 3 | Firebase değişkenlerini geri ekle, giriş yap | Normal sync çalışır |

- [ ] Geçti

---

## §S9 — Rate-limit / cooldown

**Korunan invariant:** `resource-exhausted` → `notifyFirestoreWriteExhausted()` → 120s cooldown. `getStatus()` → phase: `"cooldown"`. Timer sonrası otomatik retry.

| # | Adım | Beklenen |
|---|------|----------|
| 1 | Hızlıca ardışık 5-6 değişiklik yap (isim, logo, tema) | İlk birkaçı normal syncler |
| 2 | Rate limit tetiklenirse | Araç çubuğu: "Bulut dinleniyor" |
| 3 | 2 dakika bekle (veya test için daha kısa süre) | Otomatik olarak tekrar dener → idle |

> Not: Rate limit'i manuel tetiklemek zor olabilir. Test ortamında Firestore kotasına bağlı. Tetiklenmezse "uygulanamadı" işaretle, geçti say.

- [ ] Geçti

---

## §S10 — Araç çubuğu sync etiketleri

**Korunan invariant:** `PosterToolbar.cloudSyncLabel` doğru fazı gösterir. Gereksiz etiket gösterilmez.

| Faz | Beklenen etiket | Ne zaman |
|-----|----------------|----------|
| `idle` | *(hiçbir şey)* | Açılış sonrası, sync tamamlanınca |
| `pending` | "Kaydediliyor..." | Değişiklik yapıldı, debounce bekliyor |
| `syncing` | "Buluta kaydediliyor..." | Aktif flush sırasında |
| `cooldown` | "Bulut dinleniyor" | Rate limit sonrası |
| `paused` | "Senkron beklemede" | Remote hydrate sırasında (genelde görünmez, hızlı) |

| # | Adım | Beklenen |
|---|------|----------|
| 1 | Açılış idle | Etiket yok |
| 2 | Değişiklik yap | "Kaydediliyor..." → "Buluta kaydediliyor..." → kaybolur |
| 3 | Tüm akış tamamlandı | Etiket yok |

- [ ] Geçti

---

## Otomatik kontroller (her phase sonrası)

```bash
npm run build
npm run lint
```

- [ ] Build geçti
- [ ] Lint geçti (0 error, sadece önceden var olan warning'ler)

---

## Hızlı test sırası (5 dakika)

1. **Aç-kontrol**: Uygulamayı aç, 5 sn bekle → idle ✓ (§S1)
2. **Değiştir-bekle**: İsim değiştir → "Kaydediliyor..." → "Buluta kaydediliyor..." → idle ✓ (§S2)
3. **Logo-bekle**: Logo değiştir → sync → idle ✓ (§S3)
4. **Yenile**: Sayfayı yenile → idle ✓ (§S5)
5. **Çık-gir**: Çıkış yap, tekrar giriş → idle ✓ (§S7)

---

## Değişiklik günlüğü

| Tarih | Phase | Test edilen maddeler | Sonuç |
|-------|-------|----------------------|-------|
| 2026-07-14 | — | İlk sürüm (Phase 0) | — |
