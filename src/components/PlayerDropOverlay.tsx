"use client";

import { memo } from "react";
import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react";

type DropOverlayVariant = "swap" | "sub-in" | "sub-out";

interface PlayerDropOverlayProps {
  variant: DropOverlayVariant;
}

const CONFIG: Record<
  DropOverlayVariant,
  {
    bg: string;
    border: string;
    shadow: string;
    iconClass: string;
    icon: React.ReactNode;
    badgeBg: string;
    label: string;
  }
> = {
  swap: {
    bg: "bg-green-500/30",
    border: "border-green-400",
    shadow: "shadow-[0_0_15px_rgba(34,197,94,0.6)]",
    iconClass: "text-green-600",
    icon: <RefreshCw className="w-5 h-5 animate-spin-slow" />,
    badgeBg: "bg-green-600",
    label: "DEĞİŞTİR",
  },
  "sub-in": {
    bg: "bg-green-500/30",
    border: "border-green-400",
    shadow: "shadow-[0_0_15px_rgba(34,197,94,0.6)]",
    iconClass: "text-green-600",
    icon: <ArrowUp className="w-5 h-5" />,
    badgeBg: "bg-green-600",
    label: "GİREN",
  },
  "sub-out": {
    bg: "bg-red-500/30",
    border: "border-red-400",
    shadow: "shadow-[0_0_15px_rgba(239,68,68,0.6)]",
    iconClass: "text-red-600",
    icon: <ArrowDown className="w-5 h-5" />,
    badgeBg: "bg-red-600",
    label: "ÇIKAN",
  },
};

export const PlayerDropOverlay = memo(function PlayerDropOverlay({
  variant,
}: PlayerDropOverlayProps) {
  const cfg = CONFIG[variant];
  return (
    <div
      className={`absolute inset-0 rounded-[18%] overflow-hidden ${cfg.bg} border-2 ${cfg.border} flex flex-col items-center justify-center animate-pulse z-30 ${cfg.shadow}`}
    >
      <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md ${cfg.iconClass}`}>
        {cfg.icon}
      </div>
      <span
        className={`mt-1.5 text-[9px] font-black tracking-wider text-white ${cfg.badgeBg} px-1.5 py-0.5 rounded shadow`}
      >
        {cfg.label}
      </span>
    </div>
  );
});
