"use client";

import { useRef } from "react";
import { Clock } from "lucide-react";
import { normalizeMatchTime } from "@/lib/matchDate";

/**
 * Saat serbest metin değil: ikon veya saate tıklayınca tarayıcının saat
 * seçicisi açılır, değer her zaman `SS:DD` olur.
 */
export function PosterTimeField({
  value,
  onChange,
  style,
  iconSize,
  gap,
}: {
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
  iconSize: string;
  gap: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const time = normalizeMatchTime(value);

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
    <div className="relative flex h-full items-center justify-center">
      <button
        type="button"
        onClick={openPicker}
        className="poster-editable poster-editable-footer-accent relative z-10 flex h-full cursor-pointer items-center justify-center rounded px-1"
        style={{ ...style, gap }}
        title="Saat seç"
        aria-label={`Maç saati ${time}, değiştirmek için tıkla`}
      >
        <Clock
          className="text-red-500 shrink-0"
          strokeWidth={2.5}
          style={{ width: iconSize, height: iconSize }}
          aria-hidden
        />
        <span>{time}</span>
      </button>
      <input
        ref={inputRef}
        type="time"
        value={time}
        onChange={(e) => {
          if (e.target.value) onChange(normalizeMatchTime(e.target.value));
        }}
        className="pointer-events-none absolute bottom-0 left-1/2 h-0 w-0 opacity-0"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
