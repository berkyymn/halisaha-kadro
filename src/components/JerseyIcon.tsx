import { useId } from "react";
import type { JerseyConfig } from "@/types";

interface JerseyIconProps {
  jersey: JerseyConfig;
  number?: number;
  size?: number;
  className?: string;
  clipId?: string;
  /** Kart görünümünde numarayı sağ göğüse alır */
  numberAlign?: "center" | "right";
}

/** Tişört silueti — kısa kollu, yaka detaylı */
function tShirtPath(w: number, h: number) {
  const cx = w / 2;
  const neckW = w * 0.24;
  const neckD = h * 0.055;
  const shoulderY = h * 0.13;
  const sleeveOut = w * 0.1;
  const sleeveBot = h * 0.27;
  const bodyBot = h * 0.97;

  return `
    M ${cx - neckW / 2} ${neckD}
    Q ${cx} ${neckD * 0.15} ${cx + neckW / 2} ${neckD}
    L ${w * 0.71} ${shoulderY}
    L ${w + sleeveOut} ${sleeveBot}
    L ${w * 0.77} ${h * 0.33}
    L ${w * 0.81} ${bodyBot}
    L ${w * 0.19} ${bodyBot}
    L ${w * 0.23} ${h * 0.33}
    L ${-sleeveOut} ${sleeveBot}
    L ${w * 0.29} ${shoulderY}
    Z
  `;
}

function JerseyFill({
  jersey,
  size,
  h,
  clip,
}: {
  jersey: JerseyConfig;
  size: number;
  h: number;
  clip: string;
}) {
  const { style, primaryColor, secondaryColor } = jersey;

  const stripes = (vertical: boolean, wide = false) => {
    const count = wide ? 4 : 5;
    return Array.from({ length: count }, (_, i) => (
      <rect
        key={i}
        x={vertical ? (i * size) / count : 0}
        y={vertical ? 0 : (i * h) / count}
        width={vertical ? size / count : size}
        height={vertical ? h : h / count}
        fill={i % 2 === 0 ? primaryColor : secondaryColor}
      />
    ));
  };

  return (
    <g clipPath={`url(#${clip})`}>
      {style === "solid" && (
        <rect x={-size * 0.1} width={size * 1.2} height={h} fill={primaryColor} />
      )}
      {style === "vertical_stripes" && stripes(true)}
      {style === "wide_vertical_stripes" && stripes(true, true)}
      {style === "horizontal_stripes" && stripes(false)}
      {style === "split" && (
        <>
          <rect x={-size * 0.1} width={size * 0.6} height={h} fill={primaryColor} />
          <rect x={size * 0.5} width={size * 0.6} height={h} fill={secondaryColor} />
        </>
      )}
      {style === "sash" && (
        <>
          <rect x={-size * 0.1} width={size * 1.2} height={h} fill={primaryColor} />
          <polygon
            points={`${-size * 0.1},0 ${size * 0.35},0 ${-size * 0.1},${size * 0.55}`}
            fill={secondaryColor}
          />
          <polygon
            points={`${size * 1.1},${h} ${size * 0.65},${h} ${size * 1.1},${size * 0.65}`}
            fill={secondaryColor}
          />
        </>
      )}
    </g>
  );
}

export function JerseyIcon({
  jersey,
  number,
  size = 48,
  className = "",
  clipId,
  numberAlign = "center",
}: JerseyIconProps) {
  const autoId = useId();
  const clip = clipId ?? autoId;
  const { numberColor } = jersey;
  const h = size * 1.15;
  const shirtPath = tShirtPath(size, h);
  const numX = numberAlign === "right" ? size * 0.68 : size / 2;

  return (
    <svg
      width={size}
      height={h}
      viewBox={`${-size * 0.1} 0 ${size * 1.2} ${h}`}
      className={className}
    >
      <defs>
        <clipPath id={clip}>
          <path d={shirtPath} />
        </clipPath>
      </defs>
      <JerseyFill jersey={jersey} size={size} h={h} clip={clip} />
      <path
        d={shirtPath}
        fill="none"
        stroke="rgba(0,0,0,0.3)"
        strokeWidth={size * 0.018}
      />
      {number !== undefined && (
        <text
          x={numX}
          y={h * 0.58}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={numberColor}
          fontSize={size * 0.36}
          fontWeight="bold"
          fontFamily="Arial, sans-serif"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
        >
          {number}
        </text>
      )}
    </svg>
  );
}

/** Boş kafa — foto yokken gölge siluet */
export function HeadSilhouette({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <linearGradient id="head-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#52525b" />
          <stop offset="100%" stopColor="#27272a" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="42" rx="30" ry="34" fill="url(#head-grad)" opacity="0.85" />
      <ellipse cx="50" cy="88" rx="22" ry="8" fill="#27272a" opacity="0.5" />
    </svg>
  );
}
