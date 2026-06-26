import { resolveLogoImageSrc } from "@/lib/logoImagePresets";
import type {
  LogoBackgroundStyle,
  LogoBorderStyle,
  LogoIcon,
  LogoMode,
  LogoShape,
  TeamLogo,
} from "@/types";
import {
  DEFAULT_LOGO_DISPLAY_SIZE,
  MAX_LOGO_DISPLAY_SIZE,
  MIN_LOGO_DISPLAY_SIZE,
} from "@/types";

const VALID_ICONS: LogoIcon[] = [
  "none",
  "eagle",
  "lion",
  "wolf",
  "crown",
  "shield",
  "star",
  "flame",
  "lightning",
  "ball",
  "trophy",
  "football",
];

const DEPRECATED_ICON_MAP: Partial<Record<LogoIcon, LogoIcon>> = {
  football: "ball",
  tiger: "lion",
  bear: "lion",
  bull: "lion",
  panther: "wolf",
  shark: "wolf",
  falcon: "eagle",
  phoenix: "eagle",
  dragon: "flame",
  wings: "eagle",
  claw: "wolf",
  sword: "shield",
  spartan: "shield",
  anchor: "shield",
  skull: "shield",
  mountain: "shield",
};

const VALID_BACKGROUNDS: LogoBackgroundStyle[] = [
  "solid",
  "gradient",
  "split",
  "radial",
  "verticalStripes",
  "horizontalStripes",
];

export function normalizeLogoIcon(icon?: LogoIcon | string): LogoIcon {
  if (!icon) return "none";
  const mapped =
    DEPRECATED_ICON_MAP[icon as LogoIcon] ??
    (icon as LogoIcon);
  if (VALID_ICONS.includes(mapped)) return mapped === "football" ? "ball" : mapped;
  return "none";
}

export function clampLogoDisplaySize(size?: number): number {
  const n = size ?? DEFAULT_LOGO_DISPLAY_SIZE;
  return Math.max(MIN_LOGO_DISPLAY_SIZE, Math.min(MAX_LOGO_DISPLAY_SIZE, Math.round(n)));
}

export function getShapePath(shape: LogoShape): string {
  switch (shape) {
    case "circle":
      return "M50 8 A42 42 0 1 1 49.99 8 Z";
    case "shield":
      return "M50 5 L90 16 L90 52 C90 74 72 90 50 95 C28 90 10 74 10 52 L10 16 Z";
    case "roundedShield":
      return "M50 6 C62 6 88 14 88 14 L88 50 C88 72 68 90 50 94 C32 90 12 72 12 50 L12 14 C12 14 38 6 50 6 Z";
    case "hexagon":
      return "M50 8 L84 28 L84 72 L50 92 L16 72 L16 28 Z";
    case "pentagon":
      return "M50 8 L88 38 L74 88 L26 88 L12 38 Z";
    case "diamond":
      return "M50 6 L92 50 L50 94 L8 50 Z";
    case "crest":
      return "M50 4 L62 8 L78 6 L88 18 L90 52 C90 74 72 92 50 96 C28 92 10 74 10 52 L12 18 L22 6 L38 8 Z";
    case "esports":
      return "M14 18 L86 18 L94 50 L86 82 L14 82 L6 50 Z";
    default:
      return "M50 5 L90 16 L90 52 C90 74 72 90 50 95 C28 90 10 74 10 52 L10 16 Z";
  }
}

export function getBackgroundFillId(
  style: LogoBackgroundStyle,
  gradPrefix: string
): string {
  switch (style) {
    case "gradient":
      return `${gradPrefix}-linear`;
    case "split":
      return `${gradPrefix}-split`;
    case "radial":
      return `${gradPrefix}-radial`;
    case "verticalStripes":
      return `${gradPrefix}-vstripes`;
    case "horizontalStripes":
      return `${gradPrefix}-hstripes`;
    default:
      return "";
  }
}

export function needsStripePattern(style: LogoBackgroundStyle): boolean {
  return style === "verticalStripes" || style === "horizontalStripes";
}

export interface BorderLayer {
  stroke: string;
  strokeWidth: number;
  opacity?: number;
  filter?: string;
}

