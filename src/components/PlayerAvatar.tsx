"use client";

import { memo, useId } from "react";
import type { JerseyConfig, Player } from "@/types";
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
  photoScale?: number;
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
  photoScale = 100,
  isCaptain = false,
  showName = true,
}: PlayerAvatarProps) {
  const uid = useId().replace(/:/g, "");
  const src = photoSrc(player);
  const isCutout = Boolean(player?.cutoutUrl);

  const w = size;
  const h = Math.round(size * 1.48);

  const BASE_PHOTO_RATIO = 0.78;
  const basePhotoD = w * BASE_PHOTO_RATIO;
  const photoD = basePhotoD * (photoScale / 100);
  const photoTop = 0;

  const bodyTop = basePhotoD * 0.54;
  const bodyH = h * 0.72;

  const compact = w < 92;
  const nameH = showName ? h * (compact ? 0.14 : 0.16) : 0;

  const numberColor = jersey.numberColor || "#ffffff";

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
        filter: `drop-shadow(0 18px 28px ${CHROME.shadow}) drop-shadow(0 6px 12px rgba(0,0,0,0.55))`,
      }}
    >
      {/* Card shell — krom çerçeve */}
      <div
        className="absolute inset-x-[3%] overflow-hidden rounded-[18%]"
        style={{
          top: basePhotoD * 0.16,
          height: h - nameH * 0.55,
          background:
            "linear-gradient(180deg, rgba(10,12,16,.97) 0%, rgba(18,20,24,.97) 48%, rgba(6,8,10,.98) 100%)",
          border: `1px solid ${CHROME.mid}`,
          boxShadow: `
            inset 0 1px 0 rgba(229,231,235,0.22),
            inset 0 -1px 0 rgba(55,65,81,0.55),
            inset 0 -20px 32px rgba(0,0,0,0.5)
          `,
        }}
      />

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
        className="absolute left-1/2 z-20 -translate-x-1/2 font-black leading-none"
        style={{
          top: bodyTop + bodyH * 0.34,
          color: numberColor,
          fontSize: w * 0.37,
          textShadow: "0 2px 6px rgba(0,0,0,0.85)",
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
          border: `2px solid ${CHROME.mid}`,
          boxShadow: `
            0 5px 16px ${CHROME.shadow},
            inset 0 3px 6px rgba(255,255,255,0.12),
            inset 0 -4px 10px rgba(0,0,0,0.55)
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
            width: w * 0.92,
            height: nameH,
            borderRadius: w * 0.06,
            background: "rgba(0,0,0,0.96)",
            border: `1px solid ${CHROME.dark}`,
            borderTop: `1px solid rgba(229,231,235,0.28)`,
            boxShadow: `
              inset 0 1px 0 rgba(229,231,235,0.1),
              0 4px 14px ${CHROME.shadow}
            `,
            padding: "0 5px",
          }}
        >
          <span
            className="w-full truncate text-center font-black uppercase text-white"
            style={{
              fontSize: Math.max(compact ? 7 : 8, w * (compact ? 0.11 : 0.14)),
              lineHeight: 1.05,
              letterSpacing: compact ? "0.02em" : "0.04em",
              textShadow: "0 1px 3px rgba(0,0,0,0.9)",
            }}
          >
            {name?.trim() || "—"}
          </span>
        </div>
      )}
    </div>
  );
});
