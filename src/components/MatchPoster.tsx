"use client";

import { Calendar, Clock, MapPin } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PitchPlayerLayer } from "./PitchPlayerLayer";
import { PosterDateField } from "./PosterDateField";
import { todayDisplayDate } from "@/lib/matchDate";
import { PosterEditableText } from "./PosterEditableText";
import { PosterTitleDisplay } from "./PosterTitleDisplay";
import { StaticPosterBackground } from "./StaticPosterBackground";
import { TeamLogoBadge } from "./TeamLogoBadge";

function TeamPosterBlock({
  team,
  side,
  onLogoClick,
}: {
  team: {
    logo: Parameters<typeof TeamLogoBadge>[0]["logo"];
    shortName: string;
  };
  side: "left" | "right";
  onLogoClick?: (team: "home" | "away") => void;
}) {
  const isLeft = side === "left";
  const teamKey = isLeft ? "home" : "away";
  const teamLogoDisplaySize = useAppStore((s) => s.teamLogoDisplaySize);

  return (
    <div
      className={`absolute z-20 ${
        isLeft ? "left-[-5%]" : "right-[-5%]"
      }`}
      style={{
        top: "6%",
        width: "22%",
        maxWidth: Math.max(140, teamLogoDisplaySize + 28),
      }}
    >
      <div
        className="absolute -inset-[30%] -z-10 blur-xl pointer-events-none"
        style={{
          background: isLeft
            ? "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(220,38,38,0.25) 0%, transparent 70%)",
        }}
      />
      <button
        type="button"
        onClick={() => onLogoClick?.(teamKey)}
        className={`group relative flex w-full flex-col gap-1.5 pointer-events-auto cursor-pointer rounded-lg transition-transform duration-200 ease-out hover:scale-[1.05] active:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/80 ${
          isLeft ? "items-start" : "items-end"
        }`}
        title="Takım görünümünü düzenle"
      >
        <TeamLogoBadge
          logo={team.logo}
          shortName={team.shortName}
          size={teamLogoDisplaySize}
        />
        <span
          className="text-white font-black italic uppercase leading-none truncate w-full pointer-events-none transition-transform duration-200 ease-out group-hover:translate-y-[-1px]"
          style={{
            fontSize: "clamp(0.85rem, 1.8vw, 1.35rem)",
            letterSpacing: "0.06em",
            textAlign: isLeft ? "left" : "right",
            textShadow:
              "0 2px 16px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.8)",
          }}
        >
          {team.shortName}
        </span>
      </button>
    </div>
  );
}

function PosterFooter({
  venue,
  time,
  date,
  onVenueChange,
  onTimeChange,
  onDateChange,
}: {
  venue: string;
  time: string;
  date: string;
  onVenueChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  onDateChange: (v: string) => void;
}) {
  const footerTextStyle = {
    fontSize: "clamp(0.65rem, 1.15vw, 0.95rem)",
  } as const;

  return (
    <div
      className="absolute left-[4%] right-[4%] z-50 pointer-events-auto"
      style={{ bottom: "2%", height: "11.5%" }}
    >
      <div className="relative h-full">
        <div
          className="absolute -top-px left-[3%] right-[3%] h-[3px] pointer-events-none rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(147,197,253,0.4) 25%, rgba(255,255,255,0.6) 50%, rgba(147,197,253,0.4) 75%, transparent)",
            boxShadow: "0 0 10px rgba(147,197,253,0.3)",
          }}
        />

        <div
          className="grid h-full grid-cols-[1fr_auto_1fr_auto_1fr] items-center overflow-hidden rounded-sm"
          style={{
            background:
              "linear-gradient(180deg, rgba(28,28,34,0.96) 0%, rgba(10,10,14,0.98) 100%)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 28px rgba(0,0,0,0.6)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0 px-4 h-full">
            <MapPin className="w-6 h-6 text-red-500 shrink-0" strokeWidth={2.5} />
            <PosterEditableText
              value={venue}
              onChange={onVenueChange}
              placeholder="SAHA ADI"
              variant="footer"
              align="left"
              style={footerTextStyle}
            />
          </div>

          <div
            className="h-[55%] w-px shrink-0"
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgba(255,255,255,0.3) 40%, rgba(255,255,255,0.3) 60%, transparent)",
              transform: "skewX(-14deg)",
            }}
          />

          <div className="flex items-center justify-center gap-2 min-w-0 px-3 h-full">
            <Clock className="w-6 h-6 text-red-500 shrink-0" strokeWidth={2.5} />
            <span
              className="font-black uppercase tracking-wide text-white whitespace-nowrap shrink-0"
              style={footerTextStyle}
            >
              SAAT:
            </span>
            <PosterEditableText
              value={time}
              onChange={onTimeChange}
              placeholder="21:00"
              variant="footerAccent"
              align="center"
              style={footerTextStyle}
            />
          </div>

          <div
            className="h-[55%] w-px shrink-0"
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgba(255,255,255,0.3) 40%, rgba(255,255,255,0.3) 60%, transparent)",
              transform: "skewX(-14deg)",
            }}
          />

          <div className="flex items-center justify-end gap-2 min-w-0 px-4 h-full">
            <Calendar className="w-6 h-6 text-red-500 shrink-0" strokeWidth={2.5} />
            <span
              className="font-black uppercase tracking-wide text-white whitespace-nowrap shrink-0"
              style={footerTextStyle}
            >
              TARİH:
            </span>
            <PosterDateField
              value={date}
              onChange={onDateChange}
              placeholder={todayDisplayDate()}
              style={footerTextStyle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MatchPoster({
  onEditPlayer,
  onLogoClick,
}: {
  onEditPlayer: (team: "home" | "away", slotIndex: number) => void;
  onLogoClick?: (team: "home" | "away") => void;
}) {
  const matchInfo = useAppStore((s) => s.matchInfo);
  const setMatchInfo = useAppStore((s) => s.setMatchInfo);
  const homeTeam = useAppStore((s) => s.homeTeam);
  const awayTeam = useAppStore((s) => s.awayTeam);

  return (
    <div
      id="match-poster"
      className="relative h-full max-h-full w-auto overflow-hidden"
      style={{ aspectRatio: "16/10" }}
    >
      <StaticPosterBackground />

      <div className="relative z-10 h-full">
        <PosterTitleDisplay />

        <div
          className="absolute"
          style={{
            top: "14.5%",
            left: "7%",
            width: "86%",
            height: "63%",
          }}
        >
          <TeamPosterBlock team={homeTeam} side="left" onLogoClick={onLogoClick} />
          <TeamPosterBlock team={awayTeam} side="right" onLogoClick={onLogoClick} />

          <div className="absolute inset-0 overflow-hidden">
            <PitchPlayerLayer onEditPlayer={onEditPlayer} />
          </div>
        </div>

        <PosterFooter
          venue={matchInfo.venue}
          time={matchInfo.time}
          date={matchInfo.date}
          onVenueChange={(venue) => setMatchInfo({ venue })}
          onTimeChange={(time) => setMatchInfo({ time })}
          onDateChange={(date) => setMatchInfo({ date })}
        />
      </div>
    </div>
  );
}
