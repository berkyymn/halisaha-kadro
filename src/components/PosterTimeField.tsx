"use client";

import { FieldWarning, openNativePicker, useFieldWarning } from "./PosterDateField";
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
  min,
  isPast,
}: {
  /** Seçilen saat geçmişte mi (maç bugünse); öyleyse saat değişmez, uyarı görünür */
  isPast?: (time: string) => boolean;
  /** HH:MM — maç bugünse şu andan önceki saatler seçicide pasif */
  min?: string;
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
  iconSize: string;
  gap: string;
}) {
  const time = normalizeMatchTime(value);
  const [warning, warn] = useFieldWarning();

  return (
    <div className="relative flex h-full items-center justify-center">
      <div
        className="poster-editable poster-editable-footer-accent relative flex h-full cursor-pointer items-center justify-center rounded px-1"
        style={{ ...style, gap }}
      >
        <Clock
          className="text-red-500 shrink-0"
          strokeWidth={2.5}
          style={{ width: iconSize, height: iconSize }}
          aria-hidden
        />
        <span>{time}</span>
        {/* Şeffaf gerçek saat girişi yazının üstünde (iPhone için; bkz. PosterDateField). */}
        <input
          type="time"
          value={time}
          min={min}
          onChange={(e) => {
            if (!e.target.value) return;
            const next = normalizeMatchTime(e.target.value);
            // Seçiciler `min`'i her zaman uygulamaz (iPhone çarkı): sessizce
            // başka saate atlamak yerine seçimi reddedip nedenini söyle.
            if (isPast?.(next)) {
              warn("Geçmiş saat seçilemez");
              return;
            }
            onChange(next);
          }}
          onClick={(e) => openNativePicker(e.currentTarget)}
          data-export-ignore="true"
          aria-label={`Maç saati ${time}, değiştirmek için dokun`}
          title="Saat seç"
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
          style={{ fontSize: 16 }}
        />
      </div>
      <FieldWarning message={warning} />
    </div>
  );
}
