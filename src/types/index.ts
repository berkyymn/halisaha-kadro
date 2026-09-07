export type SquadSize = 6 | 7 | 8;

export interface PosterMetrics {
  width: number;
  height: number;
}

export type JerseyStyle =
  | "solid"
  | "vertical_stripes"
  | "wide_vertical_stripes"
  | "horizontal_stripes"
  | "split"
  | "sash";

export type AppMode = "guest" | "saved";

import type { PosterThemeId } from "@/lib/posterThemes";
export type { PosterThemeId };

export interface JerseyConfig {
  style: JerseyStyle;
  primaryColor: string;
  secondaryColor: string;
  numberColor: string;
}

export interface PhotoCrop {
  scale: number;
  panX: number;
  panY: number;
}

export interface Player {
  id: string;
  name: string;
  number: number;
  /** İşlenmiş yuvarlak avatar (forma halkası dahil) */
  avatarUrl?: string;
  /** Orijinal fotoğraf — yeniden düzenlemek için */
  photoSource?: string;
  photoCrop?: PhotoCrop;
  /** @deprecated eski kayıtlar */
  photoUrl?: string;
  cutoutUrl?: string;
  /** Firebase Storage yolu — bulutta data URL yerine */
  cutoutStoragePath?: string;
  photoSourceStoragePath?: string;
  /** Sıkıştırma migrate edildi mi */
  didCompress?: boolean;
}

export interface TeamConfig {
  name: string;
  shortName: string;
  jersey: JerseyConfig;
  atmosphereColor: string;
  logo: TeamLogo;
  captainId?: string;
  playerIds: string[];
}

export type LogoShape =
  | "circle"
  | "shield"
  | "roundedShield"
  | "hexagon"
  | "pentagon"
  | "diamond"
  | "crest"
  | "esports";

export type LogoBorderStyle =
  | "single"
  | "double"
  | "triple"
  | "chrome"
  | "gold"
  | "neon";

export type LogoBackgroundStyle =
  | "solid"
  | "gradient"
  | "split"
  | "radial"
  | "verticalStripes"
  | "horizontalStripes";

export type LogoIcon =
  | "none"
  | "eagle"
  | "lion"
  | "wolf"
  | "crown"
  | "shield"
  | "star"
  | "flame"
  | "lightning"
  | "ball"
  | "trophy"
  /** @deprecated mapped on load */
  | "tiger"
  | "bear"
  | "bull"
  | "dragon"
  | "phoenix"
  | "shark"
  | "panther"
  | "falcon"
  | "sword"
  | "skull"
  | "spartan"
  | "wings"
  | "claw"
  | "mountain"
  | "anchor"
  /** @deprecated use ball */
  | "football";

export const DEFAULT_LOGO_DISPLAY_SIZE = 150;
export const MIN_LOGO_DISPLAY_SIZE = 60;
export const MAX_LOGO_DISPLAY_SIZE = 220;

export const MIN_PLAYER_CARD_SIZE = 58;
export const MAX_PLAYER_CARD_SIZE = 150;

export type LogoMode = "preset" | "generated" | "upload";

export interface TeamLogo {
  mode: LogoMode;
  /** Hazır görsel şablon kimliği */
  presetId?: string;
  imageUrl?: string;
  shape: LogoShape;
  borderStyle: LogoBorderStyle;
  backgroundStyle: LogoBackgroundStyle;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  icon: LogoIcon;
  initials: string;
  showInitials: boolean;
  showIcon: boolean;
  teamName: string;
  showTeamName: boolean;
  textColor: string;
  /** Poster / preview display size in px */
  displaySize: number;
  /** Firebase Storage yolu — bulutta data URL yerine */
  storagePath?: string;
  /** @deprecated use initials */
  letter?: string;
  /** @deprecated use primaryColor */
  bgColor?: string;
  /** @deprecated use textColor */
  iconColor?: string;
}

export interface MatchInfo {
  titleLine1: string;
  titleLine2: string;
  titleSubtitle: string;
  titleStyleId: PosterTitleStyleId;
  titleEffectId: PosterTitleEffectId;
  titleFontSize: number;
  titleLetterSpacing: number;
  titleShadow: number;
  titleRotation: number;
  titleMaxWidth: number;
  venue: string;
  time: string;
  date: string;
}

export type PosterTitleStyleId =
  | "cinematic"
  | "champions-league"
  | "summer-cup"
  | "dark-arena";

export type PosterTitleEffectId =
  | "normal"
  | "metallic"
  | "chrome"
  | "gold"
  | "neon"
  | "smoky";

export type FormationRowRole = "GK" | "DEF" | "MID" | "ATT";

export interface FormationRow {
  role: FormationRowRole;
  count: number;
}

export interface FormationSlot {
  x: number;
  y: number;
  label: string;
  rowIndex: number;
  isGoalkeeper: boolean;
}

export interface Formation {
  id: string;
  name: string;
  squadSize: SquadSize;
  rows: FormationRow[];
  slots: FormationSlot[];
}

export interface PitchPlayer {
  playerId: string;
  slotIndex: number;
  team: "home" | "away";
  x?: number;
  y?: number;
}

export interface AppState {
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
  singlePitchPlayers: PitchPlayer[];
  playerCardSize: number;
  photoScalePercent: number;
  teamLogoDisplaySize: number;
  posterTheme: PosterThemeId;
  teamMode: "single" | "versus";
  localUpdatedAt?: string;
  syncRevisions: {
    branding: number;
    roster: number;
    layout: number;
    media: number;
  };
}
