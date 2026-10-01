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
| İlk kullanımda | "Model indiriliyor… %XX" görünür, download sonrası "Arka plan kaldırılıyor…" |
| İkinci kullanımda (model cached) | "Arka plan kaldırılıyor…" direkt görünür, bekleme yok |
| İşlem bitince | Arka plansız önizleme, WebP formatında |
| Kaydet + sayfayı yenile | Cutout **kaybolmaz** (data URL olarak saklanır) |
| CPU inference | WASM/ONNX ile CPU'da çalışır, GPU gerekmez |
| App açılışında | Model ön yüklenmez; ilk “Arka plan kaldır” kullanımında indirilir (sonrası tarayıcı önbelleğinden çalışır) |

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
| "Yeni oyuncu" | Düzenleme modalı açılır |
| Yedek düzenle / sil | Çalışır |
| Yedek kartını sürükle | Kart imleci takip eden kopyası görünür |

- [ ] Geçti

---

## 6. Sürükle-bırak oyuncu değişikliği

**Dosyalar:** `src/components/BenchPanel.tsx`, `src/components/PlayerOnPitch.tsx`, `src/components/AppShell.tsx`, `src/store/useAppStore.ts`

| Adım | Beklenen |
|------|----------|
| Yedek oyuncuyu sahadaki bir oyuncunun üzerine bırak | Yedek oyuncu sahaya çıkar, sahadaki oyuncu yedeklere geçer |
| Yedek oyuncuyu boş slotun üzerine bırak | Yedek oyuncu doğrudan o slota yerleşir |
| Saha oyuncusunu yedekler panelinin boş alanına bırak | Oyuncu yedeklere gönderilir, slot boşalır |
| Saha oyuncusunu bir yedek kartının üzerine bırak | İki oyuncu swap olur; yedek sahaya çıkar, saha oyuncusu yedeklere geçer |
| Oyuncu değişimi sonrası formasyon | Oyuncular doğru pozisyonlarda kalır, kaptanlık ve forma numarası çakışması çözülür |
| Tek takım modunda yedek sürükleme | Sadece home takım slotları hedef olur, away oyuncuları görünmez |
| İki takım modunda yedek sürükleme | Home ve away slotlar hedef olabilir |
| Tek takım modunda saha oyuncusunu yedeğe sürükle | Kart poster sınırını aşıp yedekler paneline ulaşabiliyor; bırakınca yedeğe gönderilir |
| Saha oyuncusunu başka bir saha oyuncusunun üzerine sürükle | Hem hedef kart hem sürüklenen kart yeşil "DEĞİŞTİR" swap işaretiyle yanar |
| Saha oyuncusunu yedek kartının üzerine sürükle | Yedek kartı yeşil "DEĞİŞTİR" swap işaretiyle yanar; hangi oyuncuyla swap olacağı net |
| Yedek oyuncuyu sahadaki bir oyuncunun üzerine sürükle | Giren yedek kart yeşil "GİREN" yukarı ok, çıkan saha kartı kırmızı "ÇIKAN" aşağı ok işaretiyle yanar |
| Ard arda 5+ yedek swap | Hiçbir kart üst üste kalmıyor, yeniden sürükleme tetiklenmiyor, UI kilitlenmiyor |

- [ ] Geçti

---

## 7. Logo ve forma tasarımı

**Dosyalar:** `src/components/LogoDesignerModal.tsx`, `LogoDesignerPresetPanel.tsx`, `LogoDesignerCustomPanel.tsx`, `JerseyControls.tsx`, `TeamLogoBadge.tsx`, `logo/LogoIcon.tsx`, `src/lib/logoEmblems.generated.ts` (`npm run emblems`)

| Adım | Beklenen |
|------|----------|
| Posterde logoya tıkla | Pencere: solda önizleme (logo, takım adı, forma), takım adı, ortak logo boyutu; sağda Hazır logo / Tasarla / Forma |
| Herhangi bir değişiklik | Yalnızca pencerede görünür; poster Kaydet'e kadar değişmez |
| Vazgeç / Esc / dışarı tıkla | Tüm değişiklikler atılır |
| Kaydet (veya takım adında Enter) | Logo, forma, ad ve logo boyutu tek seferde postere yazılır |
| Görsel yükle → Tasarla sekmesine geç → geri dön | Yüklenen logo hâlâ seçili ve listede (eskiden sekme değiştirmek yüklenen logoyu siliyordu) |
| Hazır logo seç ("forma renklerini de uygula" açık / kapalı) | Açıkken forma önerilen renklere geçer; kapalıyken forma korunur |
| Tasarla: hızlı başla şablonu | Şablon adı ile çizilen sembol eşleşir (ör. "Yeşil Timsah" → timsah) |
| Sembol / şekil / zemin / kenarlık | Her seçenek küçük arma önizlemesiyle; "Sembolsüz" düğmesi sembolü kaldırır |
| Baş harfler | Posterin yazı tipiyle (Bebas Neue); takım adı değişince, elle değiştirilmediyse adla birlikte güncellenir |
| Forma: "Logonun renklerini kullan" | Forma renk 1/2 ve numara rengi logodan alınır |
| Forma deseni | 6 desen forma önizlemesiyle (Çapraz şerit dahil) |
| Varsayılana dön | Logo ve forma takımın varsayılanına döner (taslakta; Kaydet gerekir) |
| Eski kayıt (phoenix, claw, panther, football…) | Yüklenirken en yakın yeni sembole eşlenir, çökme yok |
| /gizlilik | "Kullanılan içerikler": game-icons.net CC BY 3.0 atfı |

- [x] Geçti (tarayıcı, 1440×900; 2026-09-29)

## 7b. Logo kalıcılığı (bulut + yerel)

**Dosyalar:** `src/lib/cloud/cloudDocument.ts`, `src/lib/cloud/posterRepository.ts`, `src/lib/mediaSync.ts`, `src/store/useAppStore.ts`

| Adım | Beklenen |
|------|----------|
| Giriş yap, sol takım preset değiştir (ör. bordo-mavi) | Poster güncellenir |
| 30 sn bekle, sayfayı yenile | Logo korunur |
| Logo değiştir, hemen yenile (6 sn beklemeden) | Logo korunur |
| İki sekme: A'da logo değiştir, B'de 10 sn bekle | B de yeni logoyu gösterir |
| Çıkış yap / tekrar giriş | Özelleştirilmiş logolar korunur |
| Sağ takım preset değiştir | Her iki takım logosu bağımsız korunur |

- [ ] Geçti

---

## 8. Başlık düzenleme

**Dosyalar:** `src/components/PosterTitle.tsx`, `src/components/PosterTitleDisplay.tsx`, `src/components/PosterTitleModal.tsx`, `src/lib/posterTitleStyles.ts`

