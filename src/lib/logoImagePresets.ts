import type { JerseyConfig, TeamLogo } from "@/types";
import { DEFAULT_LOGO_DISPLAY_SIZE } from "@/types";

export interface LogoImagePreset {
  id: string;
  /** Erişilebilirlik için — seçim ekranında görünmez */
  label: string;
  imageSrc: string;
  jersey: JerseyConfig;
}

export const LOGO_IMAGE_PRESETS: LogoImagePreset[] = [
  {
    id: "white-eagles",
    label: "White Eagles",
    imageSrc: "/logos/presets/white-eagles.png",
    jersey: {
      style: "split",
      primaryColor: "#ffffff",
      secondaryColor: "#e5e7eb",
      numberColor: "#111827",
    },
  },
  {
    id: "yellow-navy-crest",
    label: "Yellow Navy Crest",
    imageSrc: "/logos/presets/yellow-navy-crest.png",
    jersey: {
      style: "vertical_stripes",
      primaryColor: "#1e3a8a",
      secondaryColor: "#facc15",
      numberColor: "#ffffff",
    },
  },
  {
    id: "red-yellow-lion",
    label: "Red Yellow Lion",
    imageSrc: "/logos/presets/red-yellow-lion.png",
    jersey: {
      style: "split",
      primaryColor: "#facc15",
      secondaryColor: "#dc2626",
      numberColor: "#111827",
    },
  },
  {
    id: "black-wolves",
    label: "Black Wolves",
    imageSrc: "/logos/presets/black-wolves.png",
    jersey: {
      style: "split",
      primaryColor: "#111827",
      secondaryColor: "#374151",
      numberColor: "#ffffff",
    },
  },
  {
    id: "green-white-snake",
    label: "Green White Snake",
    imageSrc: "/logos/presets/green-white-snake.png",
    jersey: {
      style: "vertical_stripes",
      primaryColor: "#15803d",
      secondaryColor: "#ffffff",
      numberColor: "#ffffff",
    },
  },
  {
    id: "burgundy-navy-shark",
    label: "Burgundy Navy Shark",
    imageSrc: "/logos/presets/burgundy-navy-shark.png",
    jersey: {
      style: "split",
      primaryColor: "#7f1d1d",
      secondaryColor: "#1e3a8a",
      numberColor: "#ffffff",
    },
  },
];

export const DEFAULT_HOME_PRESET_ID = "yellow-navy-crest";
export const DEFAULT_AWAY_PRESET_ID = "red-yellow-lion";

export function getLogoImagePreset(id?: string): LogoImagePreset | undefined {
  if (!id) return undefined;
  return LOGO_IMAGE_PRESETS.find((p) => p.id === id);
}

export function getJerseyForLogoPreset(presetId?: string): JerseyConfig | undefined {
  return getLogoImagePreset(presetId)?.jersey;
}

export function resolveLogoImageSrc(
  logo: Pick<TeamLogo, "mode" | "presetId" | "imageUrl">
): string | undefined {
  if (logo.imageUrl) return logo.imageUrl;
  if (logo.mode === "preset" && logo.presetId) {
    return getLogoImagePreset(logo.presetId)?.imageSrc;
  }
  return undefined;
}

export function applyLogoImagePreset(
  preset: LogoImagePreset,
  current: TeamLogo,
  shortName: string
): TeamLogo {
  return {
    ...current,
    mode: "preset",
    presetId: preset.id,
    imageUrl: preset.imageSrc,
    teamName: shortName,
  };
}
