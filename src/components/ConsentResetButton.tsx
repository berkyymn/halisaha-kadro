"use client";

import { useState } from "react";
import { clearAnalyticsConsent, readAnalyticsConsent } from "@/lib/analytics";
import { CONSENT_RESET_EVENT } from "@/components/ConsentBanner";

export function ConsentResetButton() {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        const hadConsent = readAnalyticsConsent() === "granted";
        clearAnalyticsConsent();
        window.dispatchEvent(new Event(CONSENT_RESET_EVENT));
        setDone(true);
        // Yüklenmiş gtag'i bırakmak için sayfayı yenile.
        if (hadConsent) window.location.reload();
      }}
      className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-700"
    >
      {done ? "Tercih sıfırlandı" : "Çerez tercihimi değiştir"}
    </button>
  );
}
