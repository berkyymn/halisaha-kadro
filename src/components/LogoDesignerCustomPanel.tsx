"use client";

import type { ReactNode } from "react";
import { Shuffle } from "lucide-react";
import { applyLogoPreset, LOGO_PRESETS } from "@/lib/logoPresets";
import type { LogoBackgroundStyle, LogoBorderStyle, LogoShape, TeamLogo } from "@/types";
import { ColorField } from "./JerseyControls";
import { Toggle } from "./Toggle";
import { TeamLogoBadge } from "./TeamLogoBadge";
import { LogoIcon, LOGO_ICON_OPTIONS } from "./logo/LogoIcon";

const EMBLEM_OPTIONS = LOGO_ICON_OPTIONS.filter((o) => o.id !== "none");

const LABEL = "text-[10px] font-bold uppercase tracking-wider text-zinc-500";

const SHAPES: { id: LogoShape; label: string }[] = [
  { id: "shield", label: "Kalkan" },
  { id: "roundedShield", label: "Oval kalkan" },
  { id: "crest", label: "Arma" },
  { id: "circle", label: "Daire" },
  { id: "hexagon", label: "Altıgen" },
  { id: "pentagon", label: "Beşgen" },
  { id: "diamond", label: "Elmas" },
  { id: "esports", label: "Rozet" },
];

const BACKGROUNDS: { id: LogoBackgroundStyle; label: string }[] = [
  { id: "solid", label: "Düz" },
  { id: "gradient", label: "Geçişli" },
  { id: "radial", label: "Işıltılı" },
  { id: "split", label: "İkiye bölünmüş" },
  { id: "verticalStripes", label: "Dikey çizgili" },
  { id: "horizontalStripes", label: "Yatay çizgili" },
];

const BORDERS: { id: LogoBorderStyle; label: string }[] = [
  { id: "single", label: "İnce" },
  { id: "double", label: "Çift" },
  { id: "triple", label: "Üçlü" },
  { id: "chrome", label: "Krom" },
  { id: "gold", label: "Altın" },
  { id: "neon", label: "Neon" },
];

const COLORS = [
  ["Ana renk", "primaryColor"],
  ["İkinci renk", "secondaryColor"],
  ["Kenar vurgusu", "accentColor"],
  ["Sembol ve yazı", "textColor"],
] as const;

/**
 * Kendi logonu tasarla. Her seçenek, o seçenekle çizilmiş küçük bir arma
 * olarak gösterilir. `design` her zaman "generated" moddadır; değişiklikler
 * `onChange` ile taslağa gider.
 */
