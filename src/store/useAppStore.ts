"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getFormationById, getFormationsForSize } from "@/lib/formations";
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
} from "@/lib/playerPool";
import { resolveSameTeamJerseyConflicts } from "@/lib/teamJerseyNumbers";
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

let appStoreHydrated = false;
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

interface AppStore {
  mode: AppMode;
  matchInfo: MatchInfo;
  squadSize: SquadSize;
  homeTeam: TeamConfig;
  awayTeam: TeamConfig;
  players: Record<string, Player>;
  savedPlayers: Record<string, Player>;
  benchPlayerIds: string[];
  homeFormationId: string;
  awayFormationId: string;
  pitchPlayers: PitchPlayer[];
  playerCardSize: number;
  photoScalePercent: number;
  teamLogoDisplaySize: number;
  posterTheme: PosterThemeId;
  logoDesignerTeam: "home" | "away" | null;
  remoteHydrating: boolean;
  localUpdatedAt?: string;
  syncRevisions: SyncRevisions;

  setRemoteHydrating: (value: boolean) => void;
  getPosterSnapshot: () => PosterSnapshot;
  hydrateFromSnapshot: (snapshot: PosterSnapshot, updatedAt?: string) => void;
  setMode: (mode: AppMode) => void;
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
  clearSlot: (team: "home" | "away", slotIndex: number) => void;
  setCaptain: (team: "home" | "away", slotIndex: number | null) => void;
  updatePlayer: (id: string, data: Partial<Player>) => void;
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
  setPlayerCardSize: (size: number) => void;
  setPhotoScalePercent: (percent: number) => void;
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
  activeDrag: { team: "home" | "away"; slotIndex: number; x: number; y: number } | null;
  activeSwapTarget: { team: "home" | "away"; slotIndex: number } | null;
  setActiveDrag: (
    drag: { team: "home" | "away"; slotIndex: number; x: number; y: number } | null
  ) => void;
  setActiveSwapTarget: (
    target: { team: "home" | "away"; slotIndex: number } | null
  ) => void;
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

const initialFormations = getFormationsForSize(7);
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
          "homeFormationId",
          "awayFormationId",
          "pitchPlayers",
          "playerCardSize",
          "photoScalePercent",
          "teamLogoDisplaySize",
          "posterTheme",
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
        mode: "guest",
        matchInfo: createDefaultMatchInfo(),
        squadSize: 7,
        homeTeam: { ...defaultHomeTeam, playerIds: initialRoster.homePlayerIds },
        awayTeam: { ...defaultAwayTeam, playerIds: initialRoster.awayPlayerIds },
        players: initialRoster.players,
        savedPlayers: initialRoster.players,
        benchPlayerIds: [],
        homeFormationId: initialFormations[0]?.id ?? "7-1-3-2",
        awayFormationId: initialFormations[0]?.id ?? "7-1-3-2",
        pitchPlayers: [],
        playerCardSize: 100,
        photoScalePercent: 100,
        teamLogoDisplaySize: DEFAULT_LOGO_DISPLAY_SIZE,
        posterTheme: DEFAULT_POSTER_THEME,
        logoDesignerTeam: null,
        remoteHydrating: false,
        activeDrag: null,
        activeSwapTarget: null,
        localUpdatedAt: undefined,
        syncRevisions: { ...DEFAULT_SYNC_REVISIONS },

      setRemoteHydrating: (value) => set({ remoteHydrating: value }),

      getPosterSnapshot: () => buildPosterSnapshot(get()),

