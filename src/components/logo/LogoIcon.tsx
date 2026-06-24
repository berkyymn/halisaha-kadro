"use client";

import {
  Bird,
  Cat,
  Crown,
  Flame,
  Shield,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import type { LogoIcon as LogoIconType } from "@/types";

const STROKE = 1.85;

function LucideMark({
  size,
  color,
  children,
}: {
  size: number;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function WolfIcon({ size, color }: { size: number; color: string }) {
  return (
    <LucideMark size={size} color={color}>
      <path d="M8 8 6 4l2 1.5L10 8" />
      <path d="M16 8l2-4-2 1.5L14 8" />
      <path d="M7 15c1.5 3.5 3.5 5.5 5 5.5s3.5-2 5-5.5l-1.5-2.5c-1 1.2-2.4 2-4 2s-3-.8-4-2L7 15z" />
      <circle cx="9.5" cy="12.5" r="0.75" fill={color} stroke="none" />
      <circle cx="14.5" cy="12.5" r="0.75" fill={color} stroke="none" />
    </LucideMark>
  );
}

function BallIcon({ size, color }: { size: number; color: string }) {
  return (
    <LucideMark size={size} color={color}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5 14 8l4.5 1-3.2 3 1 4.5L12 14.5 7.7 16.5l1-4.5L5.5 9 10 8Z" />
    </LucideMark>
  );
}

export function LogoIcon({
  icon,
  size,
  color,
}: {
  icon: LogoIconType;
  size: number;
  color: string;
}) {
  const lucideSize = size;
  const strokeProps = {
    size: lucideSize,
    color,
    strokeWidth: STROKE,
    absoluteStrokeWidth: true,
  };

  switch (icon) {
    case "eagle":
      return <Bird {...strokeProps} />;
    case "lion":
      return <Cat {...strokeProps} />;
    case "wolf":
      return <WolfIcon size={size} color={color} />;
    case "crown":
      return <Crown {...strokeProps} />;
    case "shield":
      return <Shield {...strokeProps} />;
    case "star":
      return <Star {...strokeProps} />;
    case "flame":
      return <Flame {...strokeProps} />;
    case "lightning":
      return <Zap {...strokeProps} fill={color} fillOpacity={0.15} />;
    case "ball":
    case "football":
      return <BallIcon size={size} color={color} />;
    case "trophy":
      return <Trophy {...strokeProps} />;
    default:
      return null;
  }
}

export const LOGO_ICON_OPTIONS: { id: LogoIconType; label: string }[] = [
  { id: "none", label: "Yok" },
  { id: "eagle", label: "Kartal" },
  { id: "lion", label: "Aslan" },
  { id: "wolf", label: "Kurt" },
  { id: "crown", label: "Taç" },
  { id: "shield", label: "Kalkan" },
  { id: "star", label: "Yıldız" },
  { id: "flame", label: "Alev" },
  { id: "lightning", label: "Şimşek" },
  { id: "ball", label: "Top" },
  { id: "trophy", label: "Kupa" },
];
