import { normalizePosterTheme } from "@/lib/posterThemes";
import { DEFAULT_TITLE_STYLE } from "@/lib/posterTitleStyles";
import { normalizeTeamLogo } from "@/lib/logoUtils";
import { normalizeJersey } from "@/lib/jerseyOptions";
import { buildPersistedPlayerRegistry, rebuildActivePlayers, sanitizeBenchIds } from "@/lib/playerPool";
import { fillEmptyRosterSlots } from "@/lib/defaultRoster";
import { padPlayerIds } from "@/lib/defaults";
import { todayDisplayDate } from "@/lib/matchDate";
import { DEFAULT_LOGO_DISPLAY_SIZE } from "@/types";
import { mergeSavedPlayersPreservingLocalPhotos } from "@/lib/playerPhotos";
import { mergeTeamLogoPreservingLocal, shouldPreferLocalTeamBranding } from "@/lib/teamLogoCloud";
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

export type PosterSnapshot = {
  schemaVersion: number;
  mode: AppMode;
  savedPlayers: Record<string, Player>;
  benchPlayerIds: string[];
  matchInfo: MatchInfo;
  squadSize: SquadSize;
  homeTeam: TeamConfig;
  awayTeam: TeamConfig;
  homeFormationId: string;
  awayFormationId: string;
  pitchPlayers: PitchPlayer[];
  playerCardSize: number;
  photoScalePercent: number;
  teamLogoDisplaySize: number;
  posterTheme: PosterThemeId;
  localUpdatedAt?: string;
};

export function createDefaultMatchInfo(): MatchInfo {
  return {
    titleLine1: "DERBİ",
    titleLine2: "GECESİ",
    ...DEFAULT_TITLE_STYLE,
    venue: "DEMİR TEKLİ HALISAHA",
    time: "21:00",
    date: todayDisplayDate(),
  };
}