      hydrateFromSnapshot: (snapshot, updatedAt) => {
        const parsed = parsePosterSnapshot(snapshot);
        if (!parsed) return;
        const current = get();
        const finalized = finalizePosterSnapshot(
          mergePosterSnapshot(current, parsed, {
            remoteDocUpdatedAt: updatedAt,
          })
        );
        const resolvedUpdatedAt = maxIsoTimestamp(
          current.localUpdatedAt,
          parsed.localUpdatedAt,
          updatedAt
        );
        realSet(
          {
            mode: finalized.mode,
            matchInfo: finalized.matchInfo,
            squadSize: finalized.squadSize,
            homeTeam: finalized.homeTeam,
            awayTeam: finalized.awayTeam,
            players: finalized.players,
            savedPlayers: finalized.savedPlayers,
            benchPlayerIds: finalized.benchPlayerIds,
            homeFormationId: finalized.homeFormationId,
            awayFormationId: finalized.awayFormationId,
            pitchPlayers: finalized.pitchPlayers,
            playerCardSize: finalized.playerCardSize,
            photoScalePercent: finalized.photoScalePercent,
            teamLogoDisplaySize: finalized.teamLogoDisplaySize,
            posterTheme: finalized.posterTheme,
            logoDesignerTeam: null,
            localUpdatedAt: resolvedUpdatedAt,
          },
          false
        );
      },

      setMode: (mode) => {
        set((s) => ({
          mode,
          players: rebuildActivePlayers(
            s.savedPlayers,
            s.benchPlayerIds,
            s.homeTeam,
            s.awayTeam,
            s.squadSize
          ),
        }));
      },

      setMatchInfo: (info) =>
        set((s) => ({
          matchInfo: normalizeMatchInfo({ ...s.matchInfo, ...info }),
        })),

      setSquadSize: (size) => {
        const formations = getFormationsForSize(size);
        const formationId = formations[0]?.id ?? "";
        set((s) => {
          const homeFilled = fillEmptyRosterSlots(
            size,
            padPlayerIds(s.homeTeam.playerIds, size),
            s.savedPlayers
          );
          const awayFilled = fillEmptyRosterSlots(
            size,
            padPlayerIds(s.awayTeam.playerIds, size),
            { ...s.savedPlayers, ...homeFilled.players }
          );
          const savedPlayers = {
            ...s.savedPlayers,
            ...homeFilled.players,
            ...awayFilled.players,
          };
          const homeTeam = { ...s.homeTeam, playerIds: homeFilled.playerIds };
          const awayTeam = { ...s.awayTeam, playerIds: awayFilled.playerIds };
          const benchPlayerIds = sanitizeBenchIds(
            s.benchPlayerIds,
            homeTeam,
            awayTeam,
            size
          );

          return {
            squadSize: size,
            homeFormationId: formationId,
            awayFormationId: formationId,
            savedPlayers,
            benchPlayerIds,
            homeTeam,
            awayTeam,
            players: rebuildActivePlayers(
              savedPlayers,
              benchPlayerIds,
              homeTeam,
              awayTeam,
              size
            ),
          };
        });
        get().applyFormations({ resetHome: true, resetAway: true });
      },

      setHomeFormation: (id) => {
        set({ homeFormationId: id });
        get().applyFormations({ resetHome: true });
      },

      setAwayFormation: (id) => {
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
            number: data.number ?? slotIndex + 1,
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
            ...(data.number !== undefined ? { number: data.number } : {}),
          };
          if (data.clearPhoto) {
            patch.avatarUrl = undefined;
            patch.photoSource = undefined;
            patch.photoCrop = undefined;
            patch.cutoutUrl = undefined;
            patch.photoUrl = undefined;
          } else {
            if (data.photoSource !== undefined) patch.photoSource = data.photoSource;
            if (data.cutoutUrl !== undefined) patch.cutoutUrl = data.cutoutUrl;
            if (data.photoCrop !== undefined) patch.photoCrop = data.photoCrop;
          }
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

      clearSlot: (team, slotIndex) => {
        const s = get();
        const key = team === "home" ? "homeTeam" : "awayTeam";
        const otherKey = team === "home" ? "awayTeam" : "homeTeam";
        const ids = padPlayerIds(s[key].playerIds, s.squadSize);
        const playerId = ids[slotIndex];
        if (!playerId) return;

        ids[slotIndex] = "";
        const wasCaptain = s[key].captainId === playerId;
        const usedElsewhere =
          padPlayerIds(s[otherKey].playerIds, s.squadSize).includes(playerId) ||
          ids.some((id) => id === playerId);

        set((state) => {
          const players = { ...state.players };
          const onBench = state.benchPlayerIds.includes(playerId);
          if (!usedElsewhere && !onBench) {
            delete players[playerId];
          }
          return {
            players,
            [key]: {
              ...s[key],
              playerIds: ids,
              ...(wasCaptain ? { captainId: undefined } : {}),
            },
          };
        });
        get().applyFormations();
      },

