"use client";

import { useId } from "react";
import type { TeamLogo } from "@/types";
import {
  getBackgroundFillId,
  getBorderLayers,
  getShapePath,
  needsChromeGradient,
  needsGoldGradient,
  normalizeTeamLogo,
} from "@/lib/logoUtils";
import { resolveLogoImageSrc } from "@/lib/logoImagePresets";
import { LogoIcon } from "./logo/LogoIcon";

interface TeamLogoBadgeProps {
  logo: TeamLogo;
  shortName: string;
  /** Override displaySize from logo config */
  size?: number;
  className?: string;
}

/** Hazır görsel logolarda kalan boşluğu telafi eder */
const IMAGE_LOGO_SCALE = 1.12;

function LogoGradientDefs({
  prefix,
  logo,
}: {
  prefix: string;
  logo: TeamLogo;
}) {
  return (
    <>
      {logo.backgroundStyle === "gradient" && (
        <linearGradient id={`${prefix}-linear`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor={logo.primaryColor} />
          <stop offset="55%" stopColor={logo.primaryColor} />
          <stop offset="100%" stopColor={logo.secondaryColor} />
        </linearGradient>
      )}
      {logo.backgroundStyle === "split" && (
        <linearGradient id={`${prefix}-split`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={logo.primaryColor} />
          <stop offset="48%" stopColor={logo.primaryColor} />
          <stop offset="52%" stopColor={logo.secondaryColor} />
          <stop offset="100%" stopColor={logo.secondaryColor} />
        </linearGradient>
      )}
      {logo.backgroundStyle === "radial" && (
        <radialGradient id={`${prefix}-radial`} cx="50%" cy="32%" r="68%">
          <stop offset="0%" stopColor={logo.primaryColor} />
          <stop offset="100%" stopColor={logo.secondaryColor} />
        </radialGradient>
      )}
      {needsChromeGradient(logo.borderStyle) && (
        <linearGradient id={`${prefix}-chrome`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f9fafb" />
          <stop offset="30%" stopColor="#d1d5db" />
          <stop offset="55%" stopColor="#6b7280" />
          <stop offset="78%" stopColor="#e5e7eb" />
          <stop offset="100%" stopColor="#9ca3af" />
        </linearGradient>
      )}
      {needsGoldGradient(logo.borderStyle) && (
        <linearGradient id={`${prefix}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
      )}
      {logo.backgroundStyle === "verticalStripes" && (
        <pattern
          id={`${prefix}-vstripes`}
          patternUnits="userSpaceOnUse"
          width="14"
          height="100"
        >
          <rect width="7" height="100" fill={logo.primaryColor} />
          <rect x="7" width="7" height="100" fill={logo.secondaryColor} />
        </pattern>
      )}
      {logo.backgroundStyle === "horizontalStripes" && (
        <pattern
          id={`${prefix}-hstripes`}
          patternUnits="userSpaceOnUse"
          width="100"
          height="14"
        >
          <rect width="100" height="7" fill={logo.primaryColor} />
          <rect y="7" width="100" height="7" fill={logo.secondaryColor} />
        </pattern>
      )}
    </>
  );
}

export function TeamLogoBadge({
  logo: rawLogo,
  shortName,
  size: sizeOverride,
  className = "",
}: TeamLogoBadgeProps) {
  const uid = useId().replace(/:/g, "");
  const logo = normalizeTeamLogo(rawLogo, shortName);
  const size = sizeOverride ?? logo.displaySize;
  const gradPrefix = `logo-${uid}`;
  const imageSrc = resolveLogoImageSrc(logo);

  if ((logo.mode === "preset" || logo.mode === "upload") && imageSrc) {
    const renderSize = Math.round(size * IMAGE_LOGO_SCALE);
    return (
      <img
        src={imageSrc}
        alt={shortName}
        width={renderSize}
        height={renderSize}
        className={`object-contain ${className}`}
        style={{
          width: renderSize,
          height: renderSize,
          filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.8))",
        }}
      />
    );
  }

  const shapePath = getShapePath(logo.shape);
  const fillId = getBackgroundFillId(logo.backgroundStyle, gradPrefix);
  const fill =
    logo.backgroundStyle === "solid"
      ? logo.primaryColor
      : `url(#${fillId})`;
  const borderLayers = getBorderLayers(
    logo.borderStyle,
    logo.accentColor,
    gradPrefix
  );

  const viewH = 100;
  const scale = size / 100;
  const totalH = viewH * scale;
  const showIcon = logo.showIcon && logo.icon !== "none";
  const initials = logo.initials || shortName.slice(0, 2).toUpperCase() || "?";
  const iconSize = size * (logo.showInitials && showIcon ? 0.28 : 0.34);
  const iconTop = logo.showInitials && showIcon ? size * 0.17 : size * 0.2;

  return (
    <div
      className={`relative inline-flex flex-col items-center ${className}`}
      style={{
        width: size,
        height: totalH,
        filter:
          "drop-shadow(0 10px 22px rgba(0,0,0,0.78)) drop-shadow(0 4px 8px rgba(0,0,0,0.55))",
      }}
    >
      <svg
        width={size}
        height={viewH * scale}
        viewBox={`0 0 100 ${viewH}`}
        aria-hidden
      >
        <defs>
          <LogoGradientDefs prefix={gradPrefix} logo={logo} />
          <clipPath id={`${gradPrefix}-clip`}>
            <path d={shapePath} />
          </clipPath>
          <radialGradient id={`${gradPrefix}-shine`} cx="32%" cy="18%" r="58%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${gradPrefix}-inner`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        <path
          d={shapePath}
          fill="rgba(0,0,0,0.55)"
          transform="translate(0 3)"
        />

        <path d={shapePath} fill={fill} />

        <path d={shapePath} fill={`url(#${gradPrefix}-shine)`} />

        <rect
          x="0"
          y="42"
          width="100"
          height="58"
          fill={`url(#${gradPrefix}-inner)`}
          clipPath={`url(#${gradPrefix}-clip)`}
        />

        {borderLayers.map((layer, i) => (
          <path
            key={i}
            d={shapePath}
            fill="none"
            stroke={layer.stroke}
            strokeWidth={layer.strokeWidth}
            opacity={layer.opacity ?? 1}
            style={layer.filter ? { filter: layer.filter } : undefined}
          />
        ))}

        {logo.showInitials && !showIcon && (
          <text
            x="50"
            y="54"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={logo.textColor}
            fontSize={initials.length > 1 ? 24 : 30}
            fontWeight="900"
            fontFamily="Arial, Helvetica, sans-serif"
            style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.7))" }}
          >
            {initials}
          </text>
        )}

        {logo.showInitials && showIcon && (
          <text
            x="50"
            y="72"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={logo.textColor}
            fontSize="13"
            fontWeight="800"
            fontFamily="Arial, Helvetica, sans-serif"
            letterSpacing="1.2"
            opacity="0.95"
            style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}
          >
            {initials}
          </text>
        )}
      </svg>

      {showIcon && (
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            top: iconTop,
            width: iconSize,
            height: iconSize,
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.65))",
          }}
        >
          <LogoIcon icon={logo.icon} size={iconSize} color={logo.textColor} />
        </div>
      )}
    </div>
  );
}

export function getTeamLogoDisplaySize(logo: TeamLogo): number {
  return normalizeTeamLogo(logo).displaySize;
}
