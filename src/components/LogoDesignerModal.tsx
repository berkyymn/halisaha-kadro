"use client";

import { X } from "lucide-react";
import type { JerseyConfig, TeamLogo } from "@/types";
import { useModalBackdrop } from "@/hooks/useModalBackdrop";
import { LogoDesigner } from "./LogoDesigner";

export function LogoDesignerModal({
  open,
  onClose,
  logo,
  jersey,
  shortName,
  teamLabel,
  teamSide,
  onLogoChange,
  onJerseyChange,
  onTeamNameChange,
}: {
  open: boolean;
  onClose: () => void;
  logo: TeamLogo;
  jersey: JerseyConfig;
  shortName: string;
  teamLabel: string;
  teamSide: "home" | "away";
  onLogoChange: (logo: TeamLogo) => void;
  onJerseyChange: (jersey: JerseyConfig) => void;
  onTeamNameChange: (shortName: string) => void;
}) {
  const { backdropProps, panelProps, markFilePickerOpening, clearPickingFile } =
    useModalBackdrop({
      open,
      onClose,
    });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      {...backdropProps}
    >
      <div
        className="relative z-10 w-full max-w-md max-h-[92vh] overflow-hidden rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl flex flex-col"
        {...panelProps}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-white">Takım Görünümü</h2>
            <p className="text-[10px] text-zinc-500">{teamLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 overflow-y-auto min-h-0">
          <LogoDesigner
            logo={logo}
            jersey={jersey}
            shortName={shortName}
            teamSide={teamSide}
            onLogoChange={onLogoChange}
            onJerseyChange={onJerseyChange}
            onTeamNameChange={onTeamNameChange}
            onFilePickerOpen={markFilePickerOpening}
            onFilePickerClose={clearPickingFile}
          />
        </div>

        <div className="px-4 py-3 border-t border-zinc-800 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-green-600 text-xs font-semibold text-white hover:bg-green-500"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}