      updatePlayer: (id, data) =>
        set((s) => {
          const updated = { ...s.players[id], ...data };
          const players = { ...s.players, [id]: updated };
          const savedPlayers = { ...s.savedPlayers, [id]: updated };
          return { players, savedPlayers };
        }),

      movePitchPlayer: (team, slotIndex, x, y) =>
        set((s) => ({
          pitchPlayers: s.pitchPlayers.map((pp) =>
            pp.team === team && pp.slotIndex === slotIndex
              ? { ...pp, x, y }
              : pp
          ),
        })),

      clearPitchPlayerPosition: (team, slotIndex) =>
        set((s) => ({
          pitchPlayers: s.pitchPlayers.map((pp) =>
            pp.team === team && pp.slotIndex === slotIndex
              ? { ...pp, x: undefined, y: undefined }
              : pp
          ),
        })),

      resetPitchPositions: (team) =>
        set((s) => ({
          pitchPlayers: s.pitchPlayers.map((pp) => {
            if (team && pp.team !== team) return pp;
            const { x: _, y: __, ...rest } = pp;
            return rest;
          }),
        })),

      applyFormations: (options) => {
        const s = get();
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
        const merged = [...home, ...away].map((pp) => {
          const shouldReset =
            (pp.team === "home" && options?.resetHome) ||
            (pp.team === "away" && options?.resetAway);
          if (shouldReset) return pp;

          const existing = s.pitchPlayers.find(
            (e) => e.team === pp.team && e.slotIndex === pp.slotIndex
          );
          if (existing?.x != null && existing?.y != null) {
            return { ...pp, x: existing.x, y: existing.y };
          }
          return pp;
        });
        set({ pitchPlayers: merged });
      },

      resetGuestSession: () => {
        const s = get();
        const roster = buildDefaultRoster(s.squadSize);
        const homeTeam = { ...defaultHomeTeam, playerIds: roster.homePlayerIds };
        const awayTeam = { ...defaultAwayTeam, playerIds: roster.awayPlayerIds };
        set({
          homeTeam,
          awayTeam,
          pitchPlayers: [],
          matchInfo: createDefaultMatchInfo(),
          players: rebuildActivePlayers(
            s.savedPlayers,
            s.benchPlayerIds,
            homeTeam,
            awayTeam,
            s.squadSize
          ),
        });
        get().applyFormations({ resetHome: true, resetAway: true });
      },

      setPlayerCardSize: (size) =>
        set({
          playerCardSize: Math.max(
            MIN_PLAYER_CARD_SIZE,
            Math.min(MAX_PLAYER_CARD_SIZE, Math.round(size))
          ),
        }),

      setPhotoScalePercent: (percent) =>
        set({
          photoScalePercent: Math.max(60, Math.min(120, Math.round(percent))),
        }),

      setTeamLogoDisplaySize: (size) =>
        set({ teamLogoDisplaySize: clampLogoDisplaySize(size) }),

