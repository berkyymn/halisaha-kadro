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
| 5 | Paket D: Performans / Lighthouse / Core Web Vitals | ⏳ Beklemede | Prod build üzerinde ölçüm |
| 6 | Paket D: Mobil testler (drag & drop, fotoğraf, indirme) | ⏳ Beklemede | Gerçek cihazlar ve tarayıcı emülatörleri |
| 7 | Paket D: Firebase Security Rules gözden geçirme | ⏳ Beklemede | `firebase/firestore.rules` ve `firebase/storage.rules` |
| 8 | Paket D: Firebase Hosting deploy ve domain/SSL | ⏳ Beklemede | Özel domain varsa DNS/SSL doğrulama |
| 9 | Paket D: SEO / meta tag / favicon / PWA manifest | ⏳ Beklemede | `app/layout.tsx`, `public/manifest.json` |
| 10 | Paket D: Hata takibi (Sentry vb.) | ⏳ Beklemede | Değerlendirme aşamasında |
| 11 | Paket D: Analytics / kullanım ölçümü | ⏳ Beklemede | İsteğe bağlı |
| 12 | Paket D: Erişilebilirlik ve duyarlılık kontrolü | ⏳ Beklemede | Klavye navigasyonu, kontrast, font boyutu |
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