export function LogoDesignerCustomPanel({
  design,
  shortName,
  onChange,
  onReplace,
  onRandomize,
}: {
  design: TeamLogo;
  shortName: string;
  onChange: (patch: Partial<TeamLogo>) => void;
  onReplace: (logo: TeamLogo) => void;
  onRandomize: () => void;
}) {
  const variant = (patch: Partial<TeamLogo>) => ({ ...design, ...patch });

  return (
    <div className="space-y-4">
      <Section
        title="Hızlı başla"
        action={
          <button
            type="button"
            onClick={onRandomize}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-zinc-800 text-[10px] font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white"
          >
            <Shuffle className="w-3 h-3" />
            Rastgele
          </button>
        }
      >
        <div className="grid grid-cols-5 gap-1.5">
          {LOGO_PRESETS.map((preset) => {
            const logo = applyLogoPreset(preset, design, shortName);
            return (
              <BadgeOption
                key={preset.id}
                label={preset.label}
                logo={{ ...logo, initials: design.initials }}
                shortName={shortName}
                selected={false}
                onClick={() => onReplace({ ...logo, initials: design.initials })}
              />
            );
          })}
        </div>
      </Section>

      <Section
        title="Sembol"
        action={
          <button
            type="button"
            aria-pressed={!design.showIcon}
            onClick={() => onChange({ icon: "none", showIcon: false })}
            className={`h-7 px-2 rounded-md text-[10px] font-semibold transition-colors ${
              !design.showIcon
                ? "bg-green-950/60 text-green-400 ring-1 ring-green-500"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
            }`}
          >
            Sembolsüz
          </button>
        }
      >
        <div className="grid grid-cols-7 gap-1.5">
          {EMBLEM_OPTIONS.map((option) => {
            const selected = design.showIcon && design.icon === option.id;
            return (
              <button
                key={option.id}
                type="button"
                title={option.label}
                aria-label={option.label}
                aria-pressed={selected}
                onClick={() => onChange({ icon: option.id, showIcon: true })}
                className={`flex h-11 items-center justify-center rounded-lg border transition-colors ${
                  selected
                    ? "border-green-500 bg-green-950/40 text-white"
                    : "border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-500 hover:text-white"
                }`}
              >
                <LogoIcon icon={option.id} size={26} color="currentColor" />
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Şekil">
        <div className="grid grid-cols-4 gap-1.5">
          {SHAPES.map((option) => (
            <BadgeOption
              key={option.id}
              label={option.label}
              logo={variant({ shape: option.id })}
              shortName={shortName}
              selected={design.shape === option.id}
              onClick={() => onChange({ shape: option.id })}
            />
          ))}
        </div>
      </Section>

      <Section title="Zemin">
        <div className="grid grid-cols-6 gap-1.5">
          {BACKGROUNDS.map((option) => (
            <BadgeOption
              key={option.id}
              label={option.label}
              logo={variant({ backgroundStyle: option.id, showIcon: false, showInitials: false })}
              shortName={shortName}
              selected={design.backgroundStyle === option.id}
              onClick={() => onChange({ backgroundStyle: option.id })}
            />
          ))}
        </div>
      </Section>

      <Section title="Kenarlık">
        <div className="grid grid-cols-6 gap-1.5">
          {BORDERS.map((option) => (
            <BadgeOption
              key={option.id}
              label={option.label}
              logo={variant({ borderStyle: option.id, showIcon: false, showInitials: false })}
              shortName={shortName}
              selected={design.borderStyle === option.id}
              onClick={() => onChange({ borderStyle: option.id })}
            />
          ))}
        </div>
      </Section>

      <Section title="Renkler">
        <div className="grid grid-cols-2 gap-2">
          {COLORS.map(([label, key]) => (
            <ColorField
              key={key}
              label={label}
              value={design[key]}
              onChange={(value) => onChange({ [key]: value })}
            />
          ))}
        </div>
      </Section>

      <Section title="Baş harfler">
        <div className="flex items-center gap-3">
          <input
            value={design.initials}
            maxLength={3}
            aria-label="Baş harfler"
            onChange={(e) =>
              onChange({ initials: e.target.value.toLocaleUpperCase("tr-TR").slice(0, 3) })
            }
            className="w-20 h-9 bg-zinc-800 border border-zinc-700 rounded-lg px-2 text-sm text-white text-center font-bold uppercase focus:border-green-500 focus:outline-none"
          />
          <div className="flex-1">
            <Toggle
              label="Armada göster"
              checked={design.showInitials}
              onChange={(showInitials) => onChange({ showInitials })}
            />
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className={LABEL}>{title}</p>
        {action}
      </div>
      {children}
    </section>
  );
}

function BadgeOption({
  label,
  logo,
  shortName,
  selected,
  onClick,
}: {
  label: string;
  logo: TeamLogo;
  shortName: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-pressed={selected}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-lg border px-1 pt-2 pb-1.5 transition-colors ${
        selected
          ? "border-green-500 bg-green-950/40"
          : "border-zinc-700 bg-zinc-800/40 hover:border-zinc-500"
      }`}
    >
      <TeamLogoBadge logo={logo} shortName={shortName} size={36} />
      <span
        className={`w-full truncate text-center text-[9px] font-semibold ${
          selected ? "text-green-400" : "text-zinc-400"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
