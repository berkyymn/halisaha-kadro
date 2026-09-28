"use client";

import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  type PersistOptions,
  type StateStorage,
} from "zustand/middleware";
import { trackEvent } from "@/lib/analytics";
import {
  getDefaultFormationId,
  getFormationById,
} from "@/lib/formations";
import { getFormationSlotCount } from "@/lib/formationEngine";
import { DEFAULT_POSTER_THEME, normalizePosterTheme } from "@/lib/posterThemes";
import { defaultTitleStyleForTheme } from "@/lib/posterTitleStyles";
import { normalizeTeamLogo, clampLogoDisplaySize } from "@/lib/logoUtils";
import { normalizeJersey } from "@/lib/jerseyOptions";
import { defaultAwayTeam, defaultHomeTeam, padPlayerIds } from "@/lib/defaults";
import { buildDefaultRoster, fillEmptyRosterSlots } from "@/lib/defaultRoster";
import {
  collectLineupPlayerIds,
  rebuildActivePlayers,
  sanitizeBenchIds,
  buildPersistedPlayerRegistry,
  isCustomizedPlayer,
} from "@/lib/playerPool";
import {
  collectTeamLineupNumbers,
  resolveJerseyNumber,
  resolveSameTeamJerseyConflicts,
} from "@/lib/teamJerseyNumbers";
import { DEFAULT_LOGO_DISPLAY_SIZE, MAX_PLAYER_CARD_SIZE, MIN_PLAYER_CARD_SIZE } from "@/types";
import type {
  AppMode,
  MatchInfo,
  PhotoCrop,
  PitchPlayer,
  Player,
  PosterThemeId,
  SquadSize,
  TeamConfig,
} from "@/types";
import {
  DEFAULT_AWAY_PRESET_ID,
  DEFAULT_HOME_PRESET_ID,
} from "@/lib/logoImagePresets";
import { todayDisplayDate } from "@/lib/matchDate";
import {
  buildPosterSnapshot,
  createDefaultMatchInfo,
  finalizePosterSnapshot,
  mergePosterSnapshot,
  normalizeMatchInfo,
  parsePosterSnapshot,
  type PosterSnapshot,
} from "@/lib/posterSnapshot";
import { maxIsoTimestamp } from "@/lib/brandingSnapshot";
import { bumpSyncRevisions, DEFAULT_SYNC_REVISIONS } from "@/lib/syncRevisionBump";
import type { SyncRevisions } from "@/lib/syncRevisions";
import { indexedDBStorage } from "@/lib/indexedDBStorage";
import { MAX_BENCH_PLAYERS } from "@/lib/limits";
import {
  EMPTY_FORMAT_OVERFLOW,
  normalizeRoster,
  pruneFormatOverflow,
  resizeSquad,
  type FormatOverflow,
} from "@/lib/rosterIntegrity";

let appStoreHydrated = false;

/**
 * Diske yazma kilidi. zustand persist, depolamadan okuma (async) bitmeden
 * yapılan her set()'i de diske yazar; bu sırada state henüz varsayılan
 * kadrodur ve kayıtlı veriyi ezer (ör. auth durumu IndexedDB'den önce
 * gelip setRemoteHydrating çağırırsa). Okuma sürerken yazılar yok sayılır.
 */
let persistWritesEnabled = false;
let migratedDuringHydration = false;

const guardedStorage: StateStorage = {
  getItem: (name) => indexedDBStorage.getItem(name),
  setItem: (name, value) => {
    if (!persistWritesEnabled) return;
    return indexedDBStorage.setItem(name, value);
  },
  removeItem: (name) => indexedDBStorage.removeItem(name),
};
const appStoreHydrationWaiters = new Set<() => void>();

export function hasAppStoreHydrated(): boolean {
  return appStoreHydrated;
}

export function onAppStoreHydrated(callback: () => void): () => void {
  if (appStoreHydrated) {
    callback();
    return () => {};
  }
  appStoreHydrationWaiters.add(callback);
  return () => {
    appStoreHydrationWaiters.delete(callback);
  };
}

function markAppStoreHydrated(): void {
  if (appStoreHydrated) return;
  appStoreHydrated = true;
  for (const callback of appStoreHydrationWaiters) {
    callback();
  }
  appStoreHydrationWaiters.clear();
}

function withLogo(team: TeamConfig): TeamConfig {
  return {
    ...team,
    jersey: normalizeJersey(team.jersey),
    logo: normalizeTeamLogo(team.logo, team.shortName),
  };
}


function autoAssignLineup(
  team: TeamConfig,
  formationId: string,
  side: "home" | "away",
  players: Record<string, Player>
): PitchPlayer[] {
  const formation = getFormationById(formationId);
  if (!formation) return [];

  return Array.from({ length: getFormationSlotCount(formation) }, (_, index) => {
    const playerId = team.playerIds[index] ?? "";
    return {
      playerId: playerId && players[playerId] ? playerId : "",
      slotIndex: index,
      team: side,
    };
  });
}