      setPosterTheme: (theme) => {
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

        const patch: Partial<Player> = {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.number !== undefined ? { number: data.number } : {}),
        };
        if (data.clearPhoto) {
          patch.avatarUrl = undefined;
          patch.photoSource = undefined;
          patch.photoCrop = undefined;
          patch.cutoutUrl = undefined;
          patch.photoUrl = undefined;
        } else {
          if (data.photoSource !== undefined) patch.photoSource = data.photoSource;
          if (data.cutoutUrl !== undefined) patch.cutoutUrl = data.cutoutUrl;
          if (data.photoCrop !== undefined) patch.photoCrop = data.photoCrop;
        }
        get().updatePlayer(playerId, patch);
      },

      removeFromBench: (playerId) => {
        if (!playerId) return;

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

          if (onField) {
            return { benchPlayerIds };
          }

          const savedPlayers = { ...state.savedPlayers };
          delete savedPlayers[playerId];

          return {
            benchPlayerIds,
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
          if (outgoingId && outgoingId !== benchPlayerId) {
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
        set((state) => {
          const key = team === "home" ? "homeTeam" : "awayTeam";
          const t = state[key];
          const ids = padPlayerIds(t.playerIds, state.squadSize);
          const playerId = ids[slotIndex];
          if (!playerId) return state;

          ids[slotIndex] = "";
          let benchPlayerIds = state.benchPlayerIds;
          if (!benchPlayerIds.includes(playerId)) {
            benchPlayerIds = [...benchPlayerIds, playerId];
          }

          const updatedTeam = {
            ...t,
            playerIds: ids,
            ...(t.captainId === playerId ? { captainId: undefined } : {}),
          };
          const updatedHome =
            team === "home" ? updatedTeam : state.homeTeam;
          const updatedAway =
            team === "away" ? updatedTeam : state.awayTeam;

          const sanitizedBench = sanitizeBenchIds(
            benchPlayerIds,
            updatedHome,
            updatedAway,
            state.squadSize
          );

          const savedPlayers = { ...state.savedPlayers };
          if (state.players[playerId]) {
            savedPlayers[playerId] = state.players[playerId];
          }

          return {
            benchPlayerIds: sanitizedBench,
            savedPlayers,
            players: rebuildActivePlayers(
              savedPlayers,
              sanitizedBench,
              updatedHome,
              updatedAway,
              state.squadSize
            ),
            [key]: updatedTeam,
          };
        });
        get().applyFormations();
      },

      setActiveDrag: (drag) => set({ activeDrag: drag }),

      setActiveSwapTarget: (target) => set({ activeSwapTarget: target }),

      swapPlayers: (team1, slotIndex1, team2, slotIndex2) => {
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

          // Jersey number conflict resolution helper
          const getNextFreeNumber = (startNum: number, usedNumbers: Set<number>): number => {
            let num = startNum;
            let checked = 0;
            while (usedNumbers.has(num) && checked < 100) {
              num = num + 1;
              if (num > 99) num = 1;
              checked++;
            }
            return num;
          };

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
                  const nextNum = getNextFreeNumber(p1.number + 1, usedInTeam2);
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
                  const nextNum = getNextFreeNumber(p2.number + 1, usedInTeam1);
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
            activeDrag: null,
            activeSwapTarget: null,
          };
        });

        get().applyFormations();
      },
    }},
    {
      name: "halisaha-kadro",
      version: 29,
      migrate: (persisted, version) => {
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
            photoScalePercent: 100,
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
        return state;
      },
      merge: (persisted, current) => {
        const saved = persisted as Partial<PosterSnapshot> & {
          syncRevisions?: SyncRevisions;
        };
        return {
          ...current,
          ...mergePosterSnapshot(current, saved),
          syncRevisions: saved.syncRevisions ?? current.syncRevisions,
        };
      },
      partialize: (s) => ({
        ...buildPosterSnapshot(s),
        syncRevisions: s.syncRevisions,
      }),
      onRehydrateStorage: () => (state, error) => {
        markAppStoreHydrated();
        if (error || !state) return;
        const finalized = finalizePosterSnapshot({
          mode: state.mode,
          players: state.players,
          savedPlayers: state.savedPlayers ?? {},
          benchPlayerIds: state.benchPlayerIds ?? [],
          matchInfo: state.matchInfo,
          squadSize: state.squadSize,
          homeTeam: state.homeTeam,
          awayTeam: state.awayTeam,
          homeFormationId: state.homeFormationId,
          awayFormationId: state.awayFormationId,
          pitchPlayers: state.pitchPlayers ?? [],
          playerCardSize: state.playerCardSize,
          photoScalePercent: state.photoScalePercent,
          teamLogoDisplaySize: state.teamLogoDisplaySize,
          posterTheme: state.posterTheme,
          localUpdatedAt: state.localUpdatedAt,
        });
        Object.assign(state, finalized);
      },
    }
  )
);