| Adım | Beklenen |
|------|----------|
| Posterde başlığın üzerine gel | Kesikli çerçeve + "Düzenle" ipucu (poster-editable ile aynı dil) |
| Başlığa tıkla | Pencere açılır; önizleme posterin gerçek arka planı üzerinde, posterdekiyle birebir aynı oranda |
| Üst / alt satır yaz | Türkçe büyük harf (i → İ); sayaç `x/16` |
| Alt satırı boş bırak, Kaydet | Başlık tek satır görünür (eskiden sessizce "GECESİ" dönüyordu) |
| Üst satırı boş bırak, Kaydet | "DERBİ" varsayılanı kullanılır |
| Efekt kartları | Her kart efekti gerçek başlık yazısıyla gösterir; seçim önizlemeye anında yansır |
| Renk | 4 renk; aktif temanın rengi "Tema" etiketiyle işaretli |
| Boyut / harf aralığı / gölge | Önizleme anında güncellenir; boyut 80–120% |
| Enter | Kaydeder ve kapatır; Esc / Vazgeç değişikliği atar |
| Varsayılana dön | Stil varsayılana döner (yazılar korunur) |
| Farklı ekran genişlikleri | Başlığın postere oranı sabit (rem sınırı yok, yalnızca `cqw`) |
| Poster İndir (JPEG) | Başlık ekrandakiyle aynı; Altın/Krom/Metalik degrade yazılar doğru çıkar |
| Eski kayıt (döndürme / max genişlik değeri olan) | Persist v36 göçü alanları siler; başlık düz ve ortalı |

- [ ] Geçti

------|----------|
| Posterde başlığa tıkla | Düzenleme modalı açılır |
| Aşağı kaydır (efekt/slider) | Önizleme üstte sabit kalır |
| Renk paleti / efekt değiştir | Önizleme anında güncellenir |
| Palet poster temasından farklıysa | "Poster temasına uy" görünür |
| Kaydet | Poster başlığı güncellenir |

- [ ] Geçti

---

## 9. Format ve diziliş

**Dosyalar:** `src/components/PosterToolbar.tsx`, `src/store/useAppStore.ts`, `src/lib/formations.ts`, `src/lib/formationEngine.ts`

| Adım | Beklenen |
|------|----------|
| 6v6 / 7v7 / 8v8 | Oyuncu sayısı değişir, listedeki tüm dizilişler geçerli |
| 6v6 diziliş dropdown | Yalnızca `2-2-1`, `2-1-2`, `3-1-1` gösterilir; varsayılan `3-1-1` |
| 7v7 diziliş dropdown | Yalnızca `2-2-2`, `2-1-3`, `2-3-1`, `3-2-1`, `3-1-2` gösterilir; varsayılan `3-2-1` |
| 8v8 diziliş dropdown | `2-2-3`, `2-3-2`, `2-1-4`, `2-4-1`, `3-2-2`, `3-1-3`, `3-3-1`, `4-2-1`, `4-1-2` gösterilir; varsayılan `3-3-1` |
| Hiçbir listede 1 defansla başlayan diziliş yok | Örn. `1-3-2`, `1-4-2` vb. görünmez |
| Ev / dep diziliş dropdown | Formasyon değişir, oyuncular yeniden konumlanır |
| Oyuncu kartı / fotoğraf slider | Boyut değişir |
| Tek takım dikey posterde her formasyon | Kaleci altta ortada; defans, orta saha, forvet mantıklı şekilde yukarı sıralanır; oyuncular üst üste binmez |

- [ ] Geçti

---

## 10. Poster indir

**Dosyalar:** `src/components/AppShell.tsx`, `html-to-image`

| Adım | Beklenen |
|------|----------|
| "Poster İndir" | `halisaha-kadro.jpg` iner (JPEG %92, ~1 MB; iki takım 2400×1500, tek takım 1600×2000) |
| İndirilen görsel | Ekrandaki posterle uyumlu, bozuk değil |

- [ ] Geçti

---

## 11. Bulut sync stabilitesi

**Dosyalar:** `src/lib/cloud/syncController.ts`, `src/lib/cloud/posterRepository.ts`, `src/lib/cloud/syncRuntime.ts`, `src/contexts/AuthContext.tsx`

> **Sync refactor regresyon testleri için:** `docs/SYNC-REFACTOR-CHECKLIST.md` (§S1–§S10)

| Adım | Beklenen |
|------|----------|
| Giriş yapmış kullanıcıda 10 ardışık oyuncu fotoğrafı ekle | `resource-exhausted` hatası olmamalı; toolbar'da "Kaydediliyor..." görünür |
| Logo + kadro + tema değişimi burst (30 sn içinde) | Firestore'a en fazla birkaç yazı; çift branding+data duplicate yazımı yok |
| Sekme kapat / aç veya sayfa yenile | Kadro, logo ve fotoğraflar korunur |
| İki sekmede eşzamanlı düzenleme | İlk kaydeden kazanır; diğer sekmede "Kadro başka bir yerde de değişti" seçimi açılır (§40). Sessiz ezme yok |
| `resource-exhausted` sonrası | Bulut simgesi uyarı rengine döner; 30 sn sonra otomatik devam |

- [ ] Geçti

## 13. Firebase veri akışı ve mobil hazırlığı

**Dosyalar:** `src/lib/cloud/posterRepository.ts`, `src/lib/mediaSync.ts`, `src/lib/cloud/syncController.ts`, `firebase/firestore.rules`, `firebase/storage.rules`

| Adım | Beklenen |
|------|----------|
| Uygulamayı mevcut cloud poster ile yeniden aç | Değişiklik yoksa gereksiz cloud write oluşmamalı |
| Yeni veya değiştirilmiş oyuncu fotoğrafı ekle | Fotoğraf Storage’a, metadata ve Storage path Firestore’a yazılmalı |
| Storage upload’ını geçici olarak başarısız yap | Poster metadata kaydı medya hatası nedeniyle kilitlenmemeli |
| Eski dokümanda inline data URL + Storage path birlikte varsa | Sonraki sync sonrası Firestore’da yalnızca Storage path kalmalı |
| Web ve gelecekte mobil istemci için path kontrolü | Aynı `users/{uid}/players/{id}` ve `users/{uid}/logos/{side}` sözleşmesi kullanılmalı |
| Storage rules | Kullanıcı yalnızca kendi `users/{uid}/...` alanına erişebilmeli |

- [ ] Geçti

## 15. Tek takım / iki takım modu

**Dosyalar:** `src/components/PosterToolbar.tsx`, `src/components/MatchPoster.tsx`, `src/components/PitchPlayerLayer.tsx`, `src/components/BenchPanel.tsx`, `src/store/useAppStore.ts`

