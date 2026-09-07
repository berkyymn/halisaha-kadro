"use client";

import {
  getPosterThemeBackgroundSrc,
  normalizePosterTheme,
} from "@/lib/posterThemes";
import { useAppStore } from "@/store/useAppStore";

const SINGLE_THEME_BACKGROUNDS: Partial<Record<string, string>> = {
  "derby-night": "/posters/vertical/derby_night_vertical.jpeg",
  "champions-night": "/posters/vertical/champions_league_vertical.jpeg",
  "dark-arena": "/posters/vertical/dark_arena_vertical.jpeg",
  "summer-cup": "/posters/vertical/summer_cup_vertical.jpeg",
};

export function StaticPosterBackground() {
  const posterTheme = useAppStore((s) => s.posterTheme);
  const teamMode = useAppStore((s) => s.teamMode);
  const theme = normalizePosterTheme(posterTheme);
  const singleThemeSrc = SINGLE_THEME_BACKGROUNDS[theme];
  const hasSingleThemeAsset = teamMode === "single" && Boolean(singleThemeSrc);
  const src = hasSingleThemeAsset
    ? singleThemeSrc!
    : getPosterThemeBackgroundSrc(theme);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <img
        key={`${theme}-${teamMode}`}
        src={src}
        alt=""
        aria-hidden
        draggable={false}
        className={`absolute inset-0 h-full w-full object-cover object-center select-none ${
          teamMode === "single" && !hasSingleThemeAsset
            ? "rotate-90 scale-[1.35]"
            : ""
        }`}
      />
    </div>
  );
}
