"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { normalizeMatchTime } from "@/lib/matchDate";
import { MatchTimeModal } from "./MatchTimeModal";

/**
 * Saat serbest metin değil: tıklayınca "Maç saati" penceresi açılır (saat 00–23,
 * dakika yalnızca 00 / 15 / 30 / 45). Değer her zaman `SS:DD`.
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
  const time = normalizeMatchTime(value);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex h-full items-center justify-center">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Maç saati ${time}, değiştirmek için dokun`}
        title="Saat seç"
        className="poster-editable poster-editable-footer-accent relative flex h-full cursor-pointer items-center justify-center rounded border-0 bg-transparent px-1 py-0"
        style={{ ...style, gap }}
      >
        <Clock
          className="text-red-500 shrink-0"
          strokeWidth={2.5}
          style={{ width: iconSize, height: iconSize }}
          aria-hidden
        />
        <span>{time}</span>
      </button>
      <MatchTimeModal open={open} value={time} onChange={onChange} onClose={() => setOpen(false)} />
    </div>
  );
}
