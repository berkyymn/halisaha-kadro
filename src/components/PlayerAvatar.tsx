"use client";

import { memo, useId } from "react";
import type { JerseyConfig, Player } from "@/types";
import { luminance, teamAccent } from "@/lib/teamColors";
import {
  getPhotoDisplayStyle,
  getPhotoImgClassName,
} from "@/lib/imageCompress";

export type PlayerCardVariant = "light" | "dark";

interface PlayerAvatarProps {
  player?: Pick<
    Player,
    "photoSource" | "cutoutUrl" | "photoUrl" | "photoCrop" | "avatarUrl"
  >;
  jersey: JerseyConfig;
  number: number;
  name?: string;
  size?: number;
  isCaptain?: boolean;
  showName?: boolean;
  variant?: PlayerCardVariant;
}

const CHROME = {
  light: "#e5e7eb",
  mid: "#9ca3af",
  dark: "#374151",
  shadow: "rgba(0,0,0,0.75)",
} as const;

function photoSrc(player?: PlayerAvatarProps["player"]) {
  return (
    player?.cutoutUrl ||
    player?.photoSource ||
    player?.photoUrl ||
    player?.avatarUrl
  );
}

function jerseyBodyBackground(jersey: JerseyConfig): string {
  const primary = jersey.primaryColor || "#111827";
  const secondary = jersey.secondaryColor || primary;

  switch (jersey.style) {
    case "split":
      return `linear-gradient(90deg, ${primary} 0 50%, ${secondary} 50% 100%)`;
    case "vertical_stripes":
      return `repeating-linear-gradient(90deg, ${primary} 0 16%, ${secondary} 16% 32%)`;
    case "wide_vertical_stripes":
      return `repeating-linear-gradient(90deg, ${primary} 0 25%, ${secondary} 25% 50%)`;
    case "horizontal_stripes":
      return `repeating-linear-gradient(180deg, ${primary} 0 16%, ${secondary} 16% 32%)`;
    case "sash":
      return `linear-gradient(135deg, ${primary} 0 42%, ${secondary} 42% 58%, ${primary} 58% 100%)`;
    default:
      return primary;
  }
}

const DISPLAY_FONT = "var(--font-display), system-ui, sans-serif";

function PlaceholderSilhouette({ gradId }: { gradId: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-[58%] w-[58%]" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b9099" />
          <stop offset="100%" stopColor="#3f434a" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="34" r="19" fill={`url(#${gradId})`} />
      <path
        d="M18 91c4-22 18-34 32-34s28 12 32 34H18z"
        fill={`url(#${gradId})`}
      />
    </svg>
  );
}

