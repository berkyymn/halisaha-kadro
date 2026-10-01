"use client";

import { useState, type KeyboardEvent } from "react";
import { Wallet, X } from "lucide-react";
import { ModalShell } from "@/components/ModalShell";
import { Toggle } from "@/components/Toggle";
import { useAppStore } from "@/store/useAppStore";
import { trackEvent } from "@/lib/analytics";
import { clampFeeTotal, feePayerCount, feePerPerson, formatLira } from "@/lib/matchFee";

/** Saha ücreti: toplam tutar + kaleciler öder mi → posterde kişi başı tutar. */
export function MatchFeeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      zIndexClass="z-[120]"
      panelClassName="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col"
    >
      {open && <MatchFeeEditor onClose={onClose} />}
    </ModalShell>
  );
}

function MatchFeeEditor({ onClose }: { onClose: () => void }) {
  const matchInfo = useAppStore((s) => s.matchInfo);
  const squadSize = useAppStore((s) => s.squadSize);
  const setMatchInfo = useAppStore((s) => s.setMatchInfo);

  const [totalText, setTotalText] = useState(matchInfo.feeTotal > 0 ? String(matchInfo.feeTotal) : "");
  const [goalkeepersPay, setGoalkeepersPay] = useState(matchInfo.feeGoalkeepersPay);

  const total = clampFeeTotal(Number(totalText || 0));
  const payers = feePayerCount(squadSize, goalkeepersPay);
  const perPerson = feePerPerson(total, squadSize, goalkeepersPay);

  const save = () => {
    if (total <= 0) return;
    trackEvent("match_fee_set", { goalkeepers_pay: goalkeepersPay });
    setMatchInfo({ feeEnabled: true, feeTotal: total, feeGoalkeepersPay: goalkeepersPay });
    onClose();
  };

  const remove = () => {
    trackEvent("match_fee_removed");
    setMatchInfo({ feeEnabled: false });
    onClose();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      save();
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-white">Saha ücreti</h3>
          <p className="text-[10px] text-zinc-500">Posterde kişi başı tutar gösterilir</p>
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
        <label className="block">
          <span className="text-[11px] font-semibold text-zinc-300">Toplam saha ücreti</span>
          <span className="mt-1 flex h-11 items-center rounded-xl border border-zinc-700 bg-zinc-800 px-3 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500/30">
            <span className="text-lg font-bold text-zinc-400">₺</span>
            <input
              value={totalText}
              onChange={(e) => setTotalText(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 7))}
              onKeyDown={onKeyDown}
              inputMode="numeric"
              placeholder="2100"
              autoFocus
              className="ml-1.5 w-full bg-transparent text-lg font-bold text-white outline-none placeholder:text-zinc-600"
              aria-label="Toplam saha ücreti (₺)"
            />
          </span>
        </label>

        <Toggle label="Kaleciler de öder" checked={goalkeepersPay} onChange={setGoalkeepersPay} />

        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-3">
          <Wallet className="w-5 h-5 shrink-0 text-green-400" />
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-400">
              {payers} kişiye bölünür ({squadSize}v{squadSize}
              {goalkeepersPay ? "" : ", kaleciler hariç"})
            </p>
            <p className="text-lg font-black text-white tabular-nums">
              {perPerson > 0 ? `Kişi başı ${formatLira(perPerson)}` : "Tutar gir"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-zinc-800">
        {matchInfo.feeEnabled && (
          <button
            type="button"
            onClick={remove}
            className="h-9 px-2.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-950/40"
          >
            Posterden kaldır
          </button>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={save}
          disabled={total <= 0}
          className="h-9 px-5 rounded-lg bg-green-600 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-40"
        >
          Kaydet
        </button>
      </div>
    </>
  );
}
