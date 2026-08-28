# Halı Saha Kadro

Halı saha maç posteri oluşturma uygulaması — kadro, tema, logo, fotoğraf ve PNG indirme.

## Kurulum

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)

## Hesap ve bulut yedek (Firebase)

Kullanıcı girişi ve poster verisinin cihazlar arası senkronu için [Firebase](https://firebase.google.com) kullanılır.

1. [Firebase Console](https://console.firebase.google.com) → yeni proje
2. **Authentication** → Sign-in method → **Email/Password** ve **Google** aç
3. **Firestore Database** oluştur (test modunda başlayabilirsin)
4. **Firestore → Rules** sekmesine [`firebase/firestore.rules`](firebase/firestore.rules) içeriğini yapıştır ve yayınla
5. **Storage** oluştur. **Storage → Rules** sekmesine [`firebase/storage.rules`](firebase/storage.rules) içeriğini yapıştır ve yayınla.
6. Web'den Storage fotoğraf yüklemek için bucket CORS ayarını yap. Google Cloud SDK kurulu ve giriş yapılmışken:

```bash
gcloud storage buckets update gs://BUCKET_ADI --cors-file=firebase/storage.cors.json
```

`BUCKET_ADI`, Firebase Console → Storage → Files ekranındaki bucket adıdır. Production domain kullanıyorsan `firebase/storage.cors.json` içindeki `origin` listesine onu da ekle.
7. **Project settings → Your apps → Web** ikonu → config değerlerini kopyala
8. Proje kökünde `.env.local` oluştur (örnek: [`.env.local.example`](.env.local.example)):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

9. `npm run dev` yeniden başlat

Giriş yaptıktan sonra kadro ve poster ayarların Firestore'da (`posters/{userId}`) otomatik saklanır. Firebase yapılandırması yoksa uygulama yine çalışır; veriler yalnızca tarayıcıda (localStorage) kalır.

## Komutlar

```bash
npm run dev    # geliştirme
npm run build  # production build
npm run lint   # ESLint
```

## QA

Kritik akışlar için [`docs/QA-CHECKLIST.md`](docs/QA-CHECKLIST.md).