export const PlayerAvatar = memo(function PlayerAvatar({
  player,
  jersey,
  number,
  name,
  size = 150,
  isCaptain = false,
  showName = true,
}: PlayerAvatarProps) {
  const uid = useId().replace(/:/g, "");
  const src = photoSrc(player);
  const isCutout = Boolean(player?.cutoutUrl);

  const w = size;
  const h = Math.round(size * 1.48);

  const BASE_PHOTO_RATIO = 0.78;
  const photoD = w * BASE_PHOTO_RATIO;
  const photoTop = 0;

  const bodyTop = photoD * 0.54;
  const bodyH = h * 0.72;

  const compact = w < 92;
  const nameH = showName ? h * (compact ? 0.14 : 0.16) : 0;
  // Küçük kartta (telefon, dar ekran) etiket kartın biraz dışına taşar ve yazı
  // ada göre küçülür: "OYUNCU 7" gibi adlar "OYUNCU…" diye kesilmesin.
  const plateW = w * (compact ? 1.14 : 0.92);
  const plateName = name?.trim() || "—";
  const baseNameFont = Math.max(compact ? 9 : 10, w * (compact ? 0.15 : 0.18));
  // Bebas Neue + 0.05em aralık ≈ karakter başına 0.47em.
  const fitNameFont = (plateW - 8) / (Math.max(1, plateName.length) * 0.47);
  const nameFont = compact ? Math.max(7, Math.min(baseNameFont, fitNameFont)) : baseNameFont;

  const numberColor = jersey.numberColor || "#ffffff";
  const accent = teamAccent(jersey);

  const jerseyClip = `polygon(
    24% 0%,
    76% 0%,
    98% 22%,
    88% 100%,
    12% 100%,
    2% 22%
  )`;

  return (
    <div
      className="relative shrink-0 select-none"
      style={{
        width: w,
        height: h,
        // Gölge kart boyutuyla orantılı ve kısa: yakın sıralarda alttaki kartın
        // fotoğrafını karartmasın (eski sabit 18px/28px gölge tekli modda taşıyordu).
        filter: `drop-shadow(0 ${(w * 0.07).toFixed(1)}px ${(w * 0.12).toFixed(1)}px rgba(0,0,0,0.55)) drop-shadow(0 ${(w * 0.02).toFixed(1)}px ${(w * 0.04).toFixed(1)}px rgba(0,0,0,0.45))`,
      }}
    >
      {/* Forma gövdesi — takım renkleri korunur, dış kenar krom vurgu */}
      <div
        className="absolute left-1/2 -translate-x-1/2 overflow-hidden"
        style={{
          top: bodyTop,
          width: w * 0.98,
          height: bodyH,
          clipPath: jerseyClip,
          background: jerseyBodyBackground(jersey),
          boxShadow: `
            inset 0 18px 22px rgba(255,255,255,0.07),
            inset 0 -22px 28px rgba(0,0,0,0.55),
            0 0 0 1px rgba(156,163,175,0.32)
          `,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.14), transparent 32%), linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 100%)",
          }}
        />

        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-full"
          style={{
            width: w * 0.32,
            height: w * 0.16,
            background: "rgba(0,0,0,0.82)",
          }}
        />
      </div>

      <div
        className="absolute left-1/2 z-20 -translate-x-1/2 leading-none"
        style={{
          top: bodyTop + bodyH * 0.3,
          color: numberColor,
          fontFamily: DISPLAY_FONT,
          fontSize: w * 0.46,
          letterSpacing: "0.01em",
          // Koyu numara açık bir hale, açık numara koyu gölgeyle okunur kalsın.
          textShadow:
            luminance(numberColor) < 0.2
              ? "0 0 3px rgba(255,255,255,0.55), 0 1px 1px rgba(255,255,255,0.35)"
              : "0 2px 6px rgba(0,0,0,0.85), 0 0 1px rgba(0,0,0,0.9)",
        }}
      >
        {number}
      </div>

      {/* Fotoğraf halkası — krom ring */}
      <div
        className="absolute left-1/2 z-30 flex -translate-x-1/2 items-center justify-center overflow-hidden rounded-full"
        style={{
          top: photoTop,
          width: photoD,
          height: photoD,
          background:
            "radial-gradient(circle at 50% 38%, #4b5563 0%, #252a31 52%, #0a0c10 100%)",
          // İnce ve kromla yumuşatılmış takım rengi: fotoğrafın önüne geçmesin.
          border: `${Math.max(1.5, w * 0.018)}px solid color-mix(in srgb, ${accent} 60%, ${CHROME.mid})`,
          boxShadow: `
            0 0 0 1px rgba(0,0,0,0.65),
            0 ${(w * 0.04).toFixed(1)}px ${(w * 0.1).toFixed(1)}px rgba(0,0,0,0.45),
            inset 0 3px 6px rgba(255,255,255,0.12),
            inset 0 -3px 8px rgba(0,0,0,0.3)
          `,
        }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            draggable={false}
            className={getPhotoImgClassName(isCutout)}
            style={getPhotoDisplayStyle(player?.photoCrop, isCutout, photoD)}
          />
        ) : (
          <PlaceholderSilhouette gradId={`sil-${uid}`} />
        )}

        {/* Sol üst metalik highlight */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.04) 28%, transparent 50%)",
          }}
        />
      </div>

      {isCaptain && (
        <span
          className="absolute z-40 flex items-center justify-center rounded-full font-black text-amber-950"
          style={{
            top: photoD * 0.02,
            right: w * 0.08,
            width: w * 0.18,
            height: w * 0.18,
            fontSize: w * 0.095,
            background: "linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)",
            border: `1.5px solid ${CHROME.light}`,
            boxShadow: `
              0 3px 8px ${CHROME.shadow},
              inset 0 1px 0 rgba(255,255,255,0.35)
            `,
          }}
        >
          C
        </span>
      )}

      {showName && (
        <div
          className="absolute left-1/2 z-40 flex -translate-x-1/2 items-center justify-center overflow-hidden"
          style={{
            bottom: 0,
            width: plateW,
            height: nameH,
            borderRadius: w * 0.06,
            background: "linear-gradient(180deg, rgba(24,24,27,0.97), rgba(0,0,0,0.97))",
            border: `1px solid ${CHROME.dark}`,
            borderTop: `${Math.max(1.5, w * 0.022)}px solid ${accent}`,
            boxShadow: `
              inset 0 1px 0 rgba(229,231,235,0.1),
              0 4px 14px ${CHROME.shadow}
            `,
            padding: compact ? "0 3px" : "0 5px",
          }}
        >
          <span
            lang="tr"
            className="w-full truncate text-center uppercase text-white"
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: nameFont,
              lineHeight: 1,
              letterSpacing: "0.05em",
              paddingTop: "0.08em",
              textShadow: "0 1px 3px rgba(0,0,0,0.9)",
            }}
          >
            {plateName}
          </span>
        </div>
      )}
    </div>
  );
});