| Adım | Beklenen |
|------|----------|
| PosterToolbar’da `Tek takım` seç | Home kadro merkezde görünür, away kadro posterden ve düzenleme akışından gizlenir |
| Tek takım modunda oyuncu/yedek düzenle | Oyuncu, kaptan, fotoğraf ve yedek işlemleri home kadro için çalışır |
| Sayfayı yenile | Tek takım seçimi korunur |
| Tek takımdan `İki takım` seç | Away kadro ve logo geri gelir; önceki away verisi kaybolmaz |
| İki takım modunda mevcut akış | İki takım posteri, iki formasyon ve iki takım yedek atama akışı eskisi gibi çalışır |
| Tek takımda kaleciyi ve bir oyuncuyu sürükle | Kaleci yerinde kalır ve sürükleme edit ekranı açmaz; saha oyuncusu tam saha içinde serbestçe konumlanır |
| Tek takımda pozisyonları değiştir, iki takıma dön, tekrar tek takıma dön | Her modun pozisyonları bağımsız korunur |
| Tek takım posterini aç | Seçili temanın ilgili dikey görseli kullanılır, logo sol üstte görünür ve `DERBİ GECESİ` başlığı görünmez |
| Tek takım kalecisini sürüklemeye çalışıp bırak | Kaleci hareket etmez ve edit ekranı yanlışlıkla açılmaz; tıklama edit ekranını açar |
| Tek takımda iki oyuncuyu üst üste sürükle | Oyuncular doğru isim/forma ile tek seferde swap olur |
| İki takımda oyuncuyu rakip yarı sahaya sürükle | Kart imleci takip eder; rakip oyuncuda swap işareti oluşur ve üstünde bırakınca cross-team swap olur |
| İki takımda oyuncuyu boş rakip sahaya bırak | Kart rakip sahada kalmaz, geçerli kendi yarı sahasındaki konumuna döner |
| Tek takım modunda posterin sağı/solundaki boşluklar | Takım atmosfer rengine göre çok hafif renkli gradient ile doldurulur; simsiyah kalmaz |
| İki takım modunda posterin sağı/solundaki boşluklar | Home renk solda, away renk sağda çok hafif gradient ile doldurulur |

- [ ] Geçti

**Manuel doğrulananlar:** İkili modda oyuncu taşıma, rakip sahada cross-team swap ve forma numarası conflict çözümleme çalışıyor. Yedek havuzu sürükle-bırak değişiklikleri de çalışıyor.

## 14. Sync refactor PR

**Kapsam:** Tek poster modeli korunur. Bu bölüm server revision, durable outbox, realtime cloud read, media cleanup ve rules hardening içindir.

| Adım | Beklenen |
|------|----------|
| Aynı posteri iki cihazda aç, A cihazında değişiklik yap, B cihazında farklı değişiklik yap | Stale write reddedilmeli veya güvenli şekilde yeniden yüklenmeli; sessiz veri ezilmemeli |
| İnterneti kes, değişiklik yap, tarayıcıyı kapat/aç, interneti geri getir | Bekleyen değişiklik durable outbox’tan otomatik gönderilmeli |
| İki açık istemciden birinde değişiklik yap | Diğer istemci yeniden yükleme olmadan güncellenmeli |
| Oyuncuyu sil veya fotoğrafı değiştir | Kullanılmayan eski Storage nesnesi temizlenmeli |
| Başka kullanıcının Firestore/Storage path’ine erişmeyi dene | Rules erişimi reddetmeli |
| Geçersiz Firestore alanı veya Storage dosya türü gönder | Rules erişimi reddetmeli |
| Web sözleşmesini native istemciyle eşleştir | Auth UID, Firestore path ve Storage path aynı kalmalı |

- [ ] Geçti

---

## 16. Auth / oturum güvenliği ve misafir göstergeleri

**Dosyalar:** `src/components/UserAuthButton.tsx`, `src/contexts/AuthContext.tsx`, `src/components/ModalShell.tsx`

| Adım | Beklenen |
|------|----------|
| Misafir (giriş yapılmamış) modda header sağ taraf | "Yerel" rozeti görünür; tooltip "veriler sadece bu tarayıcıda saklanıyor" der |
| Misafir modda "Giriş yap" butonu | Hâlâ görünür, tıklayınca auth modalı açılır |
| Firebase yapılandırılmamışken (`configured === false`) | "Giriş yap" butonu görünmez; sadece sarı "Çevrimdışı" rozeti görünür |
| Giriş yapmış kullanıcı "Çıkış yap" ikonuna tıklar | Onay modalı açılır; "bu cihazdaki kadro kopyası silinecek, bulutta saklanmaya devam eder" mesajı görünür |
| Çıkış onayında "İptal" | Modal kapanır, veri silinmez, oturum açık kalır |
| Çıkış onayında "Çıkış yap" | Firebase oturumu kapanır, `localStorage` temizlenir, sayfa yenilenir, boş varsayılan kadro gelir |
| Çıkış sonrası başka kullanıcı giriş yaparsa | Önceki kullanıcının yerel verisi bulut verisiyle karışmaz |

- [ ] Geçti

---

## 17. Varsayılan poster ayarları ve toolbar

**Dosyalar:** `src/store/useAppStore.ts`, `src/lib/posterSnapshot.ts`, `src/components/PosterToolbar.tsx`, `src/components/PlayerAvatar.tsx`

| Adım | Beklenen |
|------|----------|
| Uygulama ilk açıldığında | İki takım (versus) modu seçili gelir |
| Yeni oluşturulan posterin saha adı | "HALI SAHA" olarak görünür; eski "DEMİR TEKLİ HALISAHA" kalmamış |
| PosterToolbar’da | "Fotoğraf" slider’ı ve yüzde göstergesi yok |
| Oyuncu kartlarındaki fotoğraf boyutu | Sabit %100 ölçekte, eski slider ayarına bağlı kalmadan görünür |

- [ ] Geçti

---

## 18. IndexedDB misafir depolama

**Dosyalar:** `src/lib/indexedDBStorage.ts`, `src/store/useAppStore.ts`, `src/contexts/AuthContext.tsx`

| Adım | Beklenen |
|------|----------|
| Uygulama ilk açıldığında (misafir) | Veriler IndexedDB’ye (`halisaha-kadro-db`) kaydedilir; `localStorage`’da büyük data URL’ler kalmaz |
| Eski `localStorage` verisi varsa | İlk açılışta otomatik IndexedDB’ye taşınır ve eski localStorage anahtarı silinir |
| Birçok oyuncu fotoğrafı ekle (misafir) | Depolama limiti aşılmadan kaydedilir; tarayıcı localStorage quota hatası vermez |
| Sayfayı yenile | Kadro ve fotoğraflar IndexedDB’den geri yüklenir |
| Giriş yapmış kullanıcıda sync | Bulut sync aynı şekilde çalışır; yerel depolama IndexedDB’de olur |
| Çıkış yap | IndexedDB temizlenir, sayfa yenilenir, boş varsayılan kadro gelir |
| IndexedDB devre dışı / private mod | Graceful fallback: veriler localStorage’a döner (quota riski var ama uygulama çalışmaya devam eder) |
| Giriş yapmış kullanıcı, boş/default yerel state ile açılış | İlk bulut çekme işlemi tamamlanmadan buluta yazma (push) yapılmaz; default state buluttaki verinin üzerine yazamaz |

- [ ] Geçti

---

## 19. Misafir çoklu sekme senkronizasyonu ve giriş çatışması

**Dosyalar:** `src/hooks/useGuestTabSync.ts`, `src/contexts/AuthContext.tsx`, `src/components/LoginConflictModal.tsx`, `src/lib/loginConflict.ts`

