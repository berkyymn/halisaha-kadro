"use client";

import {
  getPosterThemeBackgroundSrc,
  normalizePosterTheme,
} from "@/lib/posterThemes";
import { useAppStore } from "@/store/useAppStore";

export function StaticPosterBackground() {
  const posterTheme = useAppStore((s) => s.posterTheme);
  const teamMode = useAppStore((s) => s.teamMode);
  const theme = normalizePosterTheme(posterTheme);
  const hasSingleThemeAsset = teamMode === "single" && theme === "derby-night";
  const src = hasSingleThemeAsset
    ? "/posters/vertical/derby_night_vertical.jpeg"
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
