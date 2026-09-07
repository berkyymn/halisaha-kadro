"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Download, RotateCcw } from "lucide-react";
import { toPng } from "html-to-image";
import { useAppStore } from "@/store/useAppStore";
import { BenchPanel } from "./BenchPanel";
import { LogoDesignerModal } from "./LogoDesignerModal";
import { MatchPoster } from "./MatchPoster";
import { PosterToolbar } from "./PosterToolbar";
import { UserAuthButton } from "./UserAuthButton";

const PlayerEditModal = dynamic(
  () =>
    import("./PlayerEditModal").then((module) => module.PlayerEditModal),
  { ssr: false }
);

export function AppShell() {
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

  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState<{
    team: "home" | "away";
    slotIndex: number;
  } | null>(null);

  const handleExport = useCallback(async () => {
    const el = document.getElementById("match-poster");
    if (!el) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement("a");
      link.download = "halisaha-kadro.png";
      link.href = dataUrl;
      link.click();
    } catch {
      alert("Görsel indirilemedi.");
    } finally {
      setExporting(false);
    }
  }, []);

  const handleEditPlayer = useCallback(
    (team: "home" | "away", slotIndex: number) => setEditing({ team, slotIndex }),
    []
  );

  const handleLogoClick = useCallback(
    (team: "home" | "away") => setLogoDesignerTeam(team),
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
  const isCaptain =
    Boolean(editCtx?.playerId) &&
    editCtx?.teamConfig.captainId === editCtx?.playerId;

  const activeTeam = logoDesignerTeam === "home" ? homeTeam : awayTeam;
  const updateActiveTeam =
    logoDesignerTeam === "home" ? updateHomeTeam : updateAwayTeam;

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white overflow-hidden">
      <header className="shrink-0 h-11 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-4">
        <h1 className="text-sm font-black tracking-wide">⚽ Halı Saha Kadro</h1>
        <div className="flex items-center gap-2">
          <UserAuthButton />
          <div className="hidden sm:block h-5 w-px bg-zinc-800" />
          <button
            type="button"
            onClick={resetGuestSession}
            className="p-1.5 text-zinc-500 hover:text-white"
            title="Posteri sıfırla"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 px-3 py-1.5 rounded text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "..." : "Poster İndir"}
          </button>
        </div>
      </header>

      <PosterToolbar />

      <main
        className="flex-1 flex min-h-0 min-w-0"
        style={{ background: mainBg }}
      >
        <div className="flex-1 flex items-center justify-center p-3 sm:p-4 min-h-0 min-w-0">
          <MatchPoster
            onEditPlayer={handleEditPlayer}
            onLogoClick={handleLogoClick}
          />
        </div>
        <BenchPanel />
      </main>

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
        />
      )}

      {logoDesignerTeam && (
        <LogoDesignerModal
          open
          onClose={() => setLogoDesignerTeam(null)}
          teamSide={logoDesignerTeam}
          teamLabel={activeTeam.shortName}
          logo={activeTeam.logo}
          jersey={activeTeam.jersey}
          shortName={activeTeam.shortName}
          onLogoChange={(logo) => updateActiveTeam({ logo })}
          onJerseyChange={(jersey) => updateActiveTeam({ jersey })}
          onTeamNameChange={(shortName) => {
            updateActiveTeam({
              shortName,
              name: shortName,
              logo:
                activeTeam.logo.mode === "generated"
                  ? {
                      ...activeTeam.logo,
                      initials: shortName.slice(0, 2).toUpperCase() || "?",
                    }
                  : activeTeam.logo,
            });
          }}
        />
      )}
    </div>
  );
}
