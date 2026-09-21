import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Geist } from "next/font/google";
import { AppProviders } from "@/components/AppProviders";
import { Analytics } from "@/components/Analytics";
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

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://halisahakadro.app";
const siteUrl = /^https?:\/\//i.test(rawSiteUrl) ? rawSiteUrl : `https://${rawSiteUrl}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
    icon: "/icon.svg",
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
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#14532d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={`${geist.variable} ${bebas.variable} h-full`}>
      <body className="h-full antialiased font-sans overflow-hidden">
        <AppProviders>{children}</AppProviders>
        <Analytics />
      </body>
    </html>
  );
}
