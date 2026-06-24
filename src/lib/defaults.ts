import type { JerseyConfig, TeamConfig, TeamLogo } from "@/types";
import { DEFAULT_LOGO_DISPLAY_SIZE } from "@/types";
import {
  applyLogoImagePreset,
  DEFAULT_AWAY_PRESET_ID,
  DEFAULT_HOME_PRESET_ID,
  getLogoImagePreset,
} from "@/lib/logoImagePresets";

export const DEFAULT_HOME_SHORT_NAME = "TAKIM A";
export const DEFAULT_AWAY_SHORT_NAME = "TAKIM B";

function buildPresetLogo(presetId: string, shortName: string): TeamLogo {
  const preset = getLogoImagePreset(presetId);
  if (!preset) {
    throw new Error(`Unknown logo preset: ${presetId}`);
  }

  const base: TeamLogo = {
    mode: "generated",
    shape: "shield",
    borderStyle: "chrome",
    backgroundStyle: "verticalStripes",
    primaryColor: "#374151",
    secondaryColor: "#111827",
    accentColor: "#e5e7eb",
    icon: "none",
    initials: shortName.slice(0, 2).toUpperCase() || "?",
    showInitials: false,
    showIcon: false,
    teamName: shortName,
    showTeamName: false,
    textColor: "#ffffff",
    displaySize: DEFAULT_LOGO_DISPLAY_SIZE,
  };

  return applyLogoImagePreset(preset, base, shortName);
}

export const defaultHomeLogo: TeamLogo = buildPresetLogo(
  DEFAULT_HOME_PRESET_ID,
  DEFAULT_HOME_SHORT_NAME
);

export const defaultAwayLogo: TeamLogo = buildPresetLogo(
  DEFAULT_AWAY_PRESET_ID,
  DEFAULT_AWAY_SHORT_NAME
);

export const defaultHomeTeam: TeamConfig = {
  name: "Takım A",
  shortName: DEFAULT_HOME_SHORT_NAME,
  jersey: getLogoImagePreset(DEFAULT_HOME_PRESET_ID)!.jersey,
  atmosphereColor: "#facc15",
  logo: defaultHomeLogo,
  playerIds: [],
};

export const defaultAwayTeam: TeamConfig = {
  name: "Takım B",
  shortName: DEFAULT_AWAY_SHORT_NAME,
  jersey: getLogoImagePreset(DEFAULT_AWAY_PRESET_ID)!.jersey,
  atmosphereColor: "#dc2626",
  logo: defaultAwayLogo,
  playerIds: [],
};

export function padPlayerIds(ids: string[], size: number): string[] {
  return Array.from({ length: size }, (_, i) => ids[i] ?? "");
}
