<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Halı Saha Kadro — Agent Kuralları

## Kapsam

- Yalnızca istenen dosya/özelliği değiştir.
- Mevcut özellikleri kaldırma veya gizleme — kullanıcı açıkça istemedikçe.
- Refactor ile yeni özellik aynı değişiklikte olmasın.
- Kullanıcı "dokunma" listesi verdiyse o dosyalara/özelliklere dokunma.

## Store ve persist

- Ana store: `src/store/useAppStore.ts` (~1000 satır, localStorage persist v26).
- Store değişince:
  - `version` artır ve `migrate` bloğu ekle.
  - `merge` ve `onRehydrateStorage` güncelle.
  - `partialize` alanlarını silme.
- `normalizeMatchInfo` ve `normalizePosterTheme` kullan; ham state yazma.

## Modal ve dosya seçici

- Yeni modal: `src/hooks/useModalBackdrop.ts` + `src/components/ModalShell.tsx` kullan.
- Dosya seçici açıkken modal kapanmamalı (`pickingFileRef` guard).
- Uzun işlem sırasında modal kapanmamalı (`busy` guard).
- İçerik div'inde `onPointerDown` ve `onPointerUp` ile `stopPropagation`.

## Arka plan kaldırma

- `@imgly/background-removal`: `src/lib/backgroundRemoval.ts` içinde **static import** (runtime dynamic import dev HMR'da sayfayı yeniler).
- `PlayerEditModal` AppShell'de `next/dynamic` ile yüklenir (`ssr: false`).
- Cutout sonucu **data URL** olarak kaydet (`fileToDataUrl`); blob URL persist etme.

## Bitirmeden önce

1. `npm run build`
2. `npm run lint`
3. `docs/QA-CHECKLIST.md` içinde etkilenen maddeleri test et
4. Kullanıcıya hangi checklist maddelerinin doğrulandığını yaz

## Yeni özellik ekleme

1. Önce `docs/QA-CHECKLIST.md`'ye madde ekle
2. Sonra kodu yaz
3. Checklist maddesini test et

## Bilinen sınırlamalar

- `substituteTarget` (yedekle değiştir modu) sayfa yenilenince sıfırlanır.
- İlk arka plan kaldırma ~40MB model indirir; internet gerekir.
- `PhotoEditorModal` kullanılmıyor (dead code); yeni akışlarda kullanma.

## Özellik → dosya haritası

| Özellik | Dosyalar |
|---------|----------|
| Poster / tema | `PosterToolbar`, `StaticPosterBackground`, `posterThemes.ts` |
| Oyuncu düzenleme | `PlayerEditModal`, `AppShell` |
| Yedek oyuncu | `BenchPanel`, `AssignToLineupModal` |
| Logo / forma | `LogoDesignerModal`, `LogoDesigner` |
| Başlık | `PosterTitleDisplay`, `PosterTitleModal` |
| Store | `useAppStore.ts` |
