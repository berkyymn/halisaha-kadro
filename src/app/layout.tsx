import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Geist } from "next/font/google";
import { SITE_URL } from "@/lib/siteUrl";
import { ANALYTICS_CONSENT_KEY, GA_ID } from "@/lib/analytics";
import { ConsentBanner } from "@/components/ConsentBanner";
import { ErrorReportingInit } from "@/components/ErrorReportingInit";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const bebas = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas",
  subsets: ["latin"],
});



/** iPhone ekranları: CSS genişlik × yükseklik × piksel oranı. */
const IPHONE_SPLASH: [number, number, number][] = [
  [440, 956, 3], [430, 932, 3], [428, 926, 3], [420, 912, 3], [414, 896, 3], [414, 896, 2],
  [414, 736, 3], [402, 874, 3], [393, 852, 3], [390, 844, 3], [375, 812, 3], [375, 667, 2],
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Halı Saha Kadro",
    template: "%s | Halı Saha Kadro",
  },
  description:
    "Halı saha kadrosu oluştur, oyuncu fotoğrafları ekle ve posterini indir. Tek takım veya iki takım karşılaşma posteri hazırla.",
  keywords: [
    "halı saha",
    "kadro",
    "futbol",
    "poster",
    "maç kadrosu",
    "takım kadrosu",
    "futbol posteri",
  ],
  authors: [{ name: "Halı Saha Kadro" }],
  creator: "Halı Saha Kadro",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/",
    siteName: "Halı Saha Kadro",
    title: "Halı Saha Kadro",
    description:
      "Halı saha kadrosu oluştur, oyuncu fotoğrafları ekle ve posterini indir.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Halı Saha Kadro - Poster önizleme",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Halı Saha Kadro",
    description:
      "Halı saha kadrosu oluştur, oyuncu fotoğrafları ekle ve posterini indir.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    title: "Halı Saha Kadro",
    // Opak: ana ekrandan açılınca sayfa saat/çentik şeridinin altında başlar, düğmeler altında kalmaz.
    statusBarStyle: "black",
    // Ana ekrandan açılışta iOS beyaz ekran yerine koyu logo gösterir (public/splash).
    startupImage: IPHONE_SPLASH.map(([w, h, r]) => ({
      url: `/splash/iphone-${w * r}x${h * r}.png`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
    })),
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  // Tarayıcının varsayılan zemini de koyu: sayfa çizilmeden beyaz parlama olmasın.
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="tr"
      className={`${geist.variable} ${bebas.variable} h-full`}
      // iPhone ana ekran uygulaması manifest rengini kullanmaz; CSS yüklenmeden de koyu açılsın.
      style={{ backgroundColor: "#09090b" }}
    >
      <head>
        {GA_ID && (
          <script
            // Consent Mode: varsayılan "denied"; gtag.js yalnızca kullanıcı
            // daha önce onay verdiyse yüklenir (KVKK açık rıza).
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                var consent = null;
                try { consent = localStorage.getItem('${ANALYTICS_CONSENT_KEY}'); } catch (e) {}
                gtag('consent', 'default', {
                  analytics_storage: consent === 'granted' ? 'granted' : 'denied',
                  ad_storage: 'denied',
                  ad_user_data: 'denied',
                  ad_personalization: 'denied'
                });
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { anonymize_ip: true });
                if (consent === 'granted') {
                  var s = document.createElement('script');
                  s.async = true;
                  s.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_ID}';
                  s.setAttribute('data-gtag-loader', 'true');
                  document.head.appendChild(s);
                }
              `,
            }}
          />
        )}
      </head>
      <body className="h-full antialiased font-sans overflow-hidden">
        <ErrorReportingInit />
        {children}
        <ConsentBanner />
      </body>
    </html>
  );
}