| Adım | Beklenen |
|------|----------|
| Misafir modunda A sekmesinde kadro değiştir | B sekmesinde (aynı origin) değişiklik otomatik yansır |
| Misafir modunda A sekmesinde fotoğraf ekle | B sekmesinde fotoğraf görünür; sayfa yenilemeden güncellenir |
| Misafir modunda çoklu sekme senkronizasyonu | Yenileme / rehydrate sırasında mevcut düzenleme kaybolmaz |
| Misafir kullanıcı giriş yap, bulutta farklı bir kadro var | `LoginConflictModal` açılır; “Bu cihazı kullan”, “Bulutu kullan”, “Birleştir” seçenekleri görünür |
| “Bu cihazı kullan” | Yerel kadro buluta yazılır, buluttaki eski kadro ezilir |
| “Bulutu kullan” | Buluttaki kadro yerel duruma uygulanır, yerel veri kaybolur |
| “Birleştir” | Bulut son kaydı temel alınır ama yerel fotoğraflar/logolar (bulutta yoksa) korunur |
| Giriş yapmış kullanıcı, yerel veri varsayılan / boş | Çatışma modalı açılmaz, doğrudan bulut verisi yüklenir |

- [ ] Geçti

---

## 20. SEO, meta tagler, favicon ve PWA manifest

