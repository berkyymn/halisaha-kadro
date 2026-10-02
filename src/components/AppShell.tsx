"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { RotateCcw } from "lucide-react";

import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestTabSync } from "@/hooks/useGuestTabSync";
import { trackEvent } from "@/lib/analytics";
import { BenchPanel } from "./BenchPanel";
const LogoDesignerModal = dynamic(
  () =>
    import("./LogoDesignerModal").then((module) => module.LogoDesignerModal),
  { ssr: false }
);
import { MatchPoster } from "./MatchPoster";
import { PosterToolbar } from "./PosterToolbar";
import { UserAuthButton } from "./UserAuthButton";
import { ModalShell } from "./ModalShell";
import { PosterExportControls } from "./PosterExportControls";

const PlayerEditModal = dynamic(
  () =>
    import("./PlayerEditModal").then((module) => module.PlayerEditModal),
  { ssr: false }
);

export function AppShell() {
  useGuestTabSync();
  const { user } = useAuth();
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const resetGuestSession = useAppStore((s) => s.resetGuestSession);
  const players = useAppStore((s) => s.players);
  const savedPlayers = useAppStore((s) => s.savedPlayers);
  const homeTeam = useAppStore((s) => s.homeTeam);
  const awayTeam = useAppStore((s) => s.awayTeam);
  const setSlotPlayer = useAppStore((s) => s.setSlotPlayer);
  const setCaptain = useAppStore((s) => s.setCaptain);
  const logoDesignerTeam = useAppStore((s) => s.logoDesignerTeam);
  const setLogoDesignerTeam = useAppStore((s) => s.setLogoDesignerTeam);
  const updateHomeTeam = useAppStore((s) => s.updateHomeTeam);
  const updateAwayTeam = useAppStore((s) => s.updateAwayTeam);
  const teamMode = useAppStore((s) => s.teamMode);
  const teamLogoDisplaySize = useAppStore((s) => s.teamLogoDisplaySize);
  const setTeamLogoDisplaySize = useAppStore((s) => s.setTeamLogoDisplaySize);

  const mainBg = useMemo(() => {
    const hexToRgba = (hex: string, alpha: number) => {
      const sanitized = hex.replace("#", "");
      const bigint = parseInt(sanitized, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    if (teamMode === "single") {
      return `
        radial-gradient(ellipse 70% 100% at 0% 50%, ${hexToRgba(
          homeTeam.atmosphereColor,
          0.2
        )} 0%, transparent 45%),
        radial-gradient(ellipse 70% 100% at 100% 50%, ${hexToRgba(
          homeTeam.atmosphereColor,
          0.2
        )} 0%, transparent 45%),
        #050505
      `;
    }

    return `
      radial-gradient(ellipse 70% 100% at 0% 50%, ${hexToRgba(
        homeTeam.atmosphereColor,
        0.18
      )} 0%, transparent 45%),
      radial-gradient(ellipse 70% 100% at 100% 50%, ${hexToRgba(
        awayTeam.atmosphereColor,
        0.18
      )} 0%, transparent 45%),
      #050505
    `;
  }, [teamMode, homeTeam.atmosphereColor, awayTeam.atmosphereColor]);

  const [editing, setEditing] = useState<{
    team: "home" | "away";
    slotIndex: number;
  } | null>(null);

  const handleEditPlayer = useCallback(
    (team: "home" | "away", slotIndex: number) => setEditing({ team, slotIndex }),
    []
  );

  const handleLogoClick = useCallback(
    (team: "home" | "away") => {
      trackEvent("logo_designer_opened", { team });
      setLogoDesignerTeam(team);
    },
    [setLogoDesignerTeam]
  );

  const editCtx = editing
    ? {
        teamConfig: editing.team === "home" ? homeTeam : awayTeam,
        playerId:
          (editing.team === "home" ? homeTeam : awayTeam).playerIds[
            editing.slotIndex
          ] ?? "",
      }
    : null;

  const editPlayer = editCtx?.playerId
    ? players[editCtx.playerId] ?? savedPlayers[editCtx.playerId]
    : undefined;
  const squadSize = useAppStore((s) => s.squadSize);
  const teammateNumbers = editCtx
    ? editCtx.teamConfig.playerIds
        .slice(0, squadSize)
        .filter((id) => id && id !== editCtx.playerId)
        .map((id) => players[id] ?? savedPlayers[id])
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => ({ number: p.number, name: p.name }))
    : [];
  const isCaptain =
    Boolean(editCtx?.playerId) &&
    editCtx?.teamConfig.captainId === editCtx?.playerId;

  const activeTeam = logoDesignerTeam === "home" ? homeTeam : awayTeam;
  const updateActiveTeam =
    logoDesignerTeam === "home" ? updateHomeTeam : updateAwayTeam;

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white overflow-hidden">
      <header className="shrink-0 h-11 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-4">
        <h1 className="flex items-center gap-2 text-sm font-black tracking-wide">
          <img src="/icon.svg" alt="" width={22} height={22} className="rounded-md" />
          Halı Saha Kadro
        </h1>
        <div className="flex items-center gap-2">
          <UserAuthButton />
          <div className="hidden sm:block h-5 w-px bg-zinc-800" />
          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800"
            title="Takımları, oyuncuları ve maç bilgilerini varsayılana döndür (yedekler korunur)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Sıfırla
          </button>
          <PosterExportControls />
        </div>
      </header>

      <PosterToolbar />

      <main
        className="flex-1 flex min-h-0 min-w-0"
        style={{ background: mainBg }}
      >
        <div className="flex-1 flex items-center justify-center p-3 sm:p-4 min-h-0 min-w-0 [container-type:size]">
          <MatchPoster
            onEditPlayer={handleEditPlayer}
            onLogoClick={handleLogoClick}
          />
        </div>
        <BenchPanel />
      </main>

      <ModalShell
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        panelClassName="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-white">Poster sıfırlansın mı?</h3>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-zinc-300 leading-relaxed">
            Takımlar, sahadaki oyuncular (fotoğraflar dahil), logolar, başlık ve
            saha bilgileri varsayılana döner. Yedek havuzun korunur.
            {user ? " Bu değişiklik bulut kaydına da yansır." : ""}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setResetConfirmOpen(false)}
              className="flex-1 h-10 rounded-xl bg-zinc-800 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={() => {
                trackEvent("guest_session_reset");
                resetGuestSession();
                setResetConfirmOpen(false);
              }}
              className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-semibold text-white"
            >
              Sıfırla
            </button>
          </div>
        </div>
      </ModalShell>

      {editing && editCtx && (
        <PlayerEditModal
          key={`${editing.team}-${editing.slotIndex}`}
          open
          onClose={() => setEditing(null)}
          jersey={editCtx.teamConfig.jersey}
          player={editPlayer}
          slotIndex={editing.slotIndex}
          isCaptain={isCaptain}
          onToggleCaptain={() =>
            setCaptain(editing.team, isCaptain ? null : editing.slotIndex)
          }
          onSave={(data) => {
            setSlotPlayer(editing.team, editing.slotIndex, data);
          }}
          variant={editing.team === "home" ? "light" : "dark"}
          source="lineup"
          team={editing.team}
          teamName={editCtx.teamConfig.shortName}
          teammateNumbers={teammateNumbers}
        />
      )}

      {logoDesignerTeam && (
        <LogoDesignerModal
          key={logoDesignerTeam}
          open
          onClose={() => setLogoDesignerTeam(null)}
          teamSide={logoDesignerTeam}
          initial={{
            logo: activeTeam.logo,
            jersey: activeTeam.jersey,
            shortName: activeTeam.shortName,
            logoDisplaySize: teamLogoDisplaySize,
          }}
          onSave={({ logo, jersey, shortName, logoDisplaySize }) => {
            const name = shortName.trim() || activeTeam.shortName;
            if (name !== activeTeam.shortName) {
              trackEvent("team_name_changed", { team: logoDesignerTeam });
            }
            updateActiveTeam({ logo, jersey, shortName: name, name });
            if (logoDisplaySize !== teamLogoDisplaySize) setTeamLogoDisplaySize(logoDisplaySize);
          }}
        />
      )}
    </div>
  );
}
