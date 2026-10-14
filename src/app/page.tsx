import type { Metadata } from "next";
import { AppProviders } from "@/components/AppProviders";
import { AppShell } from "@/components/AppShell";
import { LayoutModeGate } from "@/components/LayoutModeGate";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { SITE_URL } from "@/lib/siteUrl";

const HOME_TITLE = "Halı Saha Kadro Kur – Ücretsiz Kadro ve Maç Posteri";
const HOME_DESCRIPTION =
  "Halı saha kadronu ücretsiz kur: 6, 7 veya 8 kişilik dizilişini seç, oyunculara isim ve fotoğraf ekle, saha, saat ve ücret bilgisiyle maç posterini indir ve WhatsApp'ta paylaş. Üyelik gerekmez.";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
};

/** Arama motorlarına "bu ücretsiz bir web uygulaması" bilgisi (görünmez, schema.org). */
const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Halı Saha Kadro",
  url: SITE_URL,
  description: HOME_DESCRIPTION,
  applicationCategory: "SportsApplication",
  operatingSystem: "Web, iOS, Android",
  inLanguage: "tr",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
};

export default function Home() {
  return (
    <AppErrorBoundary>
      {/*
        Uygulama tarayıcıda açılır; statik HTML'de yalnızca yükleme ekranı vardı.
        Sayfanın ne olduğunu anlatan başlık ve açıklama sunucuda çizilir: ekranda
        görünmez (uygulamanın görünümü değişmez), ekran okuyucular ve arama
        motorları okur. Metin sayfanın gerçek içeriğini anlatır, anahtar kelime
        yığını değildir.
      */}
      <header className="sr-only">
        <h1>Halı Saha Kadro Kur – Ücretsiz Kadro ve Maç Posteri Oluşturucu</h1>
        <p>{HOME_DESCRIPTION}</p>
      </header>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd).replace(/</g, "\\u003c") }}
      />
      <LayoutModeGate>
        <AppProviders>
          <AppShell />
        </AppProviders>
      </LayoutModeGate>
    </AppErrorBoundary>
  );
}