function samePitchPlayers(a: PitchPlayer[], b: PitchPlayer[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((pp, i) => {
    const other = b[i];
    return (
      pp.team === other.team &&
      pp.slotIndex === other.slotIndex &&
      pp.playerId === other.playerId &&
      pp.x === other.x &&
      pp.y === other.y
    );
  });
}

type PlayerPhotoInput = {
  cutoutUrl?: string;
  photoSource?: string;
  photoCrop?: PhotoCrop;
  clearPhoto?: boolean;
};

/**
 * Modal kaydından gelen fotoğraf alanlarını oyuncu patch'ine çevirir.
 * - clearPhoto: tüm yerel + bulut (Storage yolu) medya alanları temizlenir;
 *   aksi halde bulutta yol kalır ve fotoğraf yenilemede geri gelir.
 * - photoSource verildiyse fotoğraf seti bütün olarak değişir: cutout yoksa
 *   eski cutout da (ve Storage yolu) kaldırılır.
 */
function buildPlayerPhotoPatch(
  existing: Player | undefined,
  data: PlayerPhotoInput
): Partial<Player> {
  if (data.clearPhoto) {
    return {
      avatarUrl: undefined,
      photoSource: undefined,
      photoCrop: undefined,
      cutoutUrl: undefined,
      photoUrl: undefined,
      cutoutStoragePath: undefined,
      photoSourceStoragePath: undefined,
    };
  }
  const patch: Partial<Player> = {};
  if (data.photoCrop !== undefined) patch.photoCrop = data.photoCrop;
  if (data.photoSource !== undefined) {
    patch.photoSource = data.photoSource;
    patch.cutoutUrl = data.cutoutUrl;
    if (!data.cutoutUrl) patch.cutoutStoragePath = undefined;
    if (data.photoSource !== existing?.photoSource) {
      patch.avatarUrl = undefined;
      patch.photoUrl = undefined;
      patch.didCompress = true;
    }
  } else if (data.cutoutUrl !== undefined) {
    patch.cutoutUrl = data.cutoutUrl;
  }
  return patch;
}

interface AppStore {
  teamMode: "single" | "versus";
  mode: AppMode;
  matchInfo: MatchInfo;
  squadSize: SquadSize;
  homeTeam: TeamConfig;
  awayTeam: TeamConfig;
  players: Record<string, Player>;
  savedPlayers: Record<string, Player>;
  benchPlayerIds: string[];
  formatOverflow: FormatOverflow;
  homeFormationId: string;
  awayFormationId: string;
  pitchPlayers: PitchPlayer[];
  singlePitchPlayers: PitchPlayer[];
  playerCardSize: number;
  teamLogoDisplaySize: number;
  posterTheme: PosterThemeId;
  logoDesignerTeam: "home" | "away" | null;
  remoteHydrating: boolean;
  localUpdatedAt?: string;
  syncRevisions: SyncRevisions;

  setRemoteHydrating: (value: boolean) => void;
  getPosterSnapshot: () => PosterSnapshot;
  hydrateFromSnapshot: (
    snapshot: PosterSnapshot,
    updatedAt?: string,
    options?: { replace?: boolean }
  ) => void;
  appendPlayersToBench: (players: Player[]) => void;
  setTeamMode: (mode: "single" | "versus") => void;
  setMatchInfo: (info: Partial<MatchInfo>) => void;
  setSquadSize: (size: SquadSize) => void;
  setHomeFormation: (id: string) => void;
  setAwayFormation: (id: string) => void;
  updateHomeTeam: (team: Partial<TeamConfig>) => void;
  updateAwayTeam: (team: Partial<TeamConfig>) => void;
  setSlotPlayer: (
    team: "home" | "away",
    slotIndex: number,
    data: {
      name?: string;
      number?: number;
      cutoutUrl?: string;
      photoSource?: string;
      photoCrop?: PhotoCrop;
      clearPhoto?: boolean;
    }
  ) => void;
  setCaptain: (team: "home" | "away", slotIndex: number | null) => void;
  updatePlayer: (id: string, data: Partial<Player>) => void;
  applyCompressedPlayers: (
    players: Record<string, Player>,
    savedPlayers: Record<string, Player>,
    options?: { photosChanged?: boolean }
  ) => void;
  movePitchPlayer: (
    team: "home" | "away",
    slotIndex: number,
    x: number,
    y: number
  ) => void;
  clearPitchPlayerPosition: (team: "home" | "away", slotIndex: number) => void;
  applyFormations: (options?: {
    resetHome?: boolean;
    resetAway?: boolean;
  }) => void;
  resetPitchPositions: (team?: "home" | "away") => void;
  resetGuestSession: () => void;
  setTeamLogoDisplaySize: (size: number) => void;
  setPosterTheme: (theme: PosterThemeId) => void;
  setLogoDesignerTeam: (team: "home" | "away" | null) => void;
  addPlayerToBench: (data: {
    name?: string;
    number?: number;
  }) => string;
  updateBenchPlayer: (
    playerId: string,
    data: {
      name?: string;
      number?: number;
      cutoutUrl?: string;
      photoSource?: string;
      photoCrop?: PhotoCrop;
      clearPhoto?: boolean;
    }
  ) => void;
  removeFromBench: (playerId: string) => void;
  assignBenchToSlot: (
    team: "home" | "away",
    slotIndex: number,
    benchPlayerId: string
  ) => void;
  moveSlotToBench: (team: "home" | "away", slotIndex: number) => void;
  swapPlayers: (
    team1: "home" | "away",
    slotIndex1: number,
    team2: "home" | "away",
    slotIndex2: number
  ) => void;
}

function registerPlayer(
  players: Record<string, Player>,
  savedPlayers: Record<string, Player>,
  player: Player
): { players: Record<string, Player>; savedPlayers: Record<string, Player> } {
  return {
    players: { ...players, [player.id]: player },
    savedPlayers: { ...savedPlayers, [player.id]: player },
  };
}

const initialRoster = buildDefaultRoster(7);

export const useAppStore = create<AppStore>()(
  persist(
    (realSet, get) => {
      const set: typeof realSet = (state, replace) => {
        const prev = get();
        const nextState =
          typeof state === "function"
            ? (state as (s: AppStore) => Partial<AppStore>)(prev)
            : state;

        const posterKeys = [
          "mode",
          "matchInfo",
          "squadSize",
          "homeTeam",
          "awayTeam",
          "players",
          "savedPlayers",
          "benchPlayerIds",
          "formatOverflow",
          "homeFormationId",
          "awayFormationId",
          "pitchPlayers",
          "singlePitchPlayers",
          "playerCardSize",
          "teamLogoDisplaySize",
          "posterTheme",
          "teamMode",
        ];

        const hasPosterChanges =
          nextState &&
          Object.keys(nextState).some((k) => posterKeys.includes(k));

        const mergedState = {
          ...nextState,
          ...(hasPosterChanges
            ? {
                localUpdatedAt: new Date().toISOString(),
                syncRevisions: bumpSyncRevisions(
                  prev.syncRevisions,
                  prev,
                  nextState as Record<string, unknown>
                ),
              }
            : {}),
        };

        realSet(
          mergedState as unknown as (
            | AppStore
            | Partial<AppStore>
            | ((state: AppStore) => AppStore | Partial<AppStore>)
          ),
          replace as false | undefined
        );
      };

      return {
        teamMode: "versus",
        mode: "guest",
        matchInfo: createDefaultMatchInfo(),
        squadSize: 7,
        homeTeam: { ...defaultHomeTeam, playerIds: initialRoster.homePlayerIds },
        awayTeam: { ...defaultAwayTeam, playerIds: initialRoster.awayPlayerIds },
        players: initialRoster.players,
        savedPlayers: initialRoster.players,
        benchPlayerIds: [],
        formatOverflow: EMPTY_FORMAT_OVERFLOW,
        homeFormationId: getDefaultFormationId(7),
        awayFormationId: getDefaultFormationId(7),
        pitchPlayers: [],
        singlePitchPlayers: [],
        playerCardSize: 100,
        teamLogoDisplaySize: DEFAULT_LOGO_DISPLAY_SIZE,
        posterTheme: DEFAULT_POSTER_THEME,
        logoDesignerTeam: null,
        remoteHydrating: false,
        localUpdatedAt: undefined,
        syncRevisions: { ...DEFAULT_SYNC_REVISIONS },

      setRemoteHydrating: (value) => set({ remoteHydrating: value }),

      getPosterSnapshot: () => buildPosterSnapshot(get()),

      hydrateFromSnapshot: (snapshot, updatedAt, options) => {
        const parsed = parsePosterSnapshot(snapshot);
        if (!parsed) return;
        const current = get();
        // replace: yerel veriyle hiç birleştirmeden gelen snapshot'ı uygula
        // ("Bulutu kullan"). Aksi halde LWW + yerel medya koruma.
        const finalized = finalizePosterSnapshot(
          options?.replace
            ? { ...current, ...parsed, players: parsed.savedPlayers }
            : mergePosterSnapshot(current, parsed, {
                remoteDocUpdatedAt: updatedAt,
              })
        );
        const resolvedUpdatedAt = options?.replace
          ? maxIsoTimestamp(parsed.localUpdatedAt, updatedAt)
          : maxIsoTimestamp(
              current.localUpdatedAt,
              parsed.localUpdatedAt,
              updatedAt
            );
        realSet(
          {
            teamMode: finalized.teamMode,
            mode: finalized.mode,
            matchInfo: finalized.matchInfo,
            squadSize: finalized.squadSize,
            homeTeam: finalized.homeTeam,
            awayTeam: finalized.awayTeam,
            players: finalized.players,
            savedPlayers: finalized.savedPlayers,
            benchPlayerIds: finalized.benchPlayerIds,
            formatOverflow: finalized.formatOverflow ?? EMPTY_FORMAT_OVERFLOW,
            homeFormationId: finalized.homeFormationId,
            awayFormationId: finalized.awayFormationId,
            pitchPlayers: finalized.pitchPlayers,
            singlePitchPlayers: finalized.singlePitchPlayers,
            playerCardSize: finalized.playerCardSize,
            teamLogoDisplaySize: finalized.teamLogoDisplaySize,
            posterTheme: finalized.posterTheme,
            logoDesignerTeam: null,
            localUpdatedAt: resolvedUpdatedAt,
          },
          false
        );
      },

      appendPlayersToBench: (incoming) => {
        if (incoming.length === 0) return;
        set((s) => {
          const savedPlayers = { ...s.savedPlayers };
          const benchPlayerIds = [...s.benchPlayerIds];
          for (const player of incoming) {
            if (savedPlayers[player.id]) continue;
            savedPlayers[player.id] = player;
            benchPlayerIds.push(player.id);
          }
          return {
            savedPlayers,
            benchPlayerIds,
            players: rebuildActivePlayers(
              savedPlayers,
              benchPlayerIds,
              s.homeTeam,
              s.awayTeam,
              s.squadSize
            ),
          };
        });
      },

      setTeamMode: (teamMode) => {
        trackEvent("team_mode_changed", { team_mode: teamMode });
        set({ teamMode });
      },

      setMatchInfo: (info) =>
        set((s) => ({
          matchInfo: normalizeMatchInfo({ ...s.matchInfo, ...info }),
        })),

      setSquadSize: (size) => {
        const s = get();
        // Format değişimi kadro verisini asla kaybetmez: çıkan özel oyuncular
        // yedeğe iner, format büyüyünce kendi takımlarına geri döner.
        const resized = resizeSquad(s, size);
        if (!resized) return;
        trackEvent("squad_size_changed", { squad_size: size });
        const formationId = getDefaultFormationId(size);
        set({
          ...resized,
          homeFormationId: formationId,
          awayFormationId: formationId,
        });
        get().applyFormations({ resetHome: true, resetAway: true });
      },

      setHomeFormation: (id) => {
        trackEvent("formation_changed", { team: "home", formation_id: id });
        set({ homeFormationId: id });
        get().applyFormations({ resetHome: true });
      },

      setAwayFormation: (id) => {
        trackEvent("formation_changed", { team: "away", formation_id: id });
        set({ awayFormationId: id });
        get().applyFormations({ resetAway: true });
      },

      updateHomeTeam: (team) =>
        set((s) => ({
          homeTeam: {
            ...s.homeTeam,
            ...team,
            logo: team.logo
              ? normalizeTeamLogo(
                  { ...s.homeTeam.logo, ...team.logo },
                  team.shortName ?? s.homeTeam.shortName
                )
              : s.homeTeam.logo,
          },
        })),

      updateAwayTeam: (team) =>
        set((s) => ({
          awayTeam: {
            ...s.awayTeam,
            ...team,
            logo: team.logo
              ? normalizeTeamLogo(
                  { ...s.awayTeam.logo, ...team.logo },
                  team.shortName ?? s.awayTeam.shortName
                )
              : s.awayTeam.logo,
          },
        })),

      setSlotPlayer: (team, slotIndex, data) => {
        const s = get();
        const key = team === "home" ? "homeTeam" : "awayTeam";
        const t = s[key];
        const ids = padPlayerIds(t.playerIds, s.squadSize);
        let playerId = ids[slotIndex];
        const name = data.name ?? "";
        // Takımda aynı numara olamaz: doluysa bir yukarı (99 → 1).
        const registry = { ...s.savedPlayers, ...s.players };
        const takenNumbers = collectTeamLineupNumbers(
          { ...t, playerIds: ids },
          s.squadSize,
          registry,
          playerId || undefined
        );
        const requestedNumber =
          data.number ?? (playerId ? registry[playerId]?.number : undefined) ?? slotIndex + 1;
        const number = resolveJerseyNumber(requestedNumber, takenNumbers);

        if (!playerId) {
          if (
            !name.trim() &&
            !data.photoSource &&
            !data.cutoutUrl &&
            data.number === undefined
          )
            return;
          playerId = crypto.randomUUID();
          const player: Player = {
            id: playerId,
            name,
            number,
            photoSource: data.photoSource,
            cutoutUrl: data.cutoutUrl,
            photoCrop: data.photoCrop,
          };
          ids[slotIndex] = playerId;
          set((state) => {
            const players = { ...state.players, [playerId]: player };
            const savedPlayers = { ...state.savedPlayers, [playerId]: player };
            return { players, savedPlayers, [key]: { ...t, playerIds: ids } };
          });
        } else {
          const patch: Partial<Player> = {
            ...(data.name !== undefined ? { name } : {}),
            ...(data.number !== undefined ? { number } : {}),
            ...buildPlayerPhotoPatch(s.players[playerId] ?? s.savedPlayers[playerId], data),
          };
          get().updatePlayer(playerId, patch);
        }
        get().applyFormations();
      },

      setCaptain: (team, slotIndex) => {
        const key = team === "home" ? "homeTeam" : "awayTeam";
        const t = get()[key];
        if (slotIndex === null) {
          set({ [key]: { ...t, captainId: undefined } });
          return;
        }
        const playerId = padPlayerIds(t.playerIds, get().squadSize)[slotIndex];
        if (!playerId || playerId === "") return;
        set({ [key]: { ...t, captainId: playerId } });
      },

      updatePlayer: (id, data) =>
        set((s) => {
          const updated = {
            ...(s.savedPlayers[id] ?? {}),
            ...s.players[id],
            ...data,
            id,
          } as Player;
          const players = { ...s.players, [id]: updated };
          const savedPlayers = { ...s.savedPlayers, [id]: updated };
          return { players, savedPlayers };
        }),

      applyCompressedPlayers: (players, savedPlayers, options) =>
        // Yalnızca "tarandı" işareti değiştiyse kullanıcı düzenlemesi sayılmaz
        // (zaman damgası/revision değişmez); fotoğraf küçüldüyse buluta gitmeli.
        options?.photosChanged
          ? set({ players, savedPlayers })
          : realSet({ players, savedPlayers }),

      movePitchPlayer: (team, slotIndex, x, y) => {
        trackEvent("player_repositioned", { team, slot_index: slotIndex });
        set((s) => {
          const key = s.teamMode === "single" ? "singlePitchPlayers" : "pitchPlayers";
          const current = s[key];
          const found = current.some(
            (pp) => pp.team === team && pp.slotIndex === slotIndex
          );
          const positions = found
            ? current.map((pp) =>
                pp.team === team && pp.slotIndex === slotIndex
                  ? { ...pp, x, y }
                  : pp
              )
            : [
                ...current,
                {
                  team,
                  slotIndex,
                  playerId: s[team === "home" ? "homeTeam" : "awayTeam"].playerIds[
                    slotIndex
                  ] ?? "",
                  x,
                  y,
                },
              ];
          return { [key]: positions };
        });
      },

      clearPitchPlayerPosition: (team, slotIndex) =>
        set((s) => {
          const key = s.teamMode === "single" ? "singlePitchPlayers" : "pitchPlayers";
          const positions = s[key].map((pp) =>
            pp.team === team && pp.slotIndex === slotIndex
              ? { ...pp, x: undefined, y: undefined }
              : pp
          );
          return { [key]: positions };
        }),

      resetPitchPositions: (team) =>
        set((s) => {
          const key = s.teamMode === "single" ? "singlePitchPlayers" : "pitchPlayers";
          const positions = s[key].map((pp) => {
            if (team && pp.team !== team) return pp;
            const { x: _, y: __, ...rest } = pp;
            return rest;
          });
          return { [key]: positions };
        }),

      applyFormations: (options) => {
        const s = get();
        const isSingle = s.teamMode === "single";
        const home = autoAssignLineup(
          s.homeTeam,
          s.homeFormationId,
          "home",
          s.players
        );
        const away = autoAssignLineup(
          s.awayTeam,
          s.awayFormationId,
          "away",
          s.players
        );

        const base = isSingle ? home : [...home, ...away];
        const currentPositions = isSingle
          ? s.singlePitchPlayers
          : s.pitchPlayers;

        const merged = base.map((pp) => {
          const shouldReset =
            (pp.team === "home" && options?.resetHome) ||
            (pp.team === "away" && options?.resetAway);
          if (shouldReset) return pp;

          const existing = currentPositions.find(
            (e) => e.team === pp.team && e.slotIndex === pp.slotIndex
          );
          if (existing?.x != null && existing?.y != null) {
            return { ...pp, x: existing.x, y: existing.y };
          }
          return pp;
        });

        // Aynı dizilim tekrar yazılırsa localUpdatedAt/revision artar ve
        // her açılışta gereksiz bir bulut kaydı tetiklenir.
        if (samePitchPlayers(currentPositions, merged)) return;

        // Dizilim, kadro/formasyondan türetilen veridir; kullanıcı düzenlemesi
        // sayılmaz. realSet: localUpdatedAt/revision değişmez. Aksi halde yeni
        // açılan boş kadro "buluttan daha yeni" görünüp girişte bulutu ezer.
        realSet(
          isSingle
            ? { singlePitchPlayers: merged }
            : { pitchPlayers: merged }
        );
      },

      resetGuestSession: () => {
        const s = get();
        const roster = buildDefaultRoster(s.squadSize);
        const homeTeam = { ...defaultHomeTeam, playerIds: roster.homePlayerIds };
        const awayTeam = { ...defaultAwayTeam, playerIds: roster.awayPlayerIds };
        // Yedek havuzu "kayıtlı ortak havuz" olduğu için korunur; saha oyuncuları yenilenir.
        const benchPlayers: Record<string, Player> = {};
        for (const id of s.benchPlayerIds) {
          const player = s.players[id] ?? s.savedPlayers[id];
          if (player) benchPlayers[id] = player;
        }
        const savedPlayers = { ...benchPlayers, ...roster.players };
        const benchPlayerIds = s.benchPlayerIds.filter((id) => benchPlayers[id]);
        const defaultFormationId = getDefaultFormationId(s.squadSize);
        set({
          homeTeam,
          awayTeam,
          savedPlayers,
          benchPlayerIds,
          formatOverflow: EMPTY_FORMAT_OVERFLOW,
          players: rebuildActivePlayers(
            savedPlayers,
            benchPlayerIds,
            homeTeam,
            awayTeam,
            s.squadSize
          ),
          homeFormationId: defaultFormationId,
          awayFormationId: defaultFormationId,
          pitchPlayers: [],
          singlePitchPlayers: [],
          teamLogoDisplaySize: DEFAULT_LOGO_DISPLAY_SIZE,
          matchInfo: normalizeMatchInfo({
            ...createDefaultMatchInfo(),
            titleStyleId: defaultTitleStyleForTheme(s.posterTheme),
          }),
        });
        get().applyFormations({ resetHome: true, resetAway: true });
      },

      setTeamLogoDisplaySize: (size) => {
        trackEvent("logo_display_size_changed", { size });
        set({ teamLogoDisplaySize: clampLogoDisplaySize(size) });
      },

      setPosterTheme: (theme) => {
        trackEvent("poster_theme_changed", { theme_id: theme });
        const posterTheme = normalizePosterTheme(theme);
        set((s) => ({
          posterTheme,
          matchInfo: normalizeMatchInfo({
            ...s.matchInfo,
            titleStyleId: defaultTitleStyleForTheme(posterTheme),
          }),
        }));
      },

      setLogoDesignerTeam: (team) => set({ logoDesignerTeam: team }),

      addPlayerToBench: (data) => {
        // Kota: yeni yedek oluşturma sınırı (sunucu kuralları ayrıca sınırlar).
        if (get().benchPlayerIds.length >= MAX_BENCH_PLAYERS) return "";
        trackEvent("bench_player_added");
        const playerId = crypto.randomUUID();
        const count = get().benchPlayerIds.length;
        const player: Player = {
          id: playerId,
          name: data.name?.trim() || `Yedek ${count + 1}`,
          number: data.number ?? count + 1,
        };
        set((s) => {
          const reg = registerPlayer(s.players, s.savedPlayers, player);
          return {
            ...reg,
            benchPlayerIds: [...s.benchPlayerIds, playerId],
          };
        });
        return playerId;
      },

      updateBenchPlayer: (playerId, data) => {
        const s = get();
        if (!s.benchPlayerIds.includes(playerId)) return;
        const existing = s.players[playerId] ?? s.savedPlayers[playerId];
        if (!existing) return;
        trackEvent("bench_player_edited");

        const patch: Partial<Player> = {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.number !== undefined ? { number: data.number } : {}),
          ...buildPlayerPhotoPatch(existing, data),
        };
        get().updatePlayer(playerId, patch);
      },

      removeFromBench: (playerId) => {
        if (!playerId) return;
        trackEvent("bench_player_removed");

        set((state) => {
          if (!state.benchPlayerIds.includes(playerId)) return state;

          const onField = collectLineupPlayerIds(
            state.homeTeam,
            state.awayTeam,
            state.squadSize
          ).has(playerId);

          let benchPlayerIds = state.benchPlayerIds.filter((id) => id !== playerId);
          benchPlayerIds = sanitizeBenchIds(
            benchPlayerIds,
            state.homeTeam,
            state.awayTeam,
            state.squadSize
          );

          const formatOverflow = pruneFormatOverflow(
            state.formatOverflow,
            benchPlayerIds
          );
          if (onField) {
            return { benchPlayerIds, formatOverflow };
          }

          const savedPlayers = { ...state.savedPlayers };
          delete savedPlayers[playerId];

          return {
            benchPlayerIds,
            formatOverflow,
            savedPlayers,
            players: rebuildActivePlayers(
              savedPlayers,
              benchPlayerIds,
              state.homeTeam,
              state.awayTeam,
              state.squadSize
            ),
          };
        });
      },

      assignBenchToSlot: (team, slotIndex, benchPlayerId) => {
        trackEvent("substitute_entered", { team, slot_index: slotIndex });
        set((state) => {
          if (!state.benchPlayerIds.includes(benchPlayerId)) return state;

          const key = team === "home" ? "homeTeam" : "awayTeam";
          const t = state[key];
          const ids = padPlayerIds(t.playerIds, state.squadSize);
          const outgoingId = ids[slotIndex] ?? "";

          if (outgoingId === benchPlayerId) return state;

          ids[slotIndex] = benchPlayerId;
          let benchPlayerIds = state.benchPlayerIds.filter(
            (id) => id !== benchPlayerId
          );
          // Yer tutucu ("Oyuncu 3") yedeği kirletmez; yalnızca özel oyuncular yedeğe iner.
          const outgoingIsCustom = isCustomizedPlayer(
            state.players[outgoingId] ?? state.savedPlayers[outgoingId]
          );
          if (outgoingId && outgoingId !== benchPlayerId && outgoingIsCustom) {
            if (!benchPlayerIds.includes(outgoingId)) {
              benchPlayerIds = [...benchPlayerIds, outgoingId];
            }
          }

          const updatedTeam = { ...t, playerIds: ids };
          const updatedHome =
            team === "home" ? updatedTeam : state.homeTeam;
          const updatedAway =
            team === "away" ? updatedTeam : state.awayTeam;

          benchPlayerIds = sanitizeBenchIds(
            benchPlayerIds,
            updatedHome,
            updatedAway,
            state.squadSize
          );

          const savedPlayers = { ...state.savedPlayers, ...state.players };

          const jerseyUpdates = resolveSameTeamJerseyConflicts({
            team: updatedTeam,
            squadSize: state.squadSize,
            registry: savedPlayers,
            incomingPlayerId: benchPlayerId,
            outgoingPlayerId: outgoingId || undefined,
          });
          for (const [id, player] of Object.entries(jerseyUpdates)) {
            savedPlayers[id] = player;
          }

          const wasCaptain = t.captainId === outgoingId;

          return {
            benchPlayerIds,
            formatOverflow: pruneFormatOverflow(state.formatOverflow, benchPlayerIds),
            savedPlayers,
            players: rebuildActivePlayers(
              savedPlayers,
              benchPlayerIds,
              updatedHome,
              updatedAway,
              state.squadSize
            ),
            [key]: {
              ...updatedTeam,
              captainId: wasCaptain ? benchPlayerId : t.captainId,
            },
          };
        });
        get().applyFormations();
      },

      moveSlotToBench: (team, slotIndex) => {
        const current = get();
        const key = team === "home" ? "homeTeam" : "awayTeam";
        const playerId = padPlayerIds(current[key].playerIds, current.squadSize)[
          slotIndex
        ];
        const player = playerId
          ? current.players[playerId] ?? current.savedPlayers[playerId]
          : undefined;
        // Yer tutucuyu yedeğe göndermek anlamsız: slot yine yer tutucuyla dolar.
        if (!playerId || !isCustomizedPlayer(player)) return;
        trackEvent("player_sent_to_bench", { team, slot_index: slotIndex });
        set((state) => {
          const ids = padPlayerIds(state[key].playerIds, state.squadSize);
          ids[slotIndex] = "";
          const savedPlayers = { ...state.savedPlayers };
          if (state.players[playerId]) savedPlayers[playerId] = state.players[playerId];
          const updatedTeam = {
            ...state[key],
            playerIds: ids,
            ...(state[key].captainId === playerId ? { captainId: undefined } : {}),
          };
          // Boşalan slot hemen yer tutucuyla dolar (çalışırken de kadro değişmezleri geçerli).
          const roster = normalizeRoster({
            squadSize: state.squadSize,
            homeTeam: team === "home" ? updatedTeam : state.homeTeam,
            awayTeam: team === "away" ? updatedTeam : state.awayTeam,
            savedPlayers,
            benchPlayerIds: state.benchPlayerIds.includes(playerId)
              ? state.benchPlayerIds
              : [...state.benchPlayerIds, playerId],
            formatOverflow: state.formatOverflow,
          });
          return roster;
        });
        get().applyFormations();
      },

      swapPlayers: (team1, slotIndex1, team2, slotIndex2) => {
        trackEvent("players_swapped", {
          team_a: team1,
          team_b: team2,
          cross_team: team1 !== team2,
        });
        set((state) => {
          if (team1 === team2 && slotIndex1 === slotIndex2) return {};

          const team1Key = team1 === "home" ? "homeTeam" : "awayTeam";
          const team2Key = team2 === "home" ? "homeTeam" : "awayTeam";

          const t1 = { ...state[team1Key] };
          const t2 = team1 === team2 ? t1 : { ...state[team2Key] };

          const ids1 = [...padPlayerIds(t1.playerIds, state.squadSize)];
          const ids2 =
            team1 === team2
              ? ids1
              : [...padPlayerIds(t2.playerIds, state.squadSize)];

          const id1 = ids1[slotIndex1];
          const id2 = ids2[slotIndex2];

          if (team1 === team2) {
            ids1[slotIndex1] = id2;
            ids1[slotIndex2] = id1;
            t1.playerIds = ids1;
          } else {
            ids1[slotIndex1] = id2;
            ids2[slotIndex2] = id1;
            t1.playerIds = ids1;
            t2.playerIds = ids2;
          }

          // Handle captaincy swap
          const hCaptain = state.homeTeam.captainId;
          const aCaptain = state.awayTeam.captainId;
          let newHomeCaptain = hCaptain;
          let newAwayCaptain = aCaptain;

          if (team1 !== team2) {
            if (hCaptain === id1) {
              newHomeCaptain = id2 || undefined;
            } else if (hCaptain === id2) {
              newHomeCaptain = id1 || undefined;
            }
            if (aCaptain === id1) {
              newAwayCaptain = id2 || undefined;
            } else if (aCaptain === id2) {
              newAwayCaptain = id1 || undefined;
            }
          }

          const playersRegistry = { ...state.players };
          const savedPlayersRegistry = { ...state.savedPlayers };

          const collectTeamNumbersExcluding = (
            teamConfig: TeamConfig,
            excludeId: string
          ): Set<number> => {
            const numbers = new Set<number>();
            for (let i = 0; i < state.squadSize; i++) {
              const id = teamConfig.playerIds[i] ?? "";
              if (!id || id === excludeId) continue;
              const p = playersRegistry[id];
              if (p?.number != null) numbers.add(p.number);
            }
            return numbers;
          };

          // If different teams, resolve jersey conflicts
          if (team1 !== team2) {
            // Player 1 moving to team2
            if (id1) {
              const p1 = playersRegistry[id1];
              if (p1) {
                const usedInTeam2 = collectTeamNumbersExcluding(t2, id1);
                if (usedInTeam2.has(p1.number)) {
                  const nextNum = resolveJerseyNumber(p1.number, usedInTeam2);
                  const updatedP1 = { ...p1, number: nextNum };
                  playersRegistry[id1] = updatedP1;
                  savedPlayersRegistry[id1] = updatedP1;
                }
              }
            }

            // Player 2 moving to team1
            if (id2) {
              const p2 = playersRegistry[id2];
              if (p2) {
                const usedInTeam1 = collectTeamNumbersExcluding(t1, id2);
                if (usedInTeam1.has(p2.number)) {
                  const nextNum = resolveJerseyNumber(p2.number, usedInTeam1);
                  const updatedP2 = { ...p2, number: nextNum };
                  playersRegistry[id2] = updatedP2;
                  savedPlayersRegistry[id2] = updatedP2;
                }
              }
            }
          }

          const finalHomeTeam = {
            ...state.homeTeam,
            ...(team1 === "home" ? { playerIds: t1.playerIds } : {}),
            ...(team2 === "home" ? { playerIds: t2.playerIds } : {}),
            captainId: newHomeCaptain,
          };

          const finalAwayTeam = {
            ...state.awayTeam,
            ...(team1 === "away" ? { playerIds: t1.playerIds } : {}),
            ...(team2 === "away" ? { playerIds: t2.playerIds } : {}),
            captainId: newAwayCaptain,
          };

          return {
            homeTeam: finalHomeTeam,
            awayTeam: finalAwayTeam,
            players: playersRegistry,
            savedPlayers: savedPlayersRegistry,
          };
        });

        get().applyFormations();
      },
    }},
    {
      name: "halisaha-kadro",
      version: 34,
      storage: createJSONStorage(() => guardedStorage),
      migrate: (persisted: unknown, version: number): AppStore => {
        migratedDuringHydration = true;
        let state = persisted as Record<string, unknown>;
        if (version < 2) {
          const home = withLogo(state.homeTeam as TeamConfig);
          const away = withLogo(state.awayTeam as TeamConfig);
          state = { ...state, homeTeam: home, awayTeam: away };
        }
        if (version < 3) {
          const home = state.homeTeam as TeamConfig;
          const away = state.awayTeam as TeamConfig;
          state = {
            ...state,
            homeTeam: {
              ...home,
              jersey: defaultHomeTeam.jersey,
              atmosphereColor: defaultHomeTeam.atmosphereColor,
              playerIds: padPlayerIds(home.playerIds, (state.squadSize as number) || 7),
            },
            awayTeam: {
              ...away,
              jersey: defaultAwayTeam.jersey,
              atmosphereColor: defaultAwayTeam.atmosphereColor,
              playerIds: padPlayerIds(away.playerIds, (state.squadSize as number) || 7),
            },
          };
        }
        if (version < 4) {
          state = { ...state, playerCardSize: 72 };
        }
        if (version < 5) {
          const current = (state.playerCardSize as number) || 72;
          state = {
            ...state,
            playerCardSize: Math.min(130, Math.round(current * 1.19)),
          };
        }
        if (version < 6) {
          const size = (state.playerCardSize as number) || 150;
          state = {
            ...state,
            playerCardSize: Math.max(80, Math.min(200, size)),
          };
        }
        if (version < 7) {
          state = {
            ...state,
            posterTheme: DEFAULT_POSTER_THEME,
          };
        }
        if (version < 8) {
          const migrateTeamLogo = (team: TeamConfig) => ({
            ...team,
            logo: normalizeTeamLogo(team.logo, team.shortName),
          });
          state = {
            ...state,
            homeTeam: migrateTeamLogo(state.homeTeam as TeamConfig),
            awayTeam: migrateTeamLogo(state.awayTeam as TeamConfig),
          };
        }
        if (version < 9) {
          const migrateTeamLogo = (team: TeamConfig) => ({
            ...team,
            logo: normalizeTeamLogo(team.logo, team.shortName),
          });
          state = {
            ...state,
            homeTeam: migrateTeamLogo(state.homeTeam as TeamConfig),
            awayTeam: migrateTeamLogo(state.awayTeam as TeamConfig),
          };
        }
        if (version < 10) {
          const home = state.homeTeam as TeamConfig;
          const logoSize =
            home?.logo?.displaySize ??
            (state.teamLogoDisplaySize as number | undefined) ??
            DEFAULT_LOGO_DISPLAY_SIZE;
          state = {
            ...state,
            teamLogoDisplaySize: clampLogoDisplaySize(logoSize),
          };
        }
        if (version < 11) {
          const size = (state.playerCardSize as number) || 150;
          state = {
            ...state,
            playerCardSize: Math.max(
              MIN_PLAYER_CARD_SIZE,
              Math.min(MAX_PLAYER_CARD_SIZE, size)
            ),
          };
        }
        if (version < 12) {
          const pps = (state.pitchPlayers as PitchPlayer[]) || [];
          state = {
            ...state,
            pitchPlayers: pps.map((pp) => ({ ...pp, x: undefined, y: undefined })),
          };
        }
        if (version < 13) {
          const squadSize = (state.squadSize as SquadSize) || 7;
          const players = (state.players as Record<string, Player>) || {};
          const home = state.homeTeam as TeamConfig;
          const away = state.awayTeam as TeamConfig;
          const homeFilled = fillEmptyRosterSlots(
            squadSize,
            padPlayerIds(home.playerIds, squadSize),
            players
          );
          const awayFilled = fillEmptyRosterSlots(
            squadSize,
            padPlayerIds(away.playerIds, squadSize),
            homeFilled.players
          );
          state = {
            ...state,
            players: awayFilled.players,
            homeTeam: {
              ...defaultHomeTeam,
              ...home,
              playerIds: awayFilled.playerIds,
              jersey: defaultHomeTeam.jersey,
              logo: normalizeTeamLogo(
                { ...defaultHomeTeam.logo, presetId: DEFAULT_HOME_PRESET_ID },
                home.shortName ?? defaultHomeTeam.shortName
              ),
            },
            awayTeam: {
              ...defaultAwayTeam,
              ...away,
              playerIds: awayFilled.playerIds,
              jersey: defaultAwayTeam.jersey,
              logo: normalizeTeamLogo(
                { ...defaultAwayTeam.logo, presetId: DEFAULT_AWAY_PRESET_ID },
                away.shortName ?? defaultAwayTeam.shortName
              ),
            },
          };
        }
        if (version < 14) {
          const pps = (state.pitchPlayers as PitchPlayer[]) || [];
          state = {
            ...state,
            pitchPlayers: pps.map((pp) => ({ ...pp, x: undefined, y: undefined })),
          };
        }
        if (version < 15) {
          const pps = (state.pitchPlayers as PitchPlayer[]) || [];
          state = {
            ...state,
            pitchPlayers: pps.map((pp) => ({ ...pp, x: undefined, y: undefined })),
          };
        }
        if (version < 16) {
          const pps = (state.pitchPlayers as PitchPlayer[]) || [];
          state = {
            ...state,
            pitchPlayers: pps.map((pp) => ({ ...pp, x: undefined, y: undefined })),
          };
        }
        if (version < 17) {
          const pps = (state.pitchPlayers as PitchPlayer[]) || [];
          state = {
            ...state,
            pitchPlayers: pps.map((pp) => ({ ...pp, x: undefined, y: undefined })),
          };
        }
        if (version < 18) {
          const pps = (state.pitchPlayers as PitchPlayer[]) || [];
          state = {
            ...state,
            pitchPlayers: pps.map((pp) => ({ ...pp, x: undefined, y: undefined })),
          };
        }
        if (version < 19) {
          const pps = (state.pitchPlayers as PitchPlayer[]) || [];
          state = {
            ...state,
            pitchPlayers: pps.map((pp) => ({ ...pp, x: undefined, y: undefined })),
          };
        }
        if (version < 20) {
          const info = (state.matchInfo as MatchInfo) || createDefaultMatchInfo();
          const date = info.date;
          if (!date || date === "18/06/2026") {
            state = {
              ...state,
              matchInfo: { ...info, date: todayDisplayDate() },
            };
          }
        }
        if (version < 21) {
          state = { ...state, benchPlayerIds: [] };
        }
        if (version < 22) {
          const squadSize = (state.squadSize as SquadSize) || 7;
          const savedPlayers = {
            ...((state.savedPlayers as Record<string, Player>) || {}),
          };
          const fixLineupNames = (playerIds: string[]) => {
            padPlayerIds(playerIds, squadSize).forEach((id, index) => {
              if (!id) return;
              const existing = savedPlayers[id];
              if (existing?.name?.trim()) return;
              savedPlayers[id] = {
                ...(existing || { id, number: index + 1 }),
                id,
                name: `Oyuncu ${index + 1}`,
                number: existing?.number ?? index + 1,
              };
            });
          };
          fixLineupNames((state.homeTeam as TeamConfig)?.playerIds ?? []);
          fixLineupNames((state.awayTeam as TeamConfig)?.playerIds ?? []);
          state = { ...state, savedPlayers };
        }
        if (version < 23) {
          state = {
            ...state,
            posterTheme: normalizePosterTheme(state.posterTheme),
          };
        }
        if (version < 24) {
          const info = (state.matchInfo as MatchInfo) || createDefaultMatchInfo();
          state = {
            ...state,
            matchInfo: normalizeMatchInfo(info),
          };
        }
        if (version < 25) {
          const info = (state.matchInfo as MatchInfo) || createDefaultMatchInfo();
          state = {
            ...state,
            matchInfo: normalizeMatchInfo(info),
          };
        }
        if (version < 26) {
          state = {
            ...state,
            posterTheme: normalizePosterTheme(state.posterTheme),
          };
        }
        if (version < 27) {
          // Branding bulut alanı eklendi; mevcut logo/forma verisi korunur.
        }
        if (version < 28) {
          state = {
            ...state,
            syncRevisions: { ...DEFAULT_SYNC_REVISIONS },
          };
          const squadSize = (state.squadSize as SquadSize) || 7;
          const homeTeam = state.homeTeam as TeamConfig;
          const awayTeam = state.awayTeam as TeamConfig;
          const benchPlayerIds = (state.benchPlayerIds as string[]) || [];
          const savedPlayers = (state.savedPlayers as Record<string, Player>) || {};
          const players = (state.players as Record<string, Player>) || {};
          const pruned = buildPersistedPlayerRegistry(
            players,
            savedPlayers,
            benchPlayerIds,
            homeTeam,
            awayTeam,
            squadSize
          );
          state = {
            ...state,
            savedPlayers: pruned,
            players: rebuildActivePlayers(
              pruned,
              benchPlayerIds,
              homeTeam,
              awayTeam,
              squadSize
            ),
          };
        }
        if (version < 29) {
          const savedPlayers = (state.savedPlayers as Record<string, Player>) || {};
          const updatedSaved: Record<string, Player> = {};
          for (const [id, p] of Object.entries(savedPlayers)) {
            updatedSaved[id] = { ...p, didCompress: false };
          }
          const players = (state.players as Record<string, Player>) || {};
          const updatedPlayers: Record<string, Player> = {};
          for (const [id, p] of Object.entries(players)) {
            updatedPlayers[id] = { ...p, didCompress: false };
          }
          state = {
            ...state,
            savedPlayers: updatedSaved,
            players: updatedPlayers,
          };
        }
        if (version < 30) {
          state = {
            ...state,
            teamMode: state.teamMode === "single" ? "single" : "versus",
          };
        }
        if (version < 31) {
          state = {
            ...state,
            singlePitchPlayers: [],
          };
        }
        if (version < 32) {
          // Eski/çakışan diziliş ID'leri yeni geçerli sete resetlenir.
          const squadSize = ((state.squadSize as SquadSize) || 7) as SquadSize;
          const defaultId = getDefaultFormationId(squadSize);
          const homeFormationId = (state.homeFormationId as string) || "";
          const awayFormationId = (state.awayFormationId as string) || "";
          const normalizedHome = getFormationById(homeFormationId)?.squadSize === squadSize
            ? homeFormationId
            : defaultId;
          const normalizedAway = getFormationById(awayFormationId)?.squadSize === squadSize
            ? awayFormationId
            : defaultId;
          state = {
            ...state,
            homeFormationId: normalizedHome,
            awayFormationId: normalizedAway,
            pitchPlayers: [],
            singlePitchPlayers: [],
          };
        }
        if (version < 33) {
          // photoScalePercent kaldırıldı; eski default saha adı güncelleniyor.
          const { photoScalePercent, ...rest } = state;
          void photoScalePercent;
          const info = (rest.matchInfo as MatchInfo) || createDefaultMatchInfo();
          const oldVenue = "DEMİR TEKLİ HALISAHA";
          state = {
            ...rest,
            matchInfo: {
              ...info,
              venue: info.venue === oldVenue ? "HALI SAHA" : info.venue,
            },
          };
        }
        if (version < 34) {
          // formatOverflow eklendi (format küçülünce yedeğe inen oyuncular).
          state = { ...state, formatOverflow: EMPTY_FORMAT_OVERFLOW };
        }
        return state as unknown as AppStore;
      },
      merge: (persisted: unknown, current: AppStore): AppStore => {
        const saved = persisted as Partial<PosterSnapshot> & {
          syncRevisions?: SyncRevisions;
        };
        return {
          ...current,
          ...mergePosterSnapshot(current, saved),
          syncRevisions: saved.syncRevisions ?? current.syncRevisions,
        } as AppStore;
      },
      partialize: (s: AppStore): Partial<AppStore> => ({
        ...buildPosterSnapshot(s),
        syncRevisions: s.syncRevisions,
      }),
      onRehydrateStorage: () => {
        // Hem ilk yüklemede hem sekmeler arası rehydrate'te okuma bitene kadar yazma yok.
        persistWritesEnabled = false;
        return (state: AppStore | undefined, error: unknown) => {
        persistWritesEnabled = true;
        if (migratedDuringHydration) {
          migratedDuringHydration = false;
          // Kilit açıkken göç etmiş veriyi bir kez diske yaz.
          queueMicrotask(() => useAppStore.setState({}));
        }
        markAppStoreHydrated();
        if (error || !state) return;
        const finalized = finalizePosterSnapshot({
          teamMode: state.teamMode ?? "versus",
          mode: state.mode,
          players: state.players,
          savedPlayers: state.savedPlayers ?? {},
          benchPlayerIds: state.benchPlayerIds ?? [],
          formatOverflow: state.formatOverflow ?? EMPTY_FORMAT_OVERFLOW,
          matchInfo: state.matchInfo,
          squadSize: state.squadSize,
          homeTeam: state.homeTeam,
          awayTeam: state.awayTeam,
          homeFormationId: state.homeFormationId,
          awayFormationId: state.awayFormationId,
          pitchPlayers: state.pitchPlayers ?? [],
          singlePitchPlayers: state.singlePitchPlayers ?? [],
          playerCardSize: state.playerCardSize,
          teamLogoDisplaySize: state.teamLogoDisplaySize,
          posterTheme: state.posterTheme,
          localUpdatedAt: state.localUpdatedAt,
        });
        Object.assign(state, finalized);
        };
      },
    } as PersistOptions<AppStore>
  )
);
