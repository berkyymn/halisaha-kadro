import type { CSSProperties } from "react";
import type { PosterThemeId } from "@/lib/posterThemes";
import type { MatchInfo, PosterTitleEffectId, PosterTitleStyleId } from "@/types";

export const TITLE_STYLE_PRESETS: {
  id: PosterTitleStyleId;
  label: string;
  description: string;
  swatch: [string, string];
}[] = [
  {
    id: "cinematic",
    label: "Kırmızı",
    description: "Beyaz + kırmızı vurgu",
    swatch: ["#ffffff", "#ef4444"],
  },
  {
    id: "champions-league",
    label: "Mavi",
    description: "Beyaz + mavi vurgu",
    swatch: ["#ffffff", "#38bdf8"],
  },
  {
    id: "summer-cup",
    label: "Turkuaz",
    description: "Beyaz + turkuaz vurgu",
    swatch: ["#ffffff", "#2dd4bf"],
  },
  {
    id: "dark-arena",
    label: "Gri",
    description: "Metalik gri tonlar",
    swatch: ["#e4e4e7", "#a1a1aa"],
  },
];

export const TITLE_EFFECT_PRESETS: {
  id: PosterTitleEffectId;
  label: string;
}[] = [
  { id: "normal", label: "Normal" },
  { id: "metallic", label: "Metalik" },
  { id: "chrome", label: "Krom" },
  { id: "gold", label: "Altın" },
  { id: "neon", label: "Neon" },
  { id: "smoky", label: "Dumanlı" },
];

export const DEFAULT_TITLE_STYLE: Pick<
  MatchInfo,
  | "titleStyleId"
  | "titleEffectId"
  | "titleFontSize"
  | "titleLetterSpacing"
  | "titleShadow"
  | "titleRotation"
  | "titleMaxWidth"
  | "titleSubtitle"
> = {
  titleSubtitle: "",
  titleStyleId: "cinematic",
  titleEffectId: "smoky",
  titleFontSize: 100,
  titleLetterSpacing: 50,
  titleShadow: 85,
  titleRotation: 0,
  titleMaxWidth: 88,
};

export function defaultTitleStyleForTheme(
  theme: PosterThemeId
): PosterTitleStyleId {
  switch (theme) {
    case "champions-night":
      return "champions-league";
    case "summer-cup":
      return "summer-cup";
    case "dark-arena":
      return "dark-arena";
    default:
      return "cinematic";
  }
}

type StylePalette = {
  line1: string;
  line2: string;
  subtitle: string;
  accentGlow: string;
};

const PALETTES: Record<PosterTitleStyleId, StylePalette> = {
  cinematic: {
    line1: "#ffffff",
    line2: "#ef4444",
    subtitle: "rgba(255,255,255,0.82)",
    accentGlow: "rgba(239,68,68,0.45)",
  },
  "champions-league": {
    line1: "#ffffff",
    line2: "#38bdf8",
    subtitle: "rgba(186,230,253,0.9)",
    accentGlow: "rgba(56,189,248,0.5)",
  },
  "summer-cup": {
    line1: "#ffffff",
    line2: "#2dd4bf",
    subtitle: "rgba(204,251,241,0.88)",
    accentGlow: "rgba(45,212,191,0.45)",
  },
  "dark-arena": {
    line1: "#e4e4e7",
    line2: "#a1a1aa",
    subtitle: "rgba(212,212,216,0.75)",
    accentGlow: "rgba(161,161,170,0.4)",
  },
};

function shadowStack(intensity: number, extra: string[] = []): string {
  const t = intensity / 100;
  const base = [
    `0 ${2 + t * 2}px 0 rgba(0,0,0,${0.85 + t * 0.1})`,
    `0 ${6 + t * 8}px ${20 + t * 24}px rgba(0,0,0,${0.55 + t * 0.35})`,
    `0 0 ${30 + t * 40}px rgba(0,0,0,${0.35 + t * 0.25})`,
    ...extra,
  ];
  return base.join(", ");
}