**Dosyalar:** `src/app/layout.tsx`, `public/manifest.json`, `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `public/og-image.png`, `public/robots.txt`, `public/sitemap.xml`

| Adım | Beklenen |
|------|----------|
| `<title>` ve `<meta name="description">` | Doğru Türkçe metinler |
| Open Graph / Twitter Card | `og-image.png` 1200x630, başlık/açıklama mevcut |
| Favicon | `icon.svg` tarayıcı sekmesinde görünür |
| PWA manifest | Tarayıcı "Install" teklif edebilir, tema rengi yeşil/siyah |
| `robots.txt` ve `sitemap.xml` | Kök dizinde, arama motorlarına izin veriyor |
| Apple touch icon | iOS cihazda kısayol ikonu olarak çalışır |

- [x] Geçti

---

## 21. Analytics / kullanım ölçümü

**Dosyalar:** `src/app/layout.tsx`, `src/lib/analytics.ts`

| Adım | Beklenen |
|------|----------|
| `NEXT_PUBLIC_GA_ID` boş/eksik | Analytics scripti yüklenmez, uygulama çalışır |
| `NEXT_PUBLIC_GA_ID` tanımlı | GA4 `gtag` yüklenir, `page_title` ve `page_location` gönderilir |
| Çerez / izin yönetimi yok (şimdilik) | GA4 varsayılan `gtag` davranışı kullanılır; ileride izin modalı eklenebilir |

- [x] Geçti

---

## 22. Performans ve erişilebilirlik iyileştirmeleri

**Dosyalar:** `src/components/AppShell.tsx`, `src/hooks/useModalBackdrop.ts`, `src/components/PlayerOnPitch.tsx`

| Adım | Beklenen |
|------|----------|
| İlk bundle | `html-to-image` ilk yüklemede çekilmez, sadece "Poster İndir"e tıklanınca indirilir |
| Logo designer modal | `next/dynamic` ile lazy load edilir, ilk render’a dahil olmaz |
| Modal Escape tuşu | Açık modal Escape ile kapanır (`busy` durumunda kapanmaz) |
| Oyuncu kartı | Ekran okuyucu için `role="button"` ve görünen numara+isimle eşleşen `aria-label` içerir |
| Toolbar butonları | Yeterli renk kontrastı (`bg-green-700` / `text-zinc-400`) sağlanır |

- [x] Geçti

---

## 23. Analytics özel eventleri

**Dosyalar:** `src/lib/analytics.ts`, `src/store/useAppStore.ts`, `src/components/AppShell.tsx`, `src/components/PlayerEditModal.tsx`, `src/components/PosterTitleModal.tsx`, `src/components/MatchPoster.tsx`, `src/components/LogoDesignerModal.tsx`, `src/components/JerseyControls.tsx`, `src/components/UserAuthButton.tsx`, `src/components/AuthModal.tsx`

| Adım | Beklenen |
|------|----------|
| Uygulama açılışı | `page_view` otomatik gönderilir |
| Misafir oturumu sıfırla | `guest_session_reset` |
| Poster indir | `poster_downloaded` |
| Tema değiştir | `poster_theme_changed` |
| Format (6v6/7v7/8v8) değiştir | `squad_size_changed` |
| Diziliş değiştir | `formation_changed` |
| Tek takım ↔ İki takım değiştir | `team_mode_changed` |
| Oyuncu modalında kaydet | `player_edited` (lineup) / `bench_player_edited` (bench) |
| Kaptan yap / kaldır | `captain_set` / `captain_unset` |
| İlk fotoğraf ekle / fotoğraf değiştir | `player_photo_added` / `player_photo_changed` |
| Arka plan kaldır | `background_removed` |
| Saha kartını sürükle-bırak konumlandır | `player_repositioned` |
| İki saha oyuncusu swap | `players_swapped` |
| Saha oyuncusunu yedeğe gönder | `player_sent_to_bench` |
| Yedek oyuncuyu sahaya al | `substitute_entered` |
| Yedek havuzuna ekle / sil | `bench_player_added` / `bench_player_removed` |
| Logo tasarımcısını aç | `logo_designer_opened` |
| Hazır logo seç / yükle / rastgele / oluştur | `logo_preset_selected` / `logo_uploaded` / `logo_randomized` / `logo_generated` |
| Takım adı değiştir | `team_name_changed` |
| Forma değiştir | `jersey_changed` |
| Logo boyutu değiştir | `logo_display_size_changed` |
| Başlık düzenle / stil / efekt | `title_edited` / `title_style_changed` / `title_effect_changed` |
| Saha adı / saat / tarih değiştir | `venue_changed` / `match_date_changed` |
| Giriş yap / çıkış yap | `sign_in_completed` / `sign_out` |
| GA4 kapalıyken (`NEXT_PUBLIC_GA_ID` boş) | Uygulama çalışmaya devam eder, hata vermez |

- [x] Geçti

---

## 24. Oyuncu modalı klavye ve doğrulama (L1, H9, H11)

**Dosyalar:** `src/components/PlayerEditModal.tsx`

| Adım | Beklenen |
|------|----------|
| İsim alanında `Enter` | Kaydeder ve modal kapanır |
| Numara alanında `Enter` | Kaydeder ve modal kapanır |
| Numara 0 / 150 girip kaydet | 1–99 aralığına sıkıştırılır |
| HEIC veya bozuk dosya seç | Kırmızı hata mesajı görünür, modal açık kalır, uygulama takılmaz |
| 20MB üzeri görsel seç | "Görsel çok büyük" mesajı |

- [ ] Geçti

## 25. Tarafsız yedek forması (L3)

**Dosyalar:** `src/components/BenchPanel.tsx`, `src/lib/jerseyOptions.ts`

| Adım | Beklenen |
|------|----------|
| Yedekler panelindeki kartlar | Gri/siyah/beyaz tarafsız forma, takım renkleri yok |
| Yedek düzenleme modalı önizlemesi | Tarafsız forma |
| Yedeği sahaya sürükle | Sahada girdiği takımın formasını alır |
| Saha oyuncusunu yedeğe gönder | Yedekte tarafsız formaya döner |

- [ ] Geçti

## 26. Saat seçici (L4)

**Dosyalar:** `src/components/PosterTimeField.tsx`, `src/components/MatchPoster.tsx`, `src/lib/posterSnapshot.ts`

| Adım | Beklenen |
|------|----------|
| Footer'daki saate / saat ikonuna tıkla | Tarayıcının saat seçicisi açılır |
| Saat seç | Poster `SS:DD` formatında güncellenir |
| Serbest metin yazma | Mümkün değil |
| Eski kayıtta geçersiz saat ("abc") | Yüklemede varsayılan `21:00` olur |

- [ ] Geçti

## 27. Tek takımda diğer takım oyuncuları (L5)

**Dosyalar:** `src/components/BenchPanel.tsx`, `src/components/PlayerOnPitch.tsx`, `src/store/useAppStore.ts`

| Adım | Beklenen |
|------|----------|
| İki takımda TAKIM B oyuncularına isim ver, Tek takım'a geç | Yedekler panelinde "TAKIM B kadrosu" grubu görünür, oyuncular listelenir |
| Gruptan bir oyuncuyu sahadaki oyuncunun üstüne bırak | Yer değiştirirler; sahadaki oyuncu TAKIM B grubuna geçer |
| Saha oyuncusunu TAKIM B kartının üstüne bırak | Yer değiştirirler |
| Gruptaki oyuncuyu düzenle (kalem) | Modal açılır, kaydedince güncellenir |
| İki takıma geri dön | TAKIM B kadrosu değişikliklerle birlikte sahada |
| İki takım modunda | Grup görünmez |

- [ ] Geçti

## 28. Mobil kapı (L6)

**Dosyalar:** `src/components/MobileGate.tsx`, `src/components/AppProviders.tsx`

| Adım | Beklenen |
|------|----------|
| Telefon (375px, dokunmatik) ile aç | Uygulama yüklenmez; "Mobil uygulamamız yakında" ekranı ve PC'den kullanım mesajı |
| Tablet (dokunmatik, fare yok) | Aynı ekran |
| Masaüstü tarayıcı (dar pencere değil) | Uygulama normal açılır |
| Mobilde `/gizlilik` | Gizlilik sayfası okunabilir (kapı yok) |

- [ ] Geçti

## 29. Posteri sıfırla (H2)

| Adım | Beklenen |
|------|----------|
| Sıfırla ikonuna tıkla | Onay modalı açılır |
| İptal | Hiçbir şey değişmez |
| Sıfırla | Takımlar, oyuncular, başlık, pozisyonlar varsayılana döner; yedekler korunur; oyuncu kartına tıklayınca doğru isim/numara gelir |
| Sayfayı yenile | Varsayılan kadro aynen gelir (oyuncular kayıp değil) |

- [ ] Geçti

## 30. Fotoğraf ve logo bulut kalıcılığı (H3, H5, H10)

| Adım | Beklenen |
|------|----------|
| Giriş yapmış kullanıcı: fotoğraflı oyuncunun fotoğrafını kaldır, 15 sn bekle, yenile | Fotoğraf geri gelmez |
| Arka planı kaldırılmış oyuncuya yeni fotoğraf seç (bg kaldırmadan) kaydet | Yeni fotoğraf görünür, eski cutout görünmez |
| Şeffaf PNG logo yükle | Logo arka planı şeffaf kalır |
| Logo yükle, 15 sn bekle, çıkış yap, tekrar giriş yap | Yüklenen logo geri gelir |

- [ ] Geçti

## 31. Giriş çatışması (L7) ve çıkış (H4)

| Adım | Beklenen |
|------|----------|
| Misafirken kadroyu özelleştir, bulutta farklı kadrosu olan hesapla giriş yap | Çatışma modalı açılır |
| "Bu cihazı kullan" | Yerel kadro + logo/forma buluta yazılır; başka cihazda yerel kadro görünür |
| "Bulutu kullan" | Ekranda tamamen buluttaki kadro/logo/foto görünür |
| "Birleştir" | Buluttaki kadro sahada; bu cihazdaki özel oyuncular yedeklere eklenir |
| Değişiklik yap, hemen çıkış yap | Çıkış öncesi kayıt beklenir; tekrar girişte değişiklik bulutta |

- [ ] Geçti

## 32. Sürükleme performansı ve açılış (H1, H6, H8)

| Adım | Beklenen |
|------|----------|
| Fotoğraflı kadroda oyuncu sürükle | Akıcı; sürükleme sırasında depolamaya yazma yok (yalnızca bırakınca) |
| Giriş yapmış kullanıcıda uygulamayı aç, bir şey değiştirme | Bulut kaydı tetiklenmez (senk ikonu yeşil kalır) |
| Poster İndir (küçük pencere) | Versus 2400×1500, tek takım 1600×2000 JPEG |

- [ ] Geçti

## 33. KVKK, gizlilik ve yayın (Y1–Y6)

| Adım | Beklenen |
|------|----------|
| İlk ziyaret | Çerez/analitik banner'ı görünür; seçim yapılmadan GA çerezi yazılmaz |
| "Reddet" | GA ölçümü kapalı kalır, banner kapanır, seçim hatırlanır |
| "Kabul et" | GA ölçümü açılır |
| Header / banner'daki "Gizlilik" linki | `/gizlilik` sayfası açılır |
| `dist/index.html` | canonical / og:image `NEXT_PUBLIC_SITE_URL` domainini gösterir |
| `firebase deploy` öncesi | `dist/dev` yüklenmez (firebase.json ignore) |

- [ ] Geçti

---

## 34. Format değişimi ve kadro tutarlılığı (H14, H15)

**Dosyalar:** `src/lib/rosterIntegrity.ts`, `src/store/useAppStore.ts`, `src/lib/posterSnapshot.ts`

| Adım | Beklenen |
|------|----------|
| 7v7'de 7. oyuncuya isim ver, 6v6'ya geç | Oyuncu yedeklere iner; yer tutucu "Oyuncu 7"ler yedeğe inmez |
| Sayfayı yenile, 7v7'ye geç | Oyuncu yedekten çıkıp aynı takımın 7. slotuna döner |
| 8v8'de 7. ve 8. slota isim ver, 6v6'ya geç, sonra 7v7 ve 8v8 | Önce 7. slottaki, sonra 8. slottaki oyuncu yerine döner |
| Yedekteki bu oyuncuyu elle sahaya al veya sil, sonra formatı büyüt | Kopya veya hayalet oyuncu oluşmaz; boş slot yer tutucuyla dolar |
| Geri dönen oyuncunun forma numarası sahada kullanılıyorsa | İlk boş numarayı alır |
| Kaptan format küçülünce yedeğe inerse | Kaptanlık düşer |
| TAKIM B oyuncusu için aynı akış (iki takım modu) | Kendi takımına geri döner |
| Sayfa açılırken (özellikle yavaş cihazda) | Kayıtlı kadro hiçbir zaman varsayılanla ezilmez (yükleme bitene kadar diske yazma kilitli) |

- [x] Geçti (misafir modu, tarayıcıda doğrulandı)

---

## 35. Misafir modu genel tur (2026-09-28)

| Adım | Beklenen |
|------|----------|
| Takım adına "beşiktaş" yaz | "BEŞİKTAŞ" (İ ile) |
| Başlığa "derbi" yaz, Enter | Başlık "DERBİ" olarak kaydedilir, modal kapanır |
| "Yeni oyuncu" → Escape | Yedeklerde yeni kart oluşmaz |
| "Yeni oyuncu" → isim → Enter | Tek bir yedek kartı oluşur |
| Yedek sil | Uygulama içi onay modalı; İptal hiçbir şey silmez |
| Tab tuşuyla saha kartına gel, Enter | Oyuncu düzenleme modalı açılır |
| Uzun saha adı (ör. KADIKÖY ARENA) 1280×720 ekranda | Footer'da kesilmeden görünür |
| İki sekme açık, birinde saha adı değiştir | Diğer sekmede güncellenir |
| 4 tema × 2 mod | Tüm arka planlar yüklenir, 404 yok |
| Arka plan kaldır (ilk kez) | Model indirilir, sonuç WebP; fotoğraf dışarı gönderilmez |

- [x] Geçti

---

## 36. Giriş yapmış kullanıcı — Firebase Emulator ile uçtan uca (2026-09-28)

**Nasıl:** `npm run emulators` + `npm run dev:emulator` (test hesabı: `firebase/emulator-test-users.json`). Gerçek projeye hiçbir şey gitmez; `firebase/*.rules` birebir uygulanır.

| Adım | Beklenen | Sonuç |
|------|----------|-------|
| Özelleştirilmiş misafir → yeni hesap (bulut boş) | Çatışma yok; kadro + logo/forma buluta yazılır | ✅ (H25 sonrası) |
| Oyuncu fotoğrafı ekle | Storage'a yüklenir, Firestore'da yalnızca yol | ✅ |
| Fotoğrafı kaldır | Yol ve Storage dosyası silinir, yenileyince geri gelmez | ✅ |
| Logo yükle, hemen çıkış yap | Çıkış öncesi kayıt gönderilir | ✅ |
| Tekrar giriş | Kadro, saha adı, yüklenen logo geri gelir; bulut ezilmez | ✅ (H23 sonrası) |
| Değişiklik yap, 8 sn dolmadan yenile | Çatışma modalı yok; değişiklik buluta gider | ✅ (H27 sonrası) |
| Misafir verisi + hesap: Bu cihazı kullan | Yerel kadro + branding buluta | ✅ |
| Misafir verisi + hesap: Birleştir | Bulut kadrosu + misafir oyuncular yedekte | ✅ |
| Misafir verisi + hesap: Bulutu kullan | Bulut birebir, logo/forma dahil; modal açıkken arkada veri değişmez | ✅ (H24, H28 sonrası) |
| İki sekme aynı hesap | Değişiklik diğer sekmeye yenilemeden gelir | ✅ |
| 7v7 → 6v6 | `formatOverflow` buluta yazılır, rules kabul eder | ✅ |
| Her yazım | revision tam +1 (sıkılaştırılmış rules) | ✅ |

- [x] Geçti (emülatör)

---

## 37. Forma numarası tekilliği (H29)

**Dosyalar:** `src/lib/teamJerseyNumbers.ts`, `src/lib/rosterIntegrity.ts`, `src/store/useAppStore.ts`, `src/components/PlayerEditModal.tsx`

| Adım | Beklenen |
|------|----------|
| İki takım modunda bir oyuncuya 9, aynı takımda başka oyuncuya 9 | Modal "9 numara X oyuncusunda; kaydedince 10 numara verilecek" der; ikinci oyuncu 10 olur |
| 99 doluyken başka oyuncuya 99 | 1'den devam eder, ilk boş numara (ör. 1 kalecideyse 2) |
| Takımlar arası sürükle-bırak, numara çakışıyor | Giren oyuncu bir yukarı kayar (ör. 9 → 10 dolu → 11) |
| Yedekten sahaya giren oyuncunun numarası dolu | Bir yukarı kayar |
| Tekrarlı numara içeren eski kayıt açılır | Önceki slot numarasını korur, sonrakiler bir yukarı kayar |
| Farklı takımlarda aynı numara | Serbest (kural takım içi) |

- [x] Geçti (tarayıcıda doğrulandı)

---

## 38. Kotalar ve güvenlik kuralları (R7)

| Adım | Beklenen |
|------|----------|
| 20 yedek varken | "Yeni oyuncu" pasif, "Yedek havuzu dolu" açıklaması |
| `npm run emulators` + `npm run test:rules` | 11/11 ✅ (revision, liste sınırları, dosya boyutu/adı, başka kullanıcı) |

- [x] Geçti

---

## 39. Hesap silme (R8) ve hata takibi (R6)

| Adım | Beklenen |
|------|----------|
| Header → hesap simgesi | Hesap penceresi: e-posta, giriş yöntemi, "Hesabımı sil" |
| Hesabımı sil → yanlış şifre | "E-posta veya şifre hatalı"; hiçbir veri silinmez |
| Doğru şifre + onay kutusu | Firestore dokümanı, tüm Storage dosyaları ve Auth hesabı silinir; cihaz misafir moduna döner |
| Google hesabı | Onay için Google penceresi açılır |
| Logo yükle (giriş yapılı) | "Logo buluta kaydedilemedi" gibi yanlış uyarı çıkmaz |
| Canlıda bir hata oluşur | Sentry'de `area` etiketiyle görünür; localhost'tan gönderim yok |
| Render hatası | Beyaz ekran yerine "Bir şeyler ters gitti" + yenile butonu |

- [x] Geçti (emülatör + LAN build)

---

## 40. Yeni senkron katmanı — SyncController (R4/R5)

**Dosyalar:** `src/lib/cloud/*`, `src/contexts/AuthContext.tsx`, `src/components/{AppBootstrapGate,UserAuthButton,LoginConflictModal}.tsx`, `src/store/useAppStore.ts` (persist v35, `editVersion`)

**Otomatik:** `npm test`: `syncController.test.ts` (21 senaryo, yarışlar dahil), `useAppStore.test.ts` (editVersion sözleşmesi), `cloudDocument.test.ts` (eski biçim).

| Adım | Beklenen | Sonuç |
|------|----------|-------|
| Misafir oyuncuya isim ver → giriş (bulut boş) | Çatışma yok; kadro revision 1 olarak yazılır | ✅ |
| Girişliyken saha adını değiştir | Tek yazım (debounce), revision +1; simge "Bulut kaydı güncel" | ✅ |
| Değiştir, 2,5 sn dolmadan yenile | Değişiklik kaybolmaz, buluta yazılır, çatışma açılmaz | ✅ |
| İki sekme: B'de düzenle | A sekmesine yenilemeden gelir; yankı yazımı yok | ✅ |
| İki sekme aynı anda farklı düzenleme | Biri kaydeder; diğerinde "Kadro başka bir yerde de değişti" | ✅ |
| O pencerede "Bu cihazı kullan" | Bu sekmenin kadrosu buluta; diğer sekme de ona döner | ✅ |
| Çıkış | Bekleyen kayıt gönderilir; cihaz verisi, sahip/senkron işaretleri silinir | ✅ |
| Misafir verisi + giriş → "Birleştir" | Bulut kadrosu + misafir oyuncu yedekte; buluta yazılır | ✅ |
| Eski biçimli doküman (`branding` alanı) | Logo/forma branding'den uygulanır; bir kez yeni biçimde yeniden yazılır, eski alanlar silinir | ✅ |
| Hesap silme: yanlış şifre | Hata; senkron devam eder, hiçbir şey silinmez | ✅ |
| Hesap silme: doğru şifre | Doküman, tüm Storage dosyaları ve Auth hesabı silinir; misafir moduna dönülür | ✅ |
| Oyuncu fotoğrafı ekle | Storage'a yüklenir; Firestore'da yalnızca yol | ✅ |
| Çıkış → tekrar giriş (yeni cihaz gibi) | Fotoğraf Storage'dan gelir; gereksiz yazım yok (revision değişmez) | ✅ |
| Fotoğrafı kaldır | Yeni revision; Storage dosyası silinir | ✅ |
| Logo yükle | `logos/home.webp` Storage'da; Firestore'da `mode: upload` + yol | ✅ |
| Bağlantı yokken düzenle → çıkış | 20 sn sonra "kaydedilemedi… Yine de çık" uyarısı; veri silinmez | ✅ |
| Buluta sığmayan fotoğraf (`photosOmitted`) → yenile | Cihazdaki fotoğraf korunur, "kopyalar korundu" notu (birim testi) | ✅ (test) |
| Ağ kesikken giriş / bağlantı geri gelince otomatik devam | Yükleme ekranı takılmaz; simge "… Tekrar denenecek" | Bekliyor (pilot) |

- [x] Geçti (emülatör, 2026-09-28)

---

## 41. Saha dizilimi ve oyuncu kartı (2026-09-29)

**Dosyalar:** `src/components/PlayerAvatar.tsx`, `src/lib/formationEngine.ts`, `src/lib/posterLayout.ts`, `src/lib/formations.ts`

**Otomatik:** `formationLayout.test.ts` — 17 formasyon × 3 ekran × iki mod: hiçbir kart diğerine binmez, tekli modda sahadan taşmaz, kart boyutu postere orantılı.

| Adım | Beklenen |
|------|----------|
| İki takım 7v7 / 8v8 | Hatlar sahaya yayılır (orta şeride sıkışmaz); kaleci orta hatla aynı hizada; kartlar önceye göre ~%15 büyük |
| 8v8 4'lü hat (4-2-1) | Dört kart çakışmadan sığar |
| Tek takım | Kartlar ~%17 büyük; hatlar yatayda yayılır; forvet orta sahanın üstüne binmez |
| 1280×720 ve 27" ekran | Aynı formasyon aynı oranda görünür (kart boyutu postere orantılı; alt sınır 36px, üst 200px) |
| Kart | Foto halkası ve isim plakası çizgisi takım renginde (koyu formada ikinci renk / krom); numara ve isim Bebas Neue; koyu numarada açık hale |
| Yedek paneli / oyuncu penceresi | Aynı kart stili, panele sığar |

- [x] Geçti (tarayıcı 1440×900 + otomatik test)

---

## 42. Araç çubuğu, yedek paneli, alt bilgi (2026-09-29)

**Dosyalar:** `src/components/PosterToolbar.tsx`, `BenchPanel.tsx`, `MatchPoster.tsx`, `src/lib/teamColors.ts`, `public/posters/thumbs/*`

| Adım | Beklenen |
|------|----------|
| Araç çubuğu | Kadro ve format segment kontrol; tema küçük arka plan görselleri (~10 KB) + aktif tema adı |
| Diziliş düğmesi | Takım rengi noktası + takım adı + formasyon; açılınca formasyonlar küçük saha şemasıyla; dışarı tıkla / Esc kapatır |
| Deplasman dizilişi | Şema aynalı (kaleci sağda); yalnızca iki takım modunda |
| Yedek paneli | Başlıkta `n/20`; iki sütunlu kompakt kartlar; düzenle/sil üzerine gelince belirgin |
| Boş yedek paneli | Kesikli çerçeve, "sahadaki bir oyuncuyu buraya sürükle" ipucu |
| Yedeği sahaya sürükle | Oyuncu slota geçer, panelden çıkar |
| Alt bilgi (saha/saat/tarih) | Bebas Neue; boyut poster genişliğine bağlı (`cqw`), ekran boyutundan bağımsız |
| Takım adı ve logo | Postere orantılı (eski px sınırları kalktı): 27" ekranda da aynı oran |
| App Check | Site anahtarı yoksa hiçbir şey değişmez; varsa konsolda doğrulanmış istekler görünür |

- [x] Geçti (tarayıcı 1440×900)

---

## 43. Pilot bulguları (2026-10-01)

| Adım | Beklenen |
|------|----------|
| Yeni kullanıcı / Posteri sıfırla | Tema Şampiyonlar Ligi, başlık mavi; ev sahibi beyaz kartal, deplasman sarı-lacivert |
| Tema seçici | Daha büyük küçük resimler, sağda yazı yok |
| Paylaş menüsü | WhatsApp / X: panoya kopyalar + "Web'i aç" bildirimi; Instagram: indirir + "Instagram'ı aç"; Panoya kopyala; destekleyen tarayıcıda "Diğer…" (sistem paylaşımı) |
| Pano izni yoksa | Hata değil: poster indirilir, "sürükleyip bırak" bildirimi |
| Poster İndir / paylaşım | Hazırlanırken animasyonlu "Poster hazırlanıyor…" katmanı; çıktıda "Düzenle" / "Başlık ekle" ipuçları yok |
| Gizlilik → Uygulamaya dön | Yeni sekmede açıldıysa sekme kapanır (var olan sekmeye dönülür); aynı sekmedeyse geri gider |
| Başlık penceresi → "Posterde göster" kapalı | Başlık posterden kalkar; yerine soluk "+ Başlık ekle" (JPEG'e girmez); yazılar ve stil saklanır |
| Yeni poster / Posteri sıfırla | Başlık kapalı başlar, yalnızca soluk "+ Başlık ekle"; eski kayıtlarda başlık görünür kalır |
| "+ Başlık ekle" | Pencere "Posterde göster" açık gelir; Kaydet → başlık görünür, Vazgeç → kapalı kalır |
| Oyuncu numarası | Harf ve 3. basamak yazılamaz (yapıştırmada da); "07" → 7 |
| Arka plan kaldırılırken | Fotoğraf değiştir / Geri al / Fotoğrafı kaldır pasif; işlem bitmeden fotoğraf değişse bile sonuç yanlış fotoğrafa yazılmaz |
| Yedek kartları | Her iki modda 96 px (tek takımda küçülmez), iki sütun |
| Tarih | Geçmiş tarihli kayıt açılınca bugüne çekilir; seçicide geçmiş günler pasif |
| Saat | Maç bugünse geçmiş saat seçilemez (bir sonraki çeyrek saate çekilir) |

- [x] Geçti (tarayıcı 1440×900; pano izni bu ortamda kapalı olduğu için yedek yol doğrulandı, çıktı 2400×1500 JPEG)

---

## Otomatik kontroller (her değişiklikte)

```bash
npm run build
npm run lint
```

- [x] Build geçti
- [x] Lint geçti

---

## Değişiklik günlüğü

| Tarih | Değişiklik | Test edilen maddeler | Sonuç |
|-------|------------|----------------------|-------|
| 2026-06-23 | Başlık modalı: sabit önizleme, renk paleti (Kırmızı/Mavi/Turkuaz/Gri), "Poster temasına uy" | #8 + build/lint | Kod + build/lint geçti |
| 2026-06-23 | Stabilizasyon: `useModalBackdrop` tüm modallarda, cutout data URL persist, BenchPanel dynamic import, lint/build temiz | 1–10 + otomatik | Kod incelemesi + build/lint geçti; #3 manuel tarayıcı testi önerilir (ONNX model indirme) |
| 2026-08-28 | Firebase Storage kurulumu, production rules, data map replace ve medya fail-soft akışı | §11 + §13 + build/lint | Storage rules deploy edildi; preflight HTTP 200; manuel uygulama testi bekliyor |
| 2026-08-28 | Sync durability refactor: revision guard, durable outbox, `onSnapshot`, rules allowlist | §14 + build/lint | Rules deploy edildi; revision 10 mevcut dokümanda doğrulandı; iki istemci/offline manuel testi bekliyor |
| 2026-09-04 | Tek takım dikey poster ve pitch interaction düzeltmeleri | §15 + build/lint | İkili mod taşıma/cross-team swap/forma conflict manuel doğrulandı; tekli QA devam ediyor |
| 2026-09-07 | Sürükleme görselleri: swap'te iki kart da yeşil, yedek değişiminde giren/çıkan ok işaretleri, tekli mod yan boşluk renklendirmesi | #6 + #15 + build/lint | Build/lint geçti; manuel tarayıcı doğrulaması bekliyor |
| 2026-09-14 | Auth güvenliği ve misafir göstergeleri: çıkış onay dialogu + localStorage temizliği, misafir "Yerel" rozeti, Firebase yapılandırılmamışsa "Çevrimdışı" rozeti | #16 + build/lint | Build/lint geçti; manuel tarayıcı doğrulaması bekliyor |
| 2026-09-14 | Varsayılan ayarlar ve toolbar temizliği: uygulama iki takım modunda açılır, default saha adı "HALI SAHA", fotoğraf ölçek slider’ı ve bağlı kodlar kaldırıldı | #9 + #17 + build/lint | Build/lint geçti; manuel tarayıcı doğrulaması bekliyor |
| 2026-09-14 | Misafir depolama: localStorage yerine IndexedDB tabanlı Zustand persist; eski localStorage verisi otomatik migrate; çıkışta IndexedDB temizleniyor | #18 + build/lint | Build/lint geçti; manuel tarayıcı/depolama doğrulaması bekliyor |
| 2026-09-14 | Depolama ve bulut sync güvenliği: IndexedDB setItem localStorage yedeği tutuyor; ilk bulut çekme bitmeden push engelleniyor | #18 + build/lint | Build/lint geçti; manuel tarayıcı doğrulaması bekliyor |
| 2026-09-14 | Misafir çoklu sekme senkronizasyonu ve giriş çatışması diyaloğu | #19 + build/lint | Build/lint geçti; manuel tarayıcı doğrulaması bekliyor |
| 2026-09-14 | SEO / PWA / Analytics: meta tagler, OG/Twitter Card, favicon, manifest, robots, sitemap, GA4 entegrasyonu; performans: `html-to-image` ve `LogoDesignerModal` lazy load; erişilebilirlik: modal Escape, oyuncu kartı aria-label | #20 + #21 + #22 + build/lint | Build/lint geçti; canlı domain doğrulaması + GA4 ID girilmesi bekliyor |
| 2026-09-14 | GA4 özel eventleri: tüm kullanıcı aksiyonları (kadrо, fotoğraf, arka plan, sürükle-bırak, yedek, logo, forma, tema, başlık, saha adı/tarih, auth, indirme) | #23 + build/lint | Build/lint geçti; canlıda event testi bekliyor |
| 2026-10-01 | Pilot bulguları: paylaş menüsü + hazırlanıyor animasyonu, başlık gizleme (persist v37), numara alanı, arka plan kaldırma yarışı, yedek kart boyutu, tarih/saat kuralları, gizlilik dönüşü, yeni varsayılanlar | §43 + 184 test | Geçti |
| 2026-09-29 | Araç çubuğu (segment, tema görselleri, şemalı diziliş), yedek paneli (ızgara, sayaç), alt bilgi ve takım adı/logo postere orantılı, App Check (opsiyonel) | §42 + build/lint/test | Geçti |
| 2026-09-29 | Saha dizilimi ve oyuncu kartı: hatlar sahaya yayılır, kartlar büyük ve postere orantılı, takım renkli halka/plaka, Bebas numara; önceden var olan çakışmalar giderildi (29 senaryo) | §41 + 103 yerleşim testi | Geçti |
| 2026-09-29 | Logo/forma penceresi yeniden tasarım: taslak + Kaydet/Vazgeç, game-icons dolgu sembolleri (28), görsel seçiciler, logonun renkleriyle forma, Çapraz şerit | §7 + build/lint/test | Tarayıcıda doğrulandı |
| 2026-09-29 | Başlık düzenleyici yeniden tasarım (ortak çizim, gerçek arka planlı önizleme, tek satır, efekt kartları, cqw ölçek; döndürme/max genişlik kaldırıldı, persist v36) | §8 + build/lint/test | Tarayıcıda 1280×720 ve 1440×900 doğrulandı; JPEG çıktısı kullanıcıda |
| 2026-09-28 | R4/R5: SyncController'a geçiş; eski senkron modülleri (~1.750 satır) kaldırıldı; persist v35 `editVersion` | §11 + §36 + §40 + build/lint/test | Emülatörde uçtan uca geçti |
| 2026-09-21 | Performans ve erişilebilirlik: arka plan kaldırma model preload’u kaldırıldı; oyuncu kartı `aria-label` görünen numara+isimle eşleştirildi; toolbar “Poster İndir”/tema/format/diziliş butonları renk kontrastı `bg-green-700`/`text-zinc-400` yapıldı | #3 + #22 + build/lint | Build/lint geçti; Lighthouse/PWA yeniden ölçümü bekliyor |

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

### 12 — Fotoğraf kalitesi

| Adım | Beklenen |
|------|----------|
| Sayfayı yenile (store v31 migrate) | `teamMode` ve mode-specific pozisyonlar korunur, eski kayıtlar `versus` olur ve `didCompress: false` ile işaretlenir |
| App boşta beklerken idle callback | `compressAllSavedPlayers` eski fotoğrafları 400px'te yeniden sıkıştırır |
| Yeni oyuncu fotoğrafı ekle | `photoSource` 400px max edge, JPEG Q85 olmalı (200px/75'ten iyileşme) |
| Arka plan kaldır | `cutoutUrl` 400px max edge, WebP Q85 olmalı |
| Poster export (2x) | Fotoğraflar bulanık değil, net görünmeli |
| Firebase Storage upload | `source.jpg` ve `cutout.webp` yeni kalitede yüklenmeli |
| Eski cihazda localStorage | ~1-1.5MB (18 oyuncu × 2 foto), 5MB limit altında kalır |

**Bilinen sınırlama:** `substituteTarget` sayfa yenilenince sıfırlanır (React state).

**Bilinen sınırlama:** `substituteTarget` sayfa yenilenince sıfırlanır (React state).
