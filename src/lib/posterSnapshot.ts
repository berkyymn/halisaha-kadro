import { normalizePosterTheme } from "@/lib/posterThemes";
import { clampTitleFontSize, DEFAULT_TITLE_STYLE } from "@/lib/posterTitleStyles";
import { normalizeTeamLogo } from "@/lib/logoUtils";
import { normalizeJersey } from "@/lib/jerseyOptions";
import { buildPersistedPlayerRegistry } from "@/lib/playerPool";
import {
  EMPTY_FORMAT_OVERFLOW,
  normalizeRoster,
  parseFormatOverflow,
  type FormatOverflow,
} from "@/lib/rosterIntegrity";
import { DEFAULT_MATCH_TIME, normalizeMatchTime, todayDisplayDate } from "@/lib/matchDate";
import { DEFAULT_LOGO_DISPLAY_SIZE } from "@/types";
import type {
  AppMode,
  MatchInfo,
  PitchPlayer,
  Player,
  PosterThemeId,
  SquadSize,
  TeamConfig,
} from "@/types";

export const POSTER_SNAPSHOT_VERSION = 1;

export type TeamMode = "single" | "versus";

export type PosterSnapshot = {
  schemaVersion: number;
  teamMode: TeamMode;
  mode: AppMode;
  savedPlayers: Record<string, Player>;
  benchPlayerIds: string[];
  /** Format küçülünce yedeğe inen oyuncular (takım başına yığın) */
  formatOverflow: FormatOverflow;
  matchInfo: MatchInfo;
  squadSize: SquadSize;
  homeTeam: TeamConfig;
  awayTeam: TeamConfig;
  homeFormationId: string;
  awayFormationId: string;
  pitchPlayers: PitchPlayer[];
  singlePitchPlayers: PitchPlayer[];
  playerCardSize: number;
  teamLogoDisplaySize: number;
  posterTheme: PosterThemeId;
  localUpdatedAt?: string;
};

export function createDefaultMatchInfo(): MatchInfo {
  return {
    titleLine1: "DERBİ",
    titleLine2: "GECESİ",
    ...DEFAULT_TITLE_STYLE,
    // Yeni posterde başlık kapalı başlar; isteyen "+ Başlık ekle" ile açar.
    titleHidden: true,
    venue: "HALI SAHA",
    time: DEFAULT_MATCH_TIME,
    date: todayDisplayDate(),
  };
}

export function normalizeMatchInfo(info: Partial<MatchInfo> | undefined): MatchInfo {
  const defaults = createDefaultMatchInfo();
  if (!info) return defaults;
  // Kaldırılan alanlar (döndürme, max genişlik) eski kayıtlarda kalmasın.
  const legacy = info as Partial<MatchInfo> & { titleRotation?: unknown; titleMaxWidth?: unknown };
  const { titleRotation, titleMaxWidth, ...rest } = legacy;
  void titleRotation;
  void titleMaxWidth;
  return {
    ...defaults,
    ...rest,
    titleSubtitle: info.titleSubtitle ?? "",
    titleHidden: info.titleHidden === true,
    titleStyleId: info.titleStyleId ?? DEFAULT_TITLE_STYLE.titleStyleId,
    titleEffectId: info.titleEffectId ?? DEFAULT_TITLE_STYLE.titleEffectId,
    titleFontSize: clampTitleFontSize(info.titleFontSize),
    titleLetterSpacing:
      info.titleLetterSpacing ?? DEFAULT_TITLE_STYLE.titleLetterSpacing,
    titleShadow: info.titleShadow ?? DEFAULT_TITLE_STYLE.titleShadow,
    time: normalizeMatchTime(info.time),
  };
}

function withLogo(team: TeamConfig): TeamConfig {
  return {
    ...team,
    jersey: normalizeJersey(team.jersey),
    logo: normalizeTeamLogo(team.logo, team.shortName),
  };
}