export function normalizeMatchInfo(info: Partial<MatchInfo> | undefined): MatchInfo {
  const defaults = createDefaultMatchInfo();
  if (!info) return defaults;
  return {
    ...defaults,
    ...info,
    titleSubtitle: info.titleSubtitle ?? "",
    titleStyleId: info.titleStyleId ?? DEFAULT_TITLE_STYLE.titleStyleId,
    titleEffectId: info.titleEffectId ?? DEFAULT_TITLE_STYLE.titleEffectId,
    titleFontSize: info.titleFontSize ?? DEFAULT_TITLE_STYLE.titleFontSize,
    titleLetterSpacing:
      info.titleLetterSpacing ?? DEFAULT_TITLE_STYLE.titleLetterSpacing,
    titleShadow: info.titleShadow ?? DEFAULT_TITLE_STYLE.titleShadow,
    titleRotation: info.titleRotation ?? DEFAULT_TITLE_STYLE.titleRotation,
    titleMaxWidth: info.titleMaxWidth ?? DEFAULT_TITLE_STYLE.titleMaxWidth,
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
  mode: AppMode;
  players: Record<string, Player>;
  savedPlayers: Record<string, Player>;
  benchPlayerIds: string[];
  matchInfo: MatchInfo;
  squadSize: SquadSize;
  homeTeam: TeamConfig;
  awayTeam: TeamConfig;
  homeFormationId: string;
  awayFormationId: string;
  pitchPlayers: PitchPlayer[];
  playerCardSize: number;
  photoScalePercent: number;
  teamLogoDisplaySize: number;
  posterTheme: PosterThemeId;
  localUpdatedAt?: string;
};

export function buildPosterSnapshot(source: PosterSnapshotSource): PosterSnapshot {
  return {
    schemaVersion: POSTER_SNAPSHOT_VERSION,
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
    matchInfo: source.matchInfo,
    squadSize: source.squadSize,
    homeTeam: source.homeTeam,
    awayTeam: source.awayTeam,
    homeFormationId: source.homeFormationId,
    awayFormationId: source.awayFormationId,
    pitchPlayers: source.pitchPlayers,
    playerCardSize: source.playerCardSize,
    photoScalePercent: source.photoScalePercent,
    teamLogoDisplaySize: source.teamLogoDisplaySize,
    posterTheme: source.posterTheme,
    localUpdatedAt: source.localUpdatedAt,
  };
}

function mergeTeamConfig(
  local: TeamConfig,
  remote: TeamConfig,
  side: "home" | "away",
  forceLocal = false,
  preferLocalBrandingWhenBothCustomized = false
): TeamConfig {
  if (forceLocal) {
    return local;
  }
  const logo = mergeTeamLogoPreservingLocal(
    local.logo,
    remote.logo,
    side,
    preferLocalBrandingWhenBothCustomized
  );
  const preferLocalBranding = shouldPreferLocalTeamBranding(local, remote, side);
  return {
    ...remote,
    logo,
    jersey: preferLocalBranding ? local.jersey : remote.jersey,
    atmosphereColor: preferLocalBranding
      ? local.atmosphereColor
      : remote.atmosphereColor,
  };
}

export type MergePosterSnapshotOptions = {
  remoteDocUpdatedAt?: string;
};

export function mergePosterSnapshot(
  current: PosterSnapshotSource,
  saved: Partial<PosterSnapshot>,
  options?: MergePosterSnapshotOptions
): PosterSnapshotSource {
  const localTime = current.localUpdatedAt || "";
  const remoteTime =
    saved.localUpdatedAt || options?.remoteDocUpdatedAt || "";
  const preferLocal = Boolean(localTime && (!remoteTime || localTime > remoteTime));
  const preferLocalBrandingWhenBothCustomized = preferLocal;

  if (preferLocal) {
    return current;
  }

  return {
    ...current,
    ...saved,
    localUpdatedAt: remoteTime || current.localUpdatedAt,
    savedPlayers: saved.savedPlayers
      ? mergeSavedPlayersPreservingLocalPhotos(
          current.savedPlayers ?? {},
          saved.savedPlayers
        )
      : current.savedPlayers,
    homeTeam: saved.homeTeam
      ? mergeTeamConfig(
          current.homeTeam,
          saved.homeTeam,
          "home",
          preferLocal,
          preferLocalBrandingWhenBothCustomized
        )
      : current.homeTeam,
    awayTeam: saved.awayTeam
      ? mergeTeamConfig(
          current.awayTeam,
          saved.awayTeam,
          "away",
          preferLocal,
          preferLocalBrandingWhenBothCustomized
        )
      : current.awayTeam,
    posterTheme: normalizePosterTheme(saved.posterTheme ?? current.posterTheme),
    matchInfo: normalizeMatchInfo(saved.matchInfo ?? current.matchInfo),
  };
}

/** localStorage / bulut yükleme sonrası oyuncu ve takım kayıtlarını tutarlı hale getirir */
export function finalizePosterSnapshot(
  partial: PosterSnapshotSource
): PosterSnapshotSource {
  const matchInfo = normalizeMatchInfo(partial.matchInfo);
  const homeTeam = withLogo(partial.homeTeam);
  const awayTeam = withLogo(partial.awayTeam);
  const posterTheme = normalizePosterTheme(partial.posterTheme);
  const teamLogoDisplaySize =
    partial.teamLogoDisplaySize || DEFAULT_LOGO_DISPLAY_SIZE;
  const benchPlayerIds = partial.benchPlayerIds ?? [];
  let savedPlayers = partial.savedPlayers ?? {};

  const homeFilled = fillEmptyRosterSlots(
    partial.squadSize,
    padPlayerIds(homeTeam.playerIds, partial.squadSize),
    savedPlayers
  );
  const awayFilled = fillEmptyRosterSlots(
    partial.squadSize,
    padPlayerIds(awayTeam.playerIds, partial.squadSize),
    homeFilled.players
  );
  savedPlayers = {
    ...savedPlayers,
    ...homeFilled.players,
    ...awayFilled.players,
  };

  const normalizedHome = { ...homeTeam, playerIds: homeFilled.playerIds };
  const normalizedAway = { ...awayTeam, playerIds: awayFilled.playerIds };
  const sanitizedBench = sanitizeBenchIds(
    benchPlayerIds,
    normalizedHome,
    normalizedAway,
    partial.squadSize
  );

  return {
    ...partial,
    matchInfo,
    homeTeam: normalizedHome,
    awayTeam: normalizedAway,
    posterTheme,
    teamLogoDisplaySize,
    benchPlayerIds: sanitizedBench,
    savedPlayers,
    players: rebuildActivePlayers(
      savedPlayers,
      sanitizedBench,
      normalizedHome,
      normalizedAway,
      partial.squadSize
    ),
  };
}

export function parsePosterSnapshot(raw: unknown): PosterSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<PosterSnapshot>;
  if (!data.homeTeam || !data.awayTeam) return null;
  return {
    schemaVersion: data.schemaVersion ?? POSTER_SNAPSHOT_VERSION,
    mode: data.mode ?? "guest",
    savedPlayers: data.savedPlayers ?? {},
    benchPlayerIds: data.benchPlayerIds ?? [],
    matchInfo: normalizeMatchInfo(data.matchInfo),
    squadSize: (data.squadSize as SquadSize) ?? 7,
    homeTeam: data.homeTeam,
    awayTeam: data.awayTeam,
    homeFormationId: data.homeFormationId ?? "7-1-3-2",
    awayFormationId: data.awayFormationId ?? "7-1-3-2",
    pitchPlayers: data.pitchPlayers ?? [],
    playerCardSize: data.playerCardSize ?? 100,
    photoScalePercent: data.photoScalePercent ?? 100,
    teamLogoDisplaySize: data.teamLogoDisplaySize ?? DEFAULT_LOGO_DISPLAY_SIZE,
    posterTheme: normalizePosterTheme(data.posterTheme),
    localUpdatedAt: data.localUpdatedAt,
  };
}
