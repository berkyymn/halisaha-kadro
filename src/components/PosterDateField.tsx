"use client";

import { useRef } from "react";
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
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  style?: React.CSSProperties;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const iso = displayDateToIso(value) || displayDateToIso(placeholder) || "";
  const display = value || placeholder;

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        /* Safari / güvenlik kısıtı */
      }
    }
    input.focus({ preventScroll: true });
    input.click();
  };

  return (
    <div className="relative inline-flex min-h-[1.75rem] min-w-[5.5rem] items-center">
      <button
        type="button"
        onClick={openPicker}
        className="poster-editable poster-editable-footer-accent relative z-10 w-full cursor-pointer rounded px-1 text-right"
        style={style}
        title="Tarih seç"
        aria-label="Tarih seç"
      >
        {display}
      </button>
      <input
        ref={inputRef}
        type="date"
        value={iso}
        onChange={(e) => {
          if (e.target.value) onChange(isoDateToDisplay(e.target.value));
        }}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
