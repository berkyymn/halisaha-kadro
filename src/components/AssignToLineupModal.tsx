"use client";

import { useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { useModalBackdrop } from "@/hooks/useModalBackdrop";
import type { LineupSlotOption } from "@/lib/lineupSlots";

type AssignToLineupModalProps = {
  open: boolean;
  playerName?: string;
  benchJerseyNumber?: number;
  homeLabel: string;
  awayLabel: string;
  homeSlots: LineupSlotOption[];
  awaySlots: LineupSlotOption[];
  singleTeam?: boolean;
  onComplete: (team: "home" | "away", slotIndex: number) => void;
  onClose: () => void;
};

export function AssignToLineupModal({
  open,
  ...props
}: AssignToLineupModalProps) {
  if (!open) return null;
  return <AssignToLineupModalBody {...props} />;
}

function AssignToLineupModalBody({
  playerName,
  benchJerseyNumber,
  homeLabel,
  awayLabel,
  homeSlots,
  awaySlots,
  singleTeam = false,
  onComplete,
  onClose,
}: Omit<AssignToLineupModalProps, "open">) {
  const [step, setStep] = useState<"team" | "slot">(singleTeam ? "slot" : "team");
  const [team, setTeam] = useState<"home" | "away" | null>(singleTeam ? "home" : null);
  const { backdropProps, panelProps } = useModalBackdrop({
    open: true,
    onClose,
  });

  const teamLabel = team === "home" ? homeLabel : awayLabel;
  const slots = team === "home" ? homeSlots : awaySlots;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4"
      {...backdropProps}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 w-full max-w-xs shadow-xl"
        {...panelProps}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">Oyuna al</h3>
            {playerName && (
              <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                {playerName}
                {benchJerseyNumber != null ? ` · #${benchJerseyNumber}` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-white shrink-0"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === "team" ? (
          <div className="space-y-2">
            <p className="text-[11px] text-zinc-500 mb-2">Hangi takıma alınacak?</p>
            <button
              type="button"
              onClick={() => {
                setTeam("home");
                setStep("slot");
              }}
              className="w-full h-11 rounded-xl bg-zinc-800 hover:bg-green-700 text-sm font-semibold text-white transition-colors"
            >
              {homeLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                setTeam("away");
                setStep("slot");
              }}
              className="w-full h-11 rounded-xl bg-zinc-800 hover:bg-green-700 text-sm font-semibold text-white transition-colors"
            >
              {awayLabel}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {!singleTeam && (
              <button
                type="button"
                onClick={() => setStep("team")}
                className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="w-3 h-3" />
                Takım değiştir
              </button>
            )}
            <p className="text-[11px] text-zinc-500">
              {teamLabel} — kimin yerine? (forma numarası)
            </p>
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.slotIndex}
                  type="button"
                  onClick={() => {
                    if (team) onComplete(team, slot.slotIndex);
                    onClose();
                  }}
                  className="min-h-12 rounded-lg bg-zinc-800 hover:bg-green-700 text-white transition-colors px-1 py-1.5 flex flex-col items-center justify-center gap-0.5"
                  title={
                    slot.isEmpty
                      ? `Boş slot · #${slot.jerseyNumber}`
                      : `${slot.playerName ?? "Oyuncu"} · #${slot.jerseyNumber}`
                  }
                >
                  <span className="text-base font-black leading-none">
                    {slot.jerseyNumber}
                  </span>
                  <span className="text-[8px] text-zinc-400 truncate max-w-full leading-tight">
                    {slot.isEmpty
                      ? "Boş"
                      : slot.playerName?.split(" ")[0] ?? "—"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
