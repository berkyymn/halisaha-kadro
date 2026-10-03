# Canlıya Çıkış İş Listesi

Kaynak: kullanıcı bulguları + 2026-09-28 kod incelemesi.
Durumlar: `[ ]` yapılacak · `[x]` yapıldı (kod + test) · `[~]` kısmen / kullanıcı aksiyonu bekliyor.
Her madde için test adımları `docs/QA-CHECKLIST.md` §24–§33'tedir.

---

## Faz 1 — Kullanıcı bulguları

- [x] **L1** Oyuncu düzenleme modalında `Enter` kaydedip kapatır
- [x] **L2** Yeni web ikonu (favicon, 192/512 PWA, apple-touch, OG görseli ile uyumlu)
- [x] **L3** Yedek oyuncular tarafsız (gri/siyah/beyaz) formayla gösterilir; sahaya girince takım formasını alır
- [x] **L4** Saat alanı serbest metin değil; saat ikonu/alanı ile saat seçici açılır, format `SS:DD`
- [x] **L5** Tek takım modunda ikinci takımın oyuncuları kaybolmaz: yedekler panelinde ayrı grup olarak görünür, sürükle-bırak ile kadroya alınabilir
- [x] **L6** Mobil / tablet girişinde uygulama kapalı; "Mobil uygulamamız yakında" ekranı + PC'den kullanım yönlendirmesi
- [x] **L7** Giriş çatışması seçenekleri gerçekten işlevsel:
  - "Bu cihazı kullan" → yerel kadro + logo/forma buluta yazılır
  - "Bulutu kullan" → yerel veri tamamen buluttakiyle değişir (yerel foto/logo karışmaz)
  - "Birleştir" → bulut temel alınır, bu cihazdaki özel oyuncular yedeklere eklenir

## Faz 2 — İnceleme bulguları (hata düzeltmeleri)

