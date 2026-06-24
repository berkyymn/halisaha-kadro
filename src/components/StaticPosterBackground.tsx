"use client";

import {
  getPosterThemeBackgroundSrc,
  normalizePosterTheme,
} from "@/lib/posterThemes";
import { useAppStore } from "@/store/useAppStore";

export function StaticPosterBackground() {
  const posterTheme = useAppStore((s) => s.posterTheme);
  const theme = normalizePosterTheme(posterTheme);
  const src = getPosterThemeBackgroundSrc(theme);

  return (
    <img
      key={theme}
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none select-none"
    />
  );
}
