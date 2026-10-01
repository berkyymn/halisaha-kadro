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
  const isSingle = useAppStore((s) => s.teamMode === "single");
  const teamName = useAppStore((s) => s.homeTeam.shortName);
  const setMatchInfo = useAppStore((s) => s.setMatchInfo);

  const [totalText, setTotalText] = useState(matchInfo.feeTotal > 0 ? String(matchInfo.feeTotal) : "");
  const [goalkeepersPay, setGoalkeepersPay] = useState(matchInfo.feeGoalkeepersPay);
  const [teamOnly, setTeamOnly] = useState(matchInfo.feeTeamOnly);

  const total = clampFeeTotal(Number(totalText || 0));
  const split = { goalkeepersPay, teamOnly: isSingle && teamOnly };
  const payers = feePayerCount(squadSize, split);
  const perPerson = feePerPerson(total, squadSize, split);

  const save = () => {
    if (total <= 0) return;
    trackEvent("match_fee_set", { goalkeepers_pay: goalkeepersPay, team_only: split.teamOnly });
    setMatchInfo({
      feeEnabled: true,
      feeTotal: total,
      feeGoalkeepersPay: goalkeepersPay,
      // İki takım modunda seçim değiştirilmez; tek takıma dönünce korunur.
      ...(isSingle ? { feeTeamOnly: teamOnly } : {}),
    });
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
          <span className="text-[11px] font-semibold text-zinc-300">
            {split.teamOnly ? "Takımımızın ödediği tutar" : "Toplam saha ücreti"}
          </span>
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

        {isSingle && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-zinc-300">Ücreti kimler paylaşıyor?</p>
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1" role="radiogroup">
              {[
                { value: true, label: "Sadece takımımız", hint: teamName || "Bu takım" },
                { value: false, label: "İki takım", hint: `${squadSize * 2} kişi` },
              ].map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  role="radio"
                  aria-checked={teamOnly === option.value}
                  onClick={() => setTeamOnly(option.value)}
                  className={`rounded-md px-2 py-1.5 text-left transition-colors ${
                    teamOnly === option.value ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span className="block text-[11px] font-semibold">{option.label}</span>
                  <span className="block truncate text-[10px] text-zinc-500">{option.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <Toggle label="Kaleciler de öder" checked={goalkeepersPay} onChange={setGoalkeepersPay} />

        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-3">
          <Wallet className="w-5 h-5 shrink-0 text-green-400" />
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-400">
              {payers} kişiye bölünür ({split.teamOnly ? "yalnızca takımımız" : `${squadSize}v${squadSize}`}
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
