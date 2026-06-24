# QA Smoke Checklist

Her kod değişikliğinden sonra **etkilenen maddeleri** işaretle ve test et.
Tam regresyon için tüm maddeleri baştan sona çalıştır.

**Nasıl kullanılır:** Değişiklik yap → ilgili satırları test et → `[x]` işaretle → `npm run build` ve `npm run lint` çalıştır.

---

## 1. Oyuncu düzenleme modalı

**Dosyalar:** `src/components/PlayerEditModal.tsx`, `src/components/AppShell.tsx`

| Adım | Beklenen |
|------|----------|
| Sahada bir oyuncuya tıkla | Modal açılır |
| İsim ve numara değiştir | Alanlar güncellenir |
| Kaydet | Modal kapanır, poster güncellenir |
| Dışarı tıklama (işlem yokken) | Modal kapanır |

- [ ] Geçti

---

## 2. Fotoğraf ekleme

**Dosyalar:** `src/components/PlayerEditModal.tsx`, `src/lib/fileToDataUrl.ts`

| Adım | Beklenen |
|------|----------|
| Oyuncu modalında "Fotoğraf ekle" | Dosya seçici açılır |
| Fotoğraf seç | **Modal açık kalır**, önizleme görünür |
| Kaydet | Posterde fotoğraf görünür |

- [ ] Geçti

---

## 3. Arka plan kaldırma

**Dosyalar:** `src/lib/backgroundRemoval.ts`, `src/components/PlayerEditModal.tsx`

| Adım | Beklenen |
|------|----------|
| Fotoğraflı oyuncuda "Arka plan kaldır" | Modal açık kalır, ilerleme metni görünür |
| İşlem bitince | Arka plansız önizleme |
| Kaydet + sayfayı yenile | Cutout **kaybolmaz** (data URL olarak saklanır) |

- [ ] Geçti

---

## 4. Tema değiştirme

**Dosyalar:** `src/components/PosterToolbar.tsx`, `src/components/StaticPosterBackground.tsx`, `src/store/useAppStore.ts`

| Adım | Beklenen |
|------|----------|
| Her tema butonuna tıkla (4 adet) | Seçili buton yeşil olur |
| Poster arka planı | Tema görseli değişir |
| Başlık renkleri | Temaya uygun renk (kırmızı/mavi/turkuaz/gri) |

Asset kontrolü: `public/posters/*.png` → tarayıcıda 404 olmamalı.

- [ ] Geçti

---

## 5. Yedek oyuncu paneli

**Dosyalar:** `src/components/BenchPanel.tsx`, `src/lib/playerPool.ts`

| Adım | Beklenen |
|------|----------|
| Sağ panel "Yedekler" görünür | Panel açık |
| "Yeni yedek" | Düzenleme modalı açılır |
| Yedek düzenle / sil | Çalışır |
| "Oyuna al" | Takım ve slot seçimi açılır |

- [ ] Geçti

---

## 6. Yedeğe gönder / Yedekle değiştir

**Dosyalar:** `src/components/AppShell.tsx`, `src/components/PlayerEditModal.tsx`

| Adım | Beklenen |
|------|----------|
| Kadrodaki oyuncuyu aç | "Yedeğe gönder" ve "Yedekle değiştir" görünür |
| Yedeğe gönder | Oyuncu yedek havuzuna gider, slot boşalır |
| Yedekle değiştir | Yedek paneli yeşil moda geçer, yedek seçilince değişim olur |

Not: "Yedekle değiştir" modu sayfa yenilenince sıfırlanır (bilinen sınırlama).

- [ ] Geçti

---

## 7. Logo ve forma tasarımı

**Dosyalar:** `src/components/LogoDesignerModal.tsx`, `src/components/LogoDesigner.tsx`

