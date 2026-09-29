"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, Monitor, Smartphone } from "lucide-react";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { trackEvent } from "@/lib/analytics";
import { isUnsupportedMobileDevice } from "@/lib/deviceSupport";
import { SITE_URL } from "@/lib/siteUrl";

type GateState = "checking" | "desktop" | "mobile";

export function MobileGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>("checking");

  useEffect(() => {
    const mobile = isUnsupportedMobileDevice();
    // Cihaz tipi yalnızca istemcide bilinir; statik HTML "checking" ile gelir.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(mobile ? "mobile" : "desktop");
    if (mobile) trackEvent("mobile_gate_shown");
  }, []);

  if (state === "checking") return <AppLoadingScreen message="Yükleniyor…" />;
  if (state === "mobile") return <MobileComingSoon />;
  return <>{children}</>;
}

function MobileComingSoon() {
  const [copied, setCopied] = useState(false);
  const displayUrl = SITE_URL.replace(/^https?:\/\//, "");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setCopied(true);
      trackEvent("mobile_gate_link_copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="h-full overflow-y-auto bg-zinc-950 text-white">
      <div
        className="min-h-full flex flex-col items-center justify-center px-6 py-10 text-center"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(34,197,94,0.18) 0%, transparent 70%)",
        }}
      >
        <img
          src="/icon.svg"
          alt=""
          width={88}
          height={88}
          className="rounded-3xl shadow-2xl shadow-green-900/40"
        />
        <h1 className="mt-6 text-2xl font-black tracking-wide">Halı Saha Kadro</h1>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-green-800/60 bg-green-950/40 px-3 py-1 text-xs font-semibold text-green-400">
          <Smartphone className="h-3.5 w-3.5" aria-hidden />
          Mobil uygulamamız yakında
        </div>

        <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-zinc-300">
          Telefon ve tabletler için özel bir uygulama hazırlıyoruz. Şimdilik
          kadronu kurmak ve maç posterini indirmek için{" "}
          <strong className="text-white">bilgisayarından</strong> gir.
        </p>

        <div className="mt-8 w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-left">
          <div className="flex items-start gap-3">
            <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-green-500" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Bilgisayardan aç</p>
              <p className="mt-0.5 truncate text-sm text-zinc-400">{displayUrl}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-green-700 text-sm font-semibold text-white active:bg-green-800"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" aria-hidden />
                Bağlantı kopyalandı
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden />
                Bağlantıyı kopyala
              </>
            )}
          </button>
        </div>

        <a
          href="/gizlilik"
          className="mt-10 text-xs text-zinc-500 underline underline-offset-2"
        >
          Gizlilik ve KVKK
        </a>
      </div>
    </main>
  );
}