export type PosterSnapshotSource = {
  teamMode: TeamMode;
  mode: AppMode;
  players: Record<string, Player>;
  savedPlayers: Record<string, Player>;
  benchPlayerIds: string[];
  formatOverflow?: FormatOverflow;
  matchInfo: MatchInfo;
  squadSize: SquadSize;
  homeTeam: TeamConfig;
  awayTeam: TeamConfig;
  homeFormationId: string;
  awayFormationId: string;
  pitchPlayers: PitchPlayer[];
  singlePitchPlayers: PitchPlayer[];
  playerCardSize: number;
  teamLogoDisplaySize: number;
  posterTheme: PosterThemeId;
  localUpdatedAt?: string;
};

export function buildPosterSnapshot(source: PosterSnapshotSource): PosterSnapshot {
  return {
    schemaVersion: POSTER_SNAPSHOT_VERSION,
    teamMode: source.teamMode,
    mode: source.mode,
    savedPlayers: buildPersistedPlayerRegistry(
      source.players,
      source.savedPlayers,
      source.benchPlayerIds,
      source.homeTeam,
      source.awayTeam,
      source.squadSize
    ),
    benchPlayerIds: source.benchPlayerIds,
    formatOverflow: source.formatOverflow ?? EMPTY_FORMAT_OVERFLOW,
    matchInfo: source.matchInfo,
    squadSize: source.squadSize,
    homeTeam: source.homeTeam,
    awayTeam: source.awayTeam,
    homeFormationId: source.homeFormationId,
    awayFormationId: source.awayFormationId,
    pitchPlayers: source.pitchPlayers,
    singlePitchPlayers: source.singlePitchPlayers,
    playerCardSize: source.playerCardSize,
    teamLogoDisplaySize: source.teamLogoDisplaySize,
    posterTheme: source.posterTheme,
    localUpdatedAt: source.localUpdatedAt,
  };
}

/** localStorage / bulut yükleme sonrası oyuncu ve takım kayıtlarını tutarlı hale getirir */
export function finalizePosterSnapshot(
  partial: PosterSnapshotSource
): PosterSnapshotSource {
  const roster = normalizeRoster({
    squadSize: partial.squadSize,
    homeTeam: withLogo(partial.homeTeam),
    awayTeam: withLogo(partial.awayTeam),
    savedPlayers: partial.savedPlayers ?? {},
    benchPlayerIds: partial.benchPlayerIds ?? [],
    formatOverflow: parseFormatOverflow(partial.formatOverflow),
  });

  return {
    ...partial,
    ...roster,
    matchInfo: normalizeMatchInfo(partial.matchInfo),
    posterTheme: normalizePosterTheme(partial.posterTheme),
    teamLogoDisplaySize:
      partial.teamLogoDisplaySize || DEFAULT_LOGO_DISPLAY_SIZE,
  };
}

export function parsePosterSnapshot(raw: unknown): PosterSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<PosterSnapshot>;
  if (!data.homeTeam || !data.awayTeam) return null;
  return {
    schemaVersion: data.schemaVersion ?? POSTER_SNAPSHOT_VERSION,
    teamMode: data.teamMode === "single" ? "single" : "versus",
    mode: data.mode ?? "guest",
    savedPlayers: data.savedPlayers ?? {},
    benchPlayerIds: data.benchPlayerIds ?? [],
    formatOverflow: parseFormatOverflow(data.formatOverflow),
    matchInfo: normalizeMatchInfo(data.matchInfo),
    squadSize: (data.squadSize as SquadSize) ?? 7,
    homeTeam: data.homeTeam,
    awayTeam: data.awayTeam,
    homeFormationId: data.homeFormationId ?? "7-3-2-1",
    awayFormationId: data.awayFormationId ?? "7-3-2-1",
    pitchPlayers: data.pitchPlayers ?? [],
    singlePitchPlayers: data.singlePitchPlayers ?? [],
    playerCardSize: data.playerCardSize ?? 100,
    teamLogoDisplaySize: data.teamLogoDisplaySize ?? DEFAULT_LOGO_DISPLAY_SIZE,
    posterTheme: normalizePosterTheme(data.posterTheme),
    localUpdatedAt: data.localUpdatedAt,
  };
}