export function getBorderLayers(
  style: LogoBorderStyle,
  accentColor: string,
  gradPrefix: string
): BorderLayer[] {
  switch (style) {
    case "double":
      return [
        { stroke: "rgba(0,0,0,0.7)", strokeWidth: 5.2 },
        { stroke: "rgba(255,255,255,0.88)", strokeWidth: 2.4 },
      ];
    case "triple":
      return [
        { stroke: "rgba(0,0,0,0.75)", strokeWidth: 5.8 },
        { stroke: accentColor, strokeWidth: 2.2, opacity: 0.95 },
        { stroke: "rgba(255,255,255,0.65)", strokeWidth: 1.2 },
      ];
    case "chrome":
      return [
        { stroke: "rgba(0,0,0,0.8)", strokeWidth: 5.8 },
        { stroke: `url(#${gradPrefix}-chrome)`, strokeWidth: 3.6 },
        { stroke: "rgba(255,255,255,0.28)", strokeWidth: 1.3 },
      ];
    case "gold":
      return [
        { stroke: "rgba(0,0,0,0.75)", strokeWidth: 5.8 },
        { stroke: `url(#${gradPrefix}-gold)`, strokeWidth: 3.8 },
        { stroke: "rgba(255,255,255,0.22)", strokeWidth: 1.2 },
      ];
    case "neon":
      return [
        {
          stroke: accentColor,
          strokeWidth: 2.8,
          filter: `drop-shadow(0 0 3px ${accentColor}) drop-shadow(0 0 6px ${accentColor}88)`,
        },
        { stroke: "rgba(255,255,255,0.4)", strokeWidth: 1.1 },
      ];
    default:
      return [
        { stroke: "rgba(0,0,0,0.55)", strokeWidth: 4.2 },
        { stroke: "rgba(255,255,255,0.6)", strokeWidth: 2.2 },
      ];
  }
}

export function needsChromeGradient(style: LogoBorderStyle): boolean {
  return style === "chrome";
}

export function needsGoldGradient(style: LogoBorderStyle): boolean {
  return style === "gold";
}

export function normalizeTeamLogo(
  raw: Partial<TeamLogo>,
  fallbackShortName = "?"
): TeamLogo {
  const initials =
    raw.initials ||
    raw.letter ||
    fallbackShortName.slice(0, 2).toUpperCase() ||
    "?";

  const shape = (raw.shape as LogoShape) ?? "shield";
  const validShapes: LogoShape[] = [
    "circle",
    "shield",
    "roundedShield",
    "hexagon",
    "pentagon",
    "diamond",
    "crest",
    "esports",
  ];

  const icon = normalizeLogoIcon(raw.icon);
  const showIcon = raw.showIcon === true && icon !== "none";

  let mode: LogoMode = "generated";
  if (raw.mode === "preset" || raw.mode === "upload" || raw.mode === "generated") {
    mode = raw.mode;
  } else if (raw.presetId || (raw.imageUrl && raw.imageUrl.startsWith("/logos/presets/"))) {
    mode = "preset";
  }

  let presetId = raw.presetId;
  let imageUrl =
    raw.imageUrl ??
    (mode === "preset" && presetId
      ? resolveLogoImageSrc({ mode: "preset", presetId, imageUrl: undefined })
      : undefined);

  if (
    mode !== "generated" &&
    imageUrl?.startsWith("/logos/presets/")
  ) {
    mode = "preset";
  }

  if (mode === "generated") {
    presetId = undefined;
    imageUrl = undefined;
  } else if (mode === "upload") {
    presetId = undefined;
  }

  return {
    mode,
    presetId,
    imageUrl,
    shape: validShapes.includes(shape) ? shape : "shield",
    borderStyle: raw.borderStyle ?? "chrome",
    backgroundStyle: VALID_BACKGROUNDS.includes(raw.backgroundStyle as LogoBackgroundStyle)
      ? (raw.backgroundStyle as LogoBackgroundStyle)
      : "verticalStripes",
    primaryColor: raw.primaryColor ?? raw.bgColor ?? "#374151",
    secondaryColor: raw.secondaryColor ?? "#111827",
    accentColor: raw.accentColor ?? "#dc2626",
    icon,
    initials: initials.slice(0, 3).toUpperCase(),
    showInitials: raw.showInitials !== false,
    showIcon,
    teamName: raw.teamName ?? fallbackShortName,
    showTeamName: false,
    textColor: raw.textColor ?? raw.iconColor ?? "#ffffff",
    displaySize: clampLogoDisplaySize(raw.displaySize),
  };
}
