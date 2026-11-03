"use client";

import { useEffect, useRef, useState } from "react";
import {
  displayDateToIso,
  isoDateToDisplay,
  todayDisplayDate,
} from "@/lib/matchDate";

export {
  displayDateToIso,
  isoDateToDisplay,
  todayDisplayDate,
} from "@/lib/matchDate";

export function PosterDateField({
  value,
  onChange,
  placeholder,
  style,
  min,
}: {
  /** YYYY-MM-DD — geçmiş günler seçicide pasif; iPhone yok saydığı için seçim de reddedilir */
  min?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  style?: React.CSSProperties;
}) {
  const iso = displayDateToIso(value) || displayDateToIso(placeholder) || "";
  const [warning, warn] = useFieldWarning();
  const display = value || placeholder;

  return (
    <div className="relative flex h-full min-h-[1.75rem] min-w-[5.5rem] items-center">
      <div
        className="poster-editable poster-editable-footer-accent relative flex h-full w-full cursor-pointer items-center justify-center rounded px-1 text-center"
        style={style}
      >
        {display}
        {/*
          Gerçek tarih girişi yazının üstünde, şeffaf: dokunuş doğrudan ona gider.
          iPhone Safari gizli bir girişin seçicisini programla açmaz; bu yüzden
          kullanıcı girişin kendisine dokunmalı. Masaüstünde tıklama showPicker ile açar.
        */}
        <input
          type="date"
          value={iso}
          min={min}
          onChange={(e) => {
            if (!e.target.value) return;
            if (min && e.target.value < min) {
              warn("Geçmiş tarih seçilemez");
              return;
            }
            onChange(isoDateToDisplay(e.target.value));
          }}
          onClick={(e) => openNativePicker(e.currentTarget)}
          data-export-ignore="true"
          aria-label="Tarih seç"
          title="Tarih seç"
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
          // 16px: iPhone girişe dokununca sayfayı yakınlaştırmasın.
          style={{ fontSize: 16 }}
        />
      </div>
      <FieldWarning message={warning} />
    </div>
  );
}

const WARNING_MS = 3500;

/** Reddedilen seçim için kısa süreli uyarı: [mesaj, göster]. */
export function useFieldWarning(): [string | null, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const show = (next: string) => {
    window.clearTimeout(timer.current);
    setMessage(next);
    timer.current = window.setTimeout(() => setMessage(null), WARNING_MS);
  };
  return [message, show];
}

/**
 * Alt bandın içinde, alanın üstünü kaplayan uyarı. Alt bant taşanı kırptığı
 * için yukarıya değil yerinde açılır; yazı poster ölçeğiyle büyür/küçülür.
 */
export function FieldWarning({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      data-export-ignore="true"
      className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-red-600 px-[0.6em] py-[0.3em] font-sans font-semibold leading-none text-white shadow-lg"
      style={{ fontSize: "0.75em" }}
    >
      {message}
    </div>
  );
}

/** Masaüstü tarayıcılarda tıklamayla seçiciyi açar; iPhone zaten kendisi açar. */
export function openNativePicker(input: HTMLInputElement): void {
  if (typeof input.showPicker !== "function") return;
  try {
    input.showPicker();
  } catch {
    // Seçici zaten açık ya da tarayıcı izin vermedi: dokunuş yine girişe gider.
  }
}
