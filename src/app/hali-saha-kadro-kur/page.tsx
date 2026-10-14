import type { Metadata } from "next";
import Link from "next/link";
import { BackToAppLink } from "@/components/BackToAppLink";

export const metadata: Metadata = {
  title: { absolute: "Halı Saha Kadro Nasıl Kurulur? 3 Adımda Maç Posteri | Halı Saha Kadro" },
  description:
    "Halı saha kadrosunu 3 adımda kur: 6, 7 veya 8 kişilik diziliş seç, oyuncu isim ve fotoğraflarını ekle, saha, saat ve kişi başı ücretle maç posterini WhatsApp'ta paylaş. Ücretsiz, üyelik gerekmez.",
  alternates: { canonical: "/hali-saha-kadro-kur" },
};

const STEPS = [
  {
    title: "Format ve dizilişi seç",
    body: "Tek takım ya da iki takım karşılaşma posteri seç. 6, 7 veya 8 kişilik formatlardan birini ve 3-2-1, 2-3-1, 3-3-1 gibi bir dizilişi seç; oyuncular sahaya kendiliğinden yerleşir.",
  },
  {
    title: "Oyuncuları ekle",
    body: "Oyuncuya dokun; isim, forma numarası ve fotoğraf ekle. Fotoğrafın arka planı otomatik temizlenir. Oyuncuları sürükleyerek yer değiştir, kaptanı seç, gelmeyenleri yedeğe al.",
  },
  {
    title: "Maç bilgisini gir, paylaş",
    body: "Saha adını, maç saatini ve tarihini yaz; istersen toplam saha ücretini gir, kişi başı tutar hesaplanır. Posteri indir ya da tek dokunuşla WhatsApp, Instagram ve diğer uygulamalarda paylaş.",
  },
];

const FEATURES = [
  "6v6, 7v7 ve 8v8 formatları, her biri için farklı dizilişler",
  "Tek takım kadrosu ya da iki takımlı karşılaşma posteri",
  "Arka planı otomatik temizlenen oyuncu fotoğrafları",
  "Dört stadyum teması: Derbi Gecesi, Final Gecesi, Karanlık Arena, Summer Cup",
  "Takım logosu ve forma rengi tasarımı",
  "Kişi başı saha ücreti hesabı (kaleciler dahil ya da hariç)",
  "Her maçta kayıtlı kalan yedek oyuncu listesi",
  "Giriş yapınca kadro bulutta: telefonda ve bilgisayarda aynı kadro",
];

const FAQ = [
  {
    q: "Halı Saha Kadro ücretli mi?",
    a: "Hayır, tamamen ücretsiz. Poster indirmek ve paylaşmak için de ücret yok.",
  },
  {
    q: "Üye olmam gerekiyor mu?",
    a: "Hayır. Üye olmadan kadro kurup poster indirebilirsin; kadro o cihazda kalır. Giriş yaparsan kadron hesabına kaydedilir ve telefondan da bilgisayardan da aynı kadroya ulaşırsın.",
  },
  {
    q: "Telefonda çalışıyor mu?",
    a: "Evet. Telefon tarayıcısında açılır; istersen ana ekrana ekleyip uygulama gibi kullanabilirsin.",
  },
  {
    q: "Kaç kişilik kadro kurabilirim?",
    a: "6, 7 ve 8 kişilik halı saha formatları var. Kadroya girmeyen oyuncular yedek listesinde durur ve sahaya sürüklenebilir.",
  },
  {
    q: "Posteri WhatsApp grubuna nasıl atarım?",
    a: "Telefonda Paylaş düğmesine dokun ve WhatsApp'ı seç. Bilgisayarda posteri kopyalayıp WhatsApp Web'de sohbete yapıştırabilir ya da indirip gönderebilirsin.",
  },
  {
    q: "Oyuncu fotoğrafları nerede saklanıyor?",
    a: "Giriş yapmadıysan yalnızca kendi cihazında. Giriş yaptıysan kadronla birlikte hesabında saklanır. Ayrıntılar Gizlilik ve KVKK sayfasında.",
  },
];

function CtaButton() {
  return (
    <Link
      href="/"
      className="inline-flex h-12 items-center justify-center rounded-xl bg-green-600 px-6 text-base font-bold text-white hover:bg-green-500"
    >
      Hemen kadro kur — ücretsiz
    </Link>
  );
}

export default function HowToPage() {
  return (
    <main className="h-full overflow-y-auto bg-zinc-950 text-white">
      <article className="mx-auto max-w-3xl space-y-10 px-5 py-10 sm:py-14">
        <header className="space-y-4">
          <BackToAppLink className="inline-flex items-center gap-2 text-sm font-bold text-zinc-300 hover:text-white">
            <img src="/icon.svg" alt="" width={28} height={28} className="rounded-lg" />
            Halı Saha Kadro
          </BackToAppLink>
          <h1 className="text-3xl font-black leading-tight sm:text-4xl">Halı Saha Kadro Kur</h1>
          <p className="text-[17px] leading-relaxed text-zinc-300">
            Maç günü WhatsApp grubuna atılacak kadroyu birkaç dakikada hazırla: dizilişini seç,
            oyuncularını fotoğraflarıyla sahaya diz, saha ve saat bilgisini ekle, stadyum temalı
            maç posterini paylaş. Ücretsiz, üyelik gerekmez; bilgisayarda ve telefonda çalışır.
          </p>
          <CtaButton />
        </header>

        <figure className="space-y-2">
          <img
            src="/ornek/iki-takim-poster.webp"
            alt="Halı Saha Kadro ile hazırlanmış 7'ye 7 iki takımlı halı saha maç posteri örneği"
            width={1200}
            height={750}
            className="w-full rounded-2xl border border-zinc-800"
          />
          <figcaption className="text-center text-sm text-zinc-500">
            Örnek: 7v7 iki takım posteri, Final Gecesi teması
          </figcaption>
        </figure>

        <section className="space-y-4">
          <h2 className="text-xl font-bold sm:text-2xl">3 adımda halı saha maç posteri</h2>
          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-600/20 text-lg font-black text-green-400">
                  {i + 1}
                </span>
                <div className="space-y-1">
                  <h3 className="font-bold">{step.title}</h3>
                  <p className="text-[15px] leading-relaxed text-zinc-300">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold sm:text-2xl">Neler yapabilirsin?</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex gap-2 text-[15px] leading-relaxed text-zinc-300">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold sm:text-2xl">Sık sorulan sorular</h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="space-y-1">
                <h3 className="font-bold">{item.q}</h3>
                <p className="text-[15px] leading-relaxed text-zinc-300">{item.a}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-zinc-500">
            <Link href="/hali-saha-dizilisleri" className="underline hover:text-zinc-300">
              6, 7 ve 8 kişilik halı saha dizilişleri
            </Link>
            {" · "}
            <a href="/gizlilik" className="underline hover:text-zinc-300">
              Gizlilik ve KVKK
            </a>
          </p>
        </section>

        <footer className="rounded-2xl border border-green-600/30 bg-green-600/10 p-6 text-center space-y-3">
          <p className="text-lg font-bold">Kadron hazır mı?</p>
          <CtaButton />
        </footer>
      </article>
    </main>
  );
}
