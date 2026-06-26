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
5. **Project settings → Your apps → Web** ikonu → config değerlerini kopyala
6. Proje kökünde `.env.local` oluştur (örnek: [`.env.local.example`](.env.local.example)):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

7. `npm run dev` yeniden başlat

Giriş yaptıktan sonra kadro ve poster ayarların Firestore'da (`posters/{userId}`) otomatik saklanır. Firebase yapılandırması yoksa uygulama yine çalışır; veriler yalnızca tarayıcıda (localStorage) kalır.

## Komutlar

```bash
npm run dev    # geliştirme
npm run build  # production build
npm run lint   # ESLint
```

## QA

Kritik akışlar için [`docs/QA-CHECKLIST.md`](docs/QA-CHECKLIST.md).
