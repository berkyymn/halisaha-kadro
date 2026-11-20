"use client";

import { useState } from "react";
import { Clock, X } from "lucide-react";
import { ModalShell } from "@/components/ModalShell";
import { MATCH_HOUR_OPTIONS, matchMinuteOptions, normalizeMatchTime } from "@/lib/matchDate";

/**
 * Maç saati: saat (00–23) ve dakika (yalnızca 00 / 15 / 30 / 45) aynı pencerede.
 * Tarayıcının saat çarkı dakikayı sınırlamaya izin vermediği için kendi seçicimiz;
 * her cihazda aynı görünür.
 */
export function MatchTimeModal({
  open,
  value,
  onChange,
  onClose,
}: {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      zIndexClass="z-[120]"
      panelClassName="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col"
    >
      {open && <MatchTimeEditor value={value} onChange={onChange} onClose={onClose} />}
    </ModalShell>
  );
}

function MatchTimeEditor({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const [initialHour, initialMinute] = normalizeMatchTime(value).split(":");
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  // Eskiden kaydedilmiş çeyrek olmayan dakika (ör. 10) yalnızca seçiliyken listede kalır.
  const minutes = matchMinuteOptions(initialMinute);

  const save = () => {
    onChange(normalizeMatchTime(`${hour}:${minute}`));
    onClose();
  };

  const optionClass = (selected: boolean) =>
    `h-10 rounded-lg text-sm font-bold tabular-nums transition-colors ${
      selected
        ? "bg-green-600 text-white ring-1 ring-green-400/60"
        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
    }`;

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-red-500" strokeWidth={2.5} aria-hidden />
          <h3 className="text-sm font-bold text-white">Maç saati</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-center text-4xl font-black text-white tabular-nums" aria-live="polite">
          {hour}:{minute}
        </p>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Saat</p>
          <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Saat">
            {MATCH_HOUR_OPTIONS.map((h) => (
              <button
                key={h}
                type="button"
                role="radio"
                aria-checked={hour === h}
                onClick={() => setHour(h)}
                className={optionClass(hour === h)}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Dakika</p>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${minutes.length}, minmax(0, 1fr))` }}
            role="radiogroup"
            aria-label="Dakika"
          >
            {minutes.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={minute === m}
                onClick={() => setMinute(m)}
                className={optionClass(minute === m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-zinc-800">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-xl px-4 text-sm font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={save}
          className="h-10 rounded-xl px-5 text-sm font-bold text-white bg-green-600 hover:bg-green-500"
        >
          Kaydet
        </button>
      </div>
    </>
  );
}
