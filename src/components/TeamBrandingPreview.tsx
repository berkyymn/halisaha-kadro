"use client";

import type { JerseyConfig, TeamLogo } from "@/types";
import { JerseyIcon } from "./JerseyIcon";
import { TeamLogoBadge } from "./TeamLogoBadge";

const MODAL_LOGO_PREVIEW_SIZE = 92;
const MODAL_JERSEY_PREVIEW_SIZE = 80;

export function TeamBrandingPreview({
  logo,
  jersey,
  shortName,
}: {
  logo: TeamLogo;
  jersey: JerseyConfig;
  shortName: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-zinc-700 bg-zinc-950/80 p-3">
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg bg-zinc-900/90 border border-zinc-800 px-2 py-3 min-h-[148px]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Logo
        </span>
        <TeamLogoBadge
          logo={logo}
          shortName={shortName}
          size={MODAL_LOGO_PREVIEW_SIZE}
        />
      </div>
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg bg-zinc-900/90 border border-zinc-800 px-2 py-3 min-h-[148px]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Forma
        </span>
        <JerseyIcon
          jersey={jersey}
          number={10}
          size={MODAL_JERSEY_PREVIEW_SIZE}
          numberAlign="right"
        />
      </div>
    </div>
  );
}