function gradientFill(colors: string[]): CSSProperties {
  return {
    backgroundImage: `linear-gradient(180deg, ${colors.join(", ")})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  };
}

function effectStyles(
  effect: PosterTitleEffectId,
  palette: StylePalette,
  shadow: number,
  isLine2: boolean
): CSSProperties {
  const glow = isLine2 ? palette.accentGlow : "rgba(255,255,255,0.12)";

  switch (effect) {
    case "metallic":
      return {
        ...gradientFill(
          isLine2
            ? ["#f4f4f5", palette.line2, "#71717a"]
            : ["#ffffff", "#d4d4d8", "#ffffff"]
        ),
        textShadow: shadowStack(shadow, [`0 0 18px ${glow}`]),
      };
    case "chrome":
      return {
        ...gradientFill(
          isLine2
            ? ["#fafafa", "#a1a1aa", "#52525b", "#e4e4e7"]
            : ["#ffffff", "#94a3b8", "#f8fafc", "#cbd5e1"]
        ),
        textShadow: shadowStack(shadow, [
          "0 1px 0 rgba(255,255,255,0.65)",
          `0 0 22px ${glow}`,
        ]),
      };
    case "gold":
      return {
        ...gradientFill(
          isLine2
            ? ["#fef3c7", "#f59e0b", "#b45309"]
            : ["#fffbeb", "#fcd34d", "#f59e0b", "#fffbeb"]
        ),
        textShadow: shadowStack(shadow, ["0 0 20px rgba(245,158,11,0.35)"]),
      };
    case "neon":
      return {
        color: isLine2 ? palette.line2 : palette.line1,
        textShadow: [
          `0 0 ${8 + shadow * 0.2}px ${isLine2 ? palette.line2 : "#fff"}`,
          `0 0 ${20 + shadow * 0.35}px ${glow}`,
          shadowStack(shadow * 0.65),
        ].join(", "),
      };
    case "smoky":
      return {
        color: isLine2 ? palette.line2 : palette.line1,
        textShadow: [
          shadowStack(shadow),
          `0 0 ${40 + shadow * 0.5}px rgba(0,0,0,0.85)`,
          `0 8px ${32 + shadow * 0.3}px ${glow}`,
        ].join(", "),
      };
    default:
      return {
        color: isLine2 ? palette.line2 : palette.line1,
        textShadow: shadowStack(shadow, isLine2 ? [`0 0 24px ${glow}`] : []),
      };
  }
}

export function buildPosterTitleStyles(info: MatchInfo): {
  container: CSSProperties;
  line1: CSSProperties;
  line2: CSSProperties;
  subtitle: CSSProperties;
  fontSize: string;
} {
  const palette = PALETTES[info.titleStyleId] ?? PALETTES.cinematic;
  const spacing =
    -0.02 + (info.titleLetterSpacing / 100) * 0.22;
  const sizeScale = info.titleFontSize / 100;

  const fontSize = `clamp(${2.1 * sizeScale}rem, ${5.8 * sizeScale}cqw, ${4.4 * sizeScale}rem)`;
  const subtitleSize = `clamp(0.55rem, ${1.35 * sizeScale}cqw, ${0.95 * sizeScale}rem)`;

  return {
    fontSize,
    container: {
      maxWidth: `${info.titleMaxWidth}%`,
      transform: `rotate(${info.titleRotation}deg)`,
    },
    line1: {
      ...effectStyles(info.titleEffectId, palette, info.titleShadow, false),
      letterSpacing: `${spacing}em`,
      fontWeight: 900,
      fontStyle: "italic",
      lineHeight: 0.9,
    },
    line2: {
      ...effectStyles(info.titleEffectId, palette, info.titleShadow, true),
      letterSpacing: `${spacing + 0.02}em`,
      fontWeight: 900,
      fontStyle: "italic",
      lineHeight: 0.9,
    },
    subtitle: {
      color: palette.subtitle,
      letterSpacing: `${0.12 + spacing * 0.5}em`,
      fontWeight: 700,
      fontSize: subtitleSize,
      textShadow: shadowStack(info.titleShadow * 0.7),
      fontStyle: "normal",
    },
  };
}
