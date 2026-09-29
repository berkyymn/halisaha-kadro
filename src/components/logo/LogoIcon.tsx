import { EMBLEM_VIEWBOX, EMBLEMS } from "@/lib/logoEmblems.generated";
import { normalizeLogoIcon } from "@/lib/logoUtils";
import type { LogoIcon as LogoIconType } from "@/types";

const PATHS_BY_ID = new Map(EMBLEMS.map((e) => [e.id as LogoIconType, e.paths]));

/** Arma sembolü: dolgu siluet (game-icons.net, CC BY 3.0). */
export function LogoIcon({
  icon,
  size,
  color,
}: {
  icon: LogoIconType;
  size: number;
  color: string;
}) {
  const paths = PATHS_BY_ID.get(normalizeLogoIcon(icon));
  if (!paths) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${EMBLEM_VIEWBOX} ${EMBLEM_VIEWBOX}`}
      fill={color}
      aria-hidden
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export const LOGO_ICON_OPTIONS: { id: LogoIconType; label: string }[] = [
  { id: "none", label: "Yok" },
  ...EMBLEMS.map((e) => ({ id: e.id as LogoIconType, label: e.label })),
];
