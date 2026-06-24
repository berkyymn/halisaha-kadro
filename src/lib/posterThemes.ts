export type PosterThemeId =
  | "derby-night"
  | "champions-night"
  | "dark-arena"
  | "summer-cup";

export interface PosterThemeConfig {
  id: PosterThemeId;
  label: string;
  /** Path under /public */
  backgroundSrc: string;
}

export const POSTER_THEMES: Record<PosterThemeId, PosterThemeConfig> = {
  "derby-night": {
    id: "derby-night",
    label: "Derbi Gecesi",
    backgroundSrc: "/posters/derby-night.png",
  },
  "champions-night": {
    id: "champions-night",
    label: "Şampiyonlar Ligi",
    backgroundSrc: "/posters/champions-night.png",
  },
  "dark-arena": {
    id: "dark-arena",
    label: "Karanlık Arena",
    backgroundSrc: "/posters/dark-arena.png",
  },
  "summer-cup": {
    id: "summer-cup",
    label: "Summer Cup",
    backgroundSrc: "/posters/summer-cup.png",
  },
};

/** Toolbar sırası */
export const POSTER_THEME_LIST: PosterThemeConfig[] = [
  POSTER_THEMES["derby-night"],
  POSTER_THEMES["champions-night"],
  POSTER_THEMES["dark-arena"],
  POSTER_THEMES["summer-cup"],
];

export const POSTER_THEME_IDS = POSTER_THEME_LIST.map((t) => t.id);

export const DEFAULT_POSTER_THEME: PosterThemeId = "derby-night";

/** Eski kayıtlı tema kimlikleri → güncel poster teması */
const LEGACY_POSTER_THEME_MAP: Record<string, PosterThemeId> = {
  cinematic: "derby-night",
  derby: "derby-night",
  "derby-night": "derby-night",
  "champions-league": "champions-night",
  champions: "champions-night",
  "champions-night": "champions-night",
  "dark-arena": "dark-arena",
  "summer-cup": "summer-cup",
  default: "derby-night",
};

export function normalizePosterTheme(theme: unknown): PosterThemeId {
  if (typeof theme === "string") {
    if (theme in POSTER_THEMES) {
      return theme as PosterThemeId;
    }
    const legacy = LEGACY_POSTER_THEME_MAP[theme];
    if (legacy) return legacy;
  }
  return DEFAULT_POSTER_THEME;
}

export function getPosterThemeConfig(themeId: unknown): PosterThemeConfig {
  return POSTER_THEMES[normalizePosterTheme(themeId)];
}

export function getPosterThemeBackgroundSrc(themeId: unknown): string {
  return getPosterThemeConfig(themeId).backgroundSrc;
}
