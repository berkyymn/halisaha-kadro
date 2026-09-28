# Production Checklist

Canlıya çıkış öncesi tüm maddeleri takip etmek için kullanılır.
Durumlar: `✅ Tamamlandı`, `🔄 Devam ediyor`, `⏳ Beklemede`, `❌ Blokta`.

---

| # | Konu | Durum | Not |
|---|------|-------|-----|
| 1 | Paket A: Auth güvenliği ve misafir göstergeleri | ✅ Tamamlandı | Çıkış onayı + localStorage/IndexedDB temizliği; misafir "Yerel" / yapılandırılmamış "Çevrimdışı" rozeti |
| 2 | Paket C: IndexedDB misafir depolama | ✅ Tamamlandı | `src/lib/indexedDBStorage.ts`; eski localStorage migrate; setItem artık localStorage yedeği de tutuyor; çıkışta temizlik |
| 2b | Bulut sync güvenliği: ilk açılışta pull yapmadan push engelleme | ✅ Tamamlandı | `initialCloudPullCompleted` ile `useCloudSync` pause; default state bulut üzerine yazamaz |
| 3 | Paket B: Misafir çoklu sekme senkronizasyonu | ✅ Tamamlandı | `window.storage` event + `useAppStore.persist.rehydrate()` ile guest state sync |
| 4 | Paket B: Giriş anında yerel/bulut çatışma diyaloğu | ✅ Tamamlandı | `LoginConflictModal`; yerel/bulut/birleştir seçenekleri |
| 5 | Paket D: Performans / Lighthouse / Core Web Vitals | 🔄 Devam ediyor | ~40MB arka plan kaldırma model preload’u kaldırıldı; `html-to-image` dinamik import, `LogoDesignerModal` lazy load; Lighthouse yeniden ölçülecek |
| 6 | Paket D: Mobil testler (drag & drop, fotoğraf, indirme) | ⏳ Beklemede | Gerçek cihazlar ve tarayıcı emülatörleri |
| 7 | Paket D: Firebase Security Rules gözden geçirme | ✅ Tamamlandı | `firebase/firestore.rules` ve `firebase/storage.rules` gözden geçirildi |
| 8 | Paket D: Firebase Hosting deploy ve domain/SSL | 🔄 Devam ediyor | `firebase.json` hosting + rewrite/header yapılandırıldı; deploy kullanıcı onayı bekliyor |
| 9 | Paket D: SEO / meta tag / favicon / PWA manifest | ✅ Tamamlandı | `app/layout.tsx` meta/OG/Twitter, `public/manifest.json`, ikonlar, `robots.txt`, `sitemap.xml` |
| 10 | Paket D: Hata takibi (Sentry vb.) | ⏳ Beklemede | Değerlendirme aşamasında; opsiyonel |
| 11 | Paket D: Analytics / kullanım ölçümü | ✅ Tamamlandı | GA4 page view; özel eventler: fotoğraf ekleme/değiştirme, arka plan kaldırma, yedek/saha değişimi, poster indirme |
| 12 | Paket D: Erişilebilirlik ve duyarlılık kontrolü | 🔄 Devam ediyor | Modal Escape kapatma, oyuncu kartları `aria-label` numara+isimle eşleştirildi, toolbar buton renk kontrastı `bg-green-700`/`text-zinc-400` yapıldı; Lighthouse a11y yeniden ölçülecek |
| 13 | Paket D: Yasal / Gizlilik politikası ve KVKK uyumu | ⏳ Beklemede | Gerekirse sayfa ekle |

---

## Ek kontroller (her production adımı öncesi)

- [ ] `npm run build` hatasız çalışıyor.
- [ ] `npm run lint` hatasız çalışıyor.
- [ ] `docs/QA-CHECKLIST.md` içinde ilgili maddeler test edildi / güncellendi.
- [ ] Yeni dosya/özellik eklendiyse `docs/QA-CHECKLIST.md`’ye madde eklendi.
- [ ] Push önce son `git diff` incelendi ve yalnızca istenen değişiklikler var.

---

## Son güncelleme

- 2026-09-14: Checklist oluşturuldu; Paket A, B, C ve bulut sync güvenliği tamamlandı, Paket D beklemede.
