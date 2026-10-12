"use client";

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
  /** YYYY-MM-DD — geçmiş günler seçicide pasif */
  min?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  style?: React.CSSProperties;
}) {
  const iso = displayDateToIso(value) || displayDateToIso(placeholder) || "";
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
            if (e.target.value) onChange(isoDateToDisplay(e.target.value));
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