- [x] **H1** Sürüklerken her fare hareketinde tüm state'in diske yazılması (drag state ayrı, persist edilmeyen store'a taşınır)
- [x] **H2** "Posteri sıfırla" onay sormuyor ve oyuncu kayıtlarını boş bırakıyor
- [x] **H3** Fotoğraf silinince/değişince bulut Storage yolu kalıyor → foto geri geliyor; foto değişince eski cutout kalıyor
- [x] **H4** Çıkış yaparken bekleyen bulut kaydı gönderilmeden yerel veri siliniyor
- [x] **H5** Yüklenen logo buluttan dönerken kayboluyor (`storagePath` normalize'da siliniyor, https logo "bozuk" sayılıyor)
- [x] **H6** Her açılışta gereksiz bulut yazması (`applyFormations` değişiklik yokken de state yazıyor)
- [x] **H7** Medya upload cache anahtarı çakışabiliyor (tam içerik hash'i)
- [x] **H8** PNG çıktı çözünürlüğü pencereye bağlı → sabit yüksek çözünürlük
- [x] **H9** Fotoğraf seçme/kaydetme hataları yakalanmıyor (HEIC vb.) → kullanıcıya mesaj
- [x] **H10** Yüklenen logo JPEG'e çevrilip şeffaflığı kayboluyor → WebP
- [x] **H11** Forma numarası 1–99 dışına çıkabiliyor
- [x] **H12** Production'da `[SYNC-DIAG]` / `[SYNC]` konsol logları
- [x] **H14** Format küçülünce özel oyuncular siliniyordu → yedeğe iner, format büyüyünce kendi takımına döner (`rosterIntegrity.ts`, persist v34 `formatOverflow`); kadro değişmezleri tek yerde (`normalizeRoster`)
- [x] **H15** Kritik: depolama okunmadan yapılan `set()` varsayılan kadroyu diske yazıp kayıtlı veriyi silebiliyordu → okuma bitene kadar yazma kilidi
- [x] **H16** Türkçe büyük harf: başlık/takım adı `toUpperCase()` "i"yi "I" yapıyordu → `toLocaleUpperCase("tr-TR")`; poster `lang="tr"` (PNG çıktısı)
- [x] **H17** "Yeni oyuncu"dan vazgeçince boş "Yedek N" kalıyordu → oyuncu yalnızca kaydedince oluşur; yedek silme onayı uygulama içi modal
- [x] **H18** IndexedDB: tek paylaşılan bağlantı, zaman aşımı (4 sn → localStorage), okumada IDB/localStorage'dan yeni olanı seç (sonsuz "yükleniyor" ve veri geri gitme riski)
- [x] **H19** Klavye erişimi: saha kartları Tab ile odaklanır, Enter/Boşluk düzenler; başlık/saha adı Enter ile kaydeder; metin uzunluk sınırları (takım 18, saha 24, başlık 16)
- [x] **H20** Footer'da saha adı kesiliyordu → sütun oranları düzenlendi
- [x] **T1** Takım adı logonun üstünde; logo ve ad boyutu posterle orantılı (1024–1920 test edildi, uzun adlar başlığa/kaleciye değmiyor)
- [-] **T2** Tema arka planları düşük çözünürlüklü — kullanıcı kararı: şimdilik yapılmayacak
- [x] **H21** Poster 16:10 / 4:5 oranını korumuyordu (dar pencerede 1.44) → container units ile her ekranda doğru oran; PNG çıktısı sabit oranlı
- [x] **H22** Yer tutucular ("Oyuncu N") yedeğe iniyordu; sahadan yedeğe gönderince slot boş kalıyordu → yer tutucu yedeğe inmez, slot anında dolar
- [x] **H23** KRİTİK: Çıkış / yeni cihaz sonrası girişte boş yerel kadro "daha yeni" sayılıp bulutu eziyordu → otomatik dizilim ve sıkıştırma zaman damgasını değiştirmez; özelleştirilmemiş yerel kadroda bulut kazanır
- [x] **H24** KRİTİK: Logo değişiminden sonra yalnızca veri kaydı yapılırsa bulut yüklemesi çöküyordu (branding atlanıyor, forma undefined) → branding slim veriye her zaman uygulanır; normalizasyon dayanıklı
- [x] **H25** İlk girişte (bulut boş) logo/forma buluta yazılmıyordu
- [x] **H26** Sahipsiz Storage dosyaları silinmiyordu; branding-only kayıtta tüm oyuncu fotoğraflarını silebilecek karşılaştırma → bulut hâlleri karşılaştırılıyor, branding kaydında temizlik yok
- [x] **H27** Aynı kullanıcının gönderilmemiş değişiklikleri "başka kadro" çatışması sanılıyordu → yerel veri sahibi işaretleniyor
- [x] **H28** Canlı dinleyici, giriş çatışması çözülmeden misafir verisini sessizce birleştiriyordu → ilk yükleme bitene kadar bekletiliyor
- [x] **H29** Aynı takımda aynı forma numarası verilebiliyordu → tek kural (`resolveJerseyNumber`): doluysa bir yukarı, 99'dan sonra 1; modal kaydı, yedekten giriş, takımlar arası değişim, format büyütme, yer tutucular ve yüklemede (`normalizeRoster`) uygulanıyor; modalda uyarı
- [x] **H13** Giriş modalı: "Şifremi unuttum" yok; olmayan mobil uygulamaya atıf var

## Faz 3 — Yayın / altyapı

- [x] **Y1** `dist/dev` (dev cache, ~150MB) Hosting'e yüklenmesin (`firebase.json` ignore)
- [x] **Y2** Site URL'si (canonical, OG, robots, sitemap) env'den üretilsin; şimdilik `web.app` domaini
- [~] **Y3** Storage CORS'a production origin eklensin → `gcloud` komutunu kullanıcı çalıştırır
- [~] **Y4** Firebase security rules sıkılaştırıldı ve `--dry-run` ile derlendi → deploy kullanıcı onayıyla (`npm run deploy:rules`)
- [x] **Y5** KVKK: çerez/analitik onay banner'ı (GA4 Consent Mode, onaysız ölçüm yok)
- [~] **Y6** `/gizlilik` sayfası hazır → `src/lib/legal.ts` içindeki veri sorumlusu adı ve e-posta doldurulmalı; metin bir hukukçuya gösterilmeli
- [x] **Y7** Ölü kod temizliği (`cloudActions`, `cloudLoader`, `lineupSlots`, `PhotoEditorModal`…) + doküman düzeltmeleri
- [x] **Y9** Hosting önbellek başlıkları: yalnızca `/_next/static/**` 1 yıl immutable; ikon/görseller 1 gün; HTML/txt/json her seferinde doğrulanır (eski ikon ve sürüm karışması sorunu)
- [~] **Y8** Domain alımı → Firebase Hosting custom domain, Auth "authorized domains", CORS, `NEXT_PUBLIC_SITE_URL` (kullanıcı, rehberle)

## Faz 4 — Doğrulama

- [x] `npm run build` + `npm run lint`
- [x] Tarayıcıda misafir akışlarının uçtan uca testi (desktop + mobil kapı)
- [~] Giriş yapmış kullanıcı akışları (bulut sync, çatışma, logo/foto kalıcılığı) → kullanıcı kendi hesabıyla test eder (QA §27, §30, §31)

## Ertelenenler (canlı sonrası)

- Branding-only hafif kayıt yolu (revision sınıflandırması) — şu an tam kayıt yapılıyor, doğru çalışıyor
- Kaptan seçiminin "Kaydet"e kadar bekletilmesi
- Hesap silme + sunucu tarafı medya temizliği, App Check
- Sentry benzeri hata takibi

---

## Kullanıcı aksiyonları (sırayla)

1. **Giriş yapmış kullanıcı testleri** (QA §30, §31, §32 bulut satırları) — kendi hesabınla, iki tarayıcı/cihazla.
2. **Rules deploy:** `npm run deploy:rules`
3. **Storage CORS** (Google Cloud SDK gerekir):
   `gcloud storage buckets update gs://hali-saha-kadro-97082.firebasestorage.app --cors-file=firebase/storage.cors.json`
   (bucket adını Firebase Console → Storage'dan doğrula)
5. **Hosting deploy:** `npm run deploy:hosting`
6. **Domain alınca:**
   - Firebase Console → Hosting → *Add custom domain* → DNS'e verilen A/TXT kayıtlarını gir (SSL otomatik)
   - Firebase Console → Authentication → Settings → *Authorized domains* → yeni domaini ekle
   - `.env.local` → `NEXT_PUBLIC_SITE_URL=https://yenidomain.com`
   - `firebase/storage.cors.json` → origin listesine yeni domaini ekle, 3. adımı tekrarla
   - (Opsiyonel) Google ile girişte "hali-saha-kadro-97082.firebaseapp.com" yerine kendi domaininin görünmesi için `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` + OAuth redirect URI ayarı
   - `npm run deploy:hosting`

### Canlıya çıkış — güncel sıra (2026-10-02)

1. **App Check → Enforce** (Firebase Console → App Check → APIs → Cloud Firestore ve Cloud Storage; "Verified" ~%100 ise). Öncesinde localhost debug token'ı konsola ekli olmalı.
2. **Tarayıcı turu** (kullanıcı): Safari ve Firefox'ta aç → poster indir, Paylaş → WhatsApp (panoya kopyala), fotoğraf yükle + arka plan kaldır, giriş yap / çıkış yap.
3. **Domain al** → Firebase Console → Hosting → *Add custom domain* → DNS kayıtları (SSL otomatik).
4. Domain eklenince: Authentication → Settings → *Authorized domains*; reCAPTCHA admin → alan adları; `firebase/storage.cors.json` origin + `gcloud storage buckets update … --cors-file`; `.env.local` → `NEXT_PUBLIC_SITE_URL=https://alanadi.com`.
5. `npm run deploy:hosting` → yeni domainde duman testi (giriş, kayıt, indirme, paylaşım).
6. Paylaşım: linki gruplara at; Sentry ve Analytics'i ilk 48 saat izle.

**Durum (2026-10-02):** `halisahakadro.com` alındı (isimtescil; ayrıca .com.tr ve .xyz). DNS: A @ → 199.36.158.100, TXT @ → `hosting-site=hali-saha-kadro-97082`, CNAME www → `hali-saha-kadro-97082.web.app` (isimtescil → IP Bazlı DNS Yönetimi; "Host Name (DNS) Yönetimi" NS sayfasıdır, dokunma). Storage CORS'a iki domain eklendi ve bucket'a uygulandı; `NEXT_PUBLIC_SITE_URL` ve `FALLBACK_SITE_URL` yeni domain. 2026-10-03: `https://halisahakadro.com` Connected (Google Trust Services sertifikası), `www` → 301 ana adrese.

### App Check ve yedekleme (pilot öncesi)

**Durum (2026-09-29):** App Check 1–3 ✅ (reCAPTCHA v3 anahtarı, konsol kaydı, canlıda deploy — token alışverişi doğrulandı); 4 yerel debug token `.env.local`'de sabit (`NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN`), konsola eklenmeli; 5 **Enforce** 1–2 gün metrik izledikten sonra. Firestore günlük yedek ✅ (7 gün saklama).

**Düzeltme (2026-10-02):** Konsol uygulamayı **Fraud Defense (reCAPTCHA Enterprise)** sağlayıcısıyla kaydetmiş; kod `ReCaptchaV3Provider` kullandığı için canlıda token alışverişi 400 "App not registered" veriyordu (metriklerde doğrulanmış istek ~%0–6, yalnızca localhost debug token'ı). Kod `ReCaptchaEnterpriseProvider`'a geçti, aynı site anahtarıyla `exchangeRecaptchaEnterpriseToken` 200 döner. Deploy sonrası metrikleri 1–2 gün yeniden izle, sonra Enforce.

**A. Firebase App Check** — Firestore/Storage'a yalnızca bu uygulamanın erişmesini sağlar; biri API anahtarını alıp kotayı tüketemez. Kod hazır (`src/lib/firebase/client.ts`), site anahtarı girilene kadar kapalı.

1. https://www.google.com/recaptcha/admin/create → **reCAPTCHA v3** → alan adları: `hali-saha-kadro-97082.web.app`, `hali-saha-kadro-97082.firebaseapp.com`, `localhost` (domain alınınca onu da ekle) → *Site anahtarı* ve *Gizli anahtar*ı kopyala.
2. Firebase Console → **App Check** → *Apps* → web uygulaması → **reCAPTCHA** → *gizli anahtarı* yapıştır → Kaydet.
3. `.env.local` → `NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<site anahtarı>` → `npm run deploy:hosting`.
4. Localhost için: `.env.local` → `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN=<uuid>` (her tarayıcıda aynı token; yoksa her tarayıcı konsola kendi rastgele token'ını basar) → Firebase Console → App Check → *Apps* → ⋮ → **Manage debug tokens** → ekle → `npm run dev`'i yeniden başlat. Token canlı pakete girmez (yalnızca geliştirme modunda okunur).
5. **1–2 gün bekle**, sonra Firebase Console → App Check → *APIs* → **Cloud Firestore** ve **Cloud Storage** için metriklerde "Verified requests" ~%100 ise → **Enforce**. (Önce zorlama yapma: eski sekmesi açık kullanıcılar ve yanlış yapılandırma herkesi kilitler.)

**B. Firestore yedekleri** (Blaze, maliyeti bu veri boyutunda kuruşlar):

- Günlük yedek, 7 gün sakla (Firebase Console → Firestore → *Disaster recovery* → *Backups* → *Create schedule*; ya da):
  `gcloud firestore backups schedules create --database='(default)' --recurrence=daily --retention=7d --project=hali-saha-kadro-97082`
- Ek güvence (opsiyonel): son 7 günün herhangi bir dakikasına dönebilmek için PITR:
  `gcloud firestore databases update --database='(default)' --enable-pitr --project=hali-saha-kadro-97082`
- Storage (fotoğraflar) için ayrı yedek gerekmez: kaybolsa kullanıcı yeniden yükler; asıl değer Firestore'daki kadro verisi.

---

# Faz 5 — Canlı sonrası yol haritası (2026-09-28 kararları)

Sıra önemli: önce testler (refactor'ların güvenlik ağı), sonra refactor'lar.

## Kararlar
| Konu | Karar |
|------|-------|
| Domain | Hazır olunca; şimdilik `web.app` |
| Firebase planı | Blaze → bütçe uyarısı + uygulama kotaları şart |
| Hesap silme | Uygulama içi, tam otomatik ("Hesabımı sil") |
| Hata takibi | Crashlytics benzeri: Sentry (web için en yakın karşılık); GA yalnızca kullanım ölçümü |
| Paylaşım | JPEG çıktı (kalite kaybı olmadan ~1 MB) |
| Tarayıcı | Brave (Chromium) kullanıcı testi; Safari/Firefox en az bir kez kontrol |
| Yayın | Önce 3–5 kişilik pilot grup |

## İş listesi
- [x] **R1** Otomatik test altyapısı (Vitest, 36 test, GitHub Actions CI) — emülatör entegrasyon testleri R5 ile: kadro kuralları, forma numarası, snapshot birleştirme, branding, göçler; ardından emülatör entegrasyon testleri
- [x] **R2** Ufak temizlikler (persist edilen `playerCardSize` R3'te göçle kalkacak): kullanılmayan `setMode`, `setPlayerCardSize`, `playerCardSize`, `posterSyncEvents`, `clearSlot`, `fingerprintPosterData/Branding`…
- [ ] **R3** Store refactor: tek oyuncu kaydı (`players`/`savedPlayers` birleşimi), aksiyonların konu bazlı ayrılması, eski göçlerin sıkıştırılması
- [x] **R4** Bulut veri modeli sadeleştirme: tek parça doküman (logo/forma `data` içinde; eski `branding` alanı okunur ve ilk yazımda silinir), 4 revision türü yerine tek `editVersion` (persist v35); tek okuma/yazma katmanı `src/lib/cloud/posterRepository.ts`
- [x] **R5** AuthContext refactor: `SyncController` durum makinesi (idle → loading → conflict/ready), React'ten bağımsız ve birim testli; eşzamanlı düzenleme artık sessizce ezilmiyor, kullanıcıya soruluyor. AuthContext ~870 → ~220 satır; eski senkron modülleri kaldırıldı
- [x] **R6** Hata takibi: Sentry (EU), yalnızca hatalar, kişisel veri yok, sürüm = paket+git sha, hata sınırı (kurtarma ekranı), yakalanan hatalar alan etiketiyle; gizlilik metni güncellendi. İlk testte gerçek bir hata yakalandı: `crypto.randomUUID` güvenli olmayan bağlam/eski Safari’de yok → `createId()` fallback
- [~] **R7** Kotalar: yedek 20 (uygulama), rules: ≤60 oyuncu / ≤40 yedek, Storage dosya ≤1 MB — `npm run test:rules` (11/11 emülatörde) ✅; **GCP bütçe uyarısı kullanıcı tarafından kurulacak**
- [x] **R8** Uygulama içi hesap silme: Hesap → Hesabımı sil; yeniden doğrulama → senkron durur → Storage (sahipsizler dahil) → doküman → Auth → cihaz. Emülatörde uçtan uca ✅; rules 15/15 ✅. Yan bulgu: logo yüklenince çıkan yanlış "buluta kaydedilemedi" uyarısı düzeltildi
- [x] **R9** JPEG poster çıktısı (%92, 2400×1500 ≈ 0,7 MB; önce PNG 5,6 MB)
- [ ] **R10** Safari/Firefox kontrolü, pilot grup geri bildirimleri
