import type {
  LogoBackgroundStyle,
  LogoBorderStyle,
  LogoIcon,
  LogoShape,
  TeamLogo,
} from "@/types";

const SHAPES: LogoShape[] = [
  "shield",
  "crest",
  "roundedShield",
  "circle",
  "hexagon",
  "pentagon",
  "diamond",
  "esports",
];

const BORDERS: LogoBorderStyle[] = [
  "chrome",
  "gold",
  "double",
  "triple",
  "neon",
  "single",
];

const BACKGROUNDS: LogoBackgroundStyle[] = [
  "verticalStripes",
  "horizontalStripes",
  "split",
  "gradient",
  "radial",
  "solid",
];

const ICONS: LogoIcon[] = [
  "eagle",
  "lion",
  "wolf",
  "crown",
  "shield",
  "star",
  "lightning",
  "flame",
  "ball",
  "trophy",
];

const PALETTES = [
  {
    primary: "#1e3a8a",
    secondary: "#0f172a",
    accent: "#facc15",
    text: "#fef9c3",
  },
  {
    primary: "#dc2626",
    secondary: "#450a0a",
    accent: "#fbbf24",
    text: "#ffffff",
  },
  {
    primary: "#111827",
    secondary: "#374151",
    accent: "#e5e7eb",
    text: "#f9fafb",
  },
  {
    primary: "#7f1d1d",
    secondary: "#1e3a8a",
    accent: "#93c5fd",
    text: "#ffffff",
  },
  {
    primary: "#166534",
    secondary: "#052e16",
    accent: "#86efac",
    text: "#ecfdf5",
  },
  {
    primary: "#581c87",
    secondary: "#1e1b4b",
    accent: "#fbbf24",
    text: "#fef3c7",
  },
  {
    primary: "#ea580c",
    secondary: "#0a0a0a",
    accent: "#fdba74",
    text: "#fff7ed",
  },
  {
    primary: "#0891b2",
    secondary: "#164e63",
    accent: "#67e8f9",
    text: "#ecfeff",
  },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function randomizeTeamLogo(
  current: TeamLogo,
  shortName: string
): TeamLogo {
  const palette = pick(PALETTES);
  const icon = pick(ICONS);
  const showIcon = Math.random() > 0.15;

  return {
    ...current,
    mode: "generated",
    imageUrl: undefined,
    shape: pick(SHAPES),
    borderStyle: pick(BORDERS),
    backgroundStyle: pick(BACKGROUNDS),
    primaryColor: palette.primary,
    secondaryColor: palette.secondary,
    accentColor: palette.accent,
    textColor: palette.text,
    icon: showIcon ? icon : "none",
    showIcon,
    showInitials: Math.random() > 0.25,
    initials: shortName.slice(0, 2).toUpperCase() || "??",
    teamName: shortName,
    showTeamName: false,
  };
}