| Adım | Beklenen |
|------|----------|
| Takım logosuna tıkla | Modal açılır |
| Logo yükle | **Modal açık kalır**, logo güncellenir |
| Forma rengi / stil değiştir | Önizleme güncellenir |
| Tamam | Modal kapanır |

- [ ] Geçti

---

## 8. Başlık düzenleme

**Dosyalar:** `src/components/PosterTitleDisplay.tsx`, `src/components/PosterTitleModal.tsx`

| Adım | Beklenen |
|------|----------|
| Posterde başlığa tıkla | Düzenleme modalı açılır |
| Aşağı kaydır (efekt/slider) | Önizleme üstte sabit kalır |
| Renk paleti / efekt değiştir | Önizleme anında güncellenir |
| Palet poster temasından farklıysa | "Poster temasına uy" görünür |
| Kaydet | Poster başlığı güncellenir |

- [ ] Geçti

---

## 9. Format ve diziliş

**Dosyalar:** `src/components/PosterToolbar.tsx`, `src/store/useAppStore.ts`

| Adım | Beklenen |
|------|----------|
| 6v6 / 7v7 / 8v8 | Oyuncu sayısı değişir |
| Ev / dep diziliş dropdown | Formasyon değişir, oyuncular yeniden konumlanır |
| Oyuncu kartı / fotoğraf slider | Boyut değişir |

- [ ] Geçti

---

## 10. Poster indir

**Dosyalar:** `src/components/AppShell.tsx`, `html-to-image`

| Adım | Beklenen |
|------|----------|
| "Poster İndir" | `halisaha-kadro.png` iner |
| İndirilen görsel | Ekrandaki posterle uyumlu, bozuk değil |

- [ ] Geçti

---

## Otomatik kontroller (her değişiklikte)

```bash
npm run build
npm run lint
```

- [ ] Build geçti
- [ ] Lint geçti

---

## Değişiklik günlüğü

| Tarih | Değişiklik | Test edilen maddeler | Sonuç |
|-------|------------|----------------------|-------|
| 2026-06-23 | Başlık modalı: sabit önizleme, renk paleti (Kırmızı/Mavi/Turkuaz/Gri), "Poster temasına uy" | #8 + build/lint | Kod + build/lint geçti |
| 2026-06-23 | Stabilizasyon: `useModalBackdrop` tüm modallarda, cutout data URL persist, BenchPanel dynamic import, lint/build temiz | 1–10 + otomatik | Kod incelemesi + build/lint geçti; #3 manuel tarayıcı testi önerilir (ONNX model indirme) |

### Smoke audit özeti (2026-06-23)

| # | Özellik | Kod durumu | Not |
|---|---------|-------------|-----|
| 1 | Oyuncu modalı | ✅ | `PlayerEditModal` + `useModalBackdrop`, `key` ile remount |
| 2 | Fotoğraf ekleme | ✅ | `openFilePicker` + `pickingFileRef` guard |
| 3 | Arka plan kaldırma | ✅ | `blobUrlToDataUrl` → `cutoutUrl` data URL; static import |
| 4 | Tema | ✅ | `setPosterTheme` + `normalizePosterTheme` v26; 4 poster PNG mevcut |
| 5 | Yedek panel | ✅ | `BenchPanel` + `AssignToLineupModal` backdrop pattern |
| 6 | Yedeğe gönder / değiştir | ✅ | `hasLineupSlot` ile butonlar her zaman görünür |
| 7 | Logo modal | ✅ | `LogoDesignerModal` + dosya seçici guard |
| 8 | Başlık modal | ✅ | `PosterTitleModal` body remount pattern |
| 9 | Format / diziliş | ✅ | `PosterToolbar` store aksiyonları mevcut |
| 10 | Poster indir | ✅ | `html-to-image` AppShell'de |

**Asset kontrolü:** `public/posters/` (4 PNG), `public/logos/presets/` (6 PNG) — 404 yok.

**Bilinen sınırlama:** `substituteTarget` sayfa yenilenince sıfırlanır (React state).
