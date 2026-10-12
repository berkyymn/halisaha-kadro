# Platform karşılaştırması (2026-10-12, `mobil-web`)

Denenen ortamlar: PC Chrome (canlı `main` ↔ yerel `mobil-web`, 1440×900 ve 1280×720),
Android Chrome ve Android ana ekran uygulaması (Pixel 9a emülatörü, önizleme kanalı, HTTPS),
iPhone Safari ve iPhone ana ekran uygulaması (iPhone 17 / iOS 26.5 ve iPhone 18 Pro / iOS 27 simülatörü).
Girişli akışlar (bulut kaydı, çıkış, hesap silme) gerçek hesapla denenmedi.

## Dizilişler

Poster her cihazda aynı iç boyutta çiziliyor (iki takım 1200×750, tek takım 640×800) ve ekrana
yalnızca ölçekleniyor. Kart konumları PC ile Android arasında ölçüldü: 14 kartın hepsi posterde
aynı oranda (fark ≤ %0,1). Başlık, numara ve isim yazı boyutları da aynı. İndirilen poster her
cihazda aynı.

## İşlev karşılaştırması

| Akış | PC | Android Chrome | Android uygulama | iPhone Safari | iPhone uygulama |
|---|---|---|---|---|---|
| Tarih / saat seçici | ✅ | ✅ (tam ekranda da) | ✅ | ✅ | ✅ |
| Oyuncu adı / numara | ✅ | ✅ (klavye yakınlaştırmaz) | ✅ | ✅ (yakınlaştırmaz) | ✅ |
| Fotoğraf ekle | ✅ | ✅ (seçiciden sonra tam ekran geri gelir) | — | gerçek cihazda denenmeli | gerçek cihazda denenmeli |
| Sürükle: takas | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sürükle: sahadan yedeğe / yedekten sahaya | ✅ | ✅ / ✅ | ✅ | ✅ / denenmedi | ✅ |
| Paylaş | WhatsApp/Instagram/X/Pano menüsü | Sistem paylaşımı + Telefona indir | aynı | Sistem paylaşımı + Fotoğraflara kaydet (HTTPS) | aynı |
| Tam ekran | — | ✅ düğme (dikey/yatay) | gereksiz (adres çubuğu yok) | yok (Safari desteklemiyor) | gereksiz |
| Ana ekrana ekle | — | ✅ kurulum penceresi | — | ✅ adım kartı (Paylaş → Ana Ekrana Ekle) | — |
| Kadro (misafir) | yerel | yerel | Chrome ile **ortak** | yerel | Safari'den **ayrı** (giriş notu var) |

## Bulunan hatalar ve durumları

1. **iPhone'da "Kadro yükleniyor"da kalma — DÜZELTİLDİ (yerelde).**
   Askıya alınmış başka bir Safari sekmesi Firebase'in oturum deposunu (IndexedDB) kilitli
   tutunca oturum kontrolü hiç bitmiyor, uygulama yükleme ekranında kalıyordu (simülatörde
   25+ sn, tekrarlandı). Ayrıca Firebase açılışta Google giriş iframe'ini bekliyordu.
   Düzeltme: oturum kontrolü en fazla 4 sn beklenir, sonra yerel kadroyla açılır;
   Google giriş çözücüsü yalnızca girişte yüklenir (`lib/firebase/app.ts`, `AppBootstrapGate`).
2. **Ana ekrandan açılışta beyaz ekran (iPhone) — kısmen.** Zemin koyu yapıldı; iOS'un kendi
   başlatma süresi (~5 sn simülatörde) devam ediyor. Açılış görselleri (apple-touch-startup-image)
   ile kapatılabilir — karar bekliyor.
3. **iPhone ana ekran uygulaması Safari'nin kadrosunu görmez — iOS kısıtı.** Misafire
   "önce giriş yap" notu gösteriliyor. Android'de Chrome ile uygulama aynı kadroyu paylaşıyor.

## PC'de `main`'e göre farklar

| Fark | Durum |
|---|---|
| Poster, pencereler, toolbar, paylaş menüsü, giriş penceresi, logo / ücret / oyuncu pencereleri | Birebir aynı (konum ve boyut ölçüldü) |
| İsim etiketleri biraz daha geniş (kartın kenarından taşıyor), yazı boyutu aynı | Mobil turundaki "isim kesilmesin" düzeltmesinin yan etkisi; indirilen postere de yansıyor |
| Diziliş listesi: şemalar dikey ve renkli, başta hareketli "Hücum yönü" | Mobil için yapılan tasarım PC'ye de geçti |
| Açılışta kısa "Yükleniyor…" ekranı | Cihaz tipi seçimi (önceden de vardı) |

## Aksiyon planı

| # | İş | Öncelik | Durum |
|---|---|---|---|
| 1 | Oturum beklemesine 4 sn sınır + Google iframe'ini girişe ertele | Kritik | Yapıldı, commit bekliyor |
| 2 | Önizlemeye deploy → gerçek iPhone'da: açılış süresi, Google girişi, fotoğraf ekleme, arka plan kaldırma, Fotoğraflara kaydet | Kritik | Commit sonrası |
| 3 | PC'de isim etiketi ve diziliş listesinin eski hâline dönmesi mi, yeni hâlinde kalması mı | Karar | Kullanıcı |
| 4 | iPhone açılış görselleri (beyaz ekran yerine koyu logo) | Orta | Karar |
| 5 | Girişli akışlar (bulut senkronu, çıkış, hesap sil) her platformda gerçek hesapla | Yüksek | Kullanıcı testi |
| 6 | Login çakışma uyarısı yalnızca gerçek içerik varken (ayrı PR, `main`) | Orta | Bekliyor |
