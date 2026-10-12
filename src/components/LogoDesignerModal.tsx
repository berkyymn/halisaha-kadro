"use client";

import { useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Palette, RotateCcw, Shirt, Sparkles, X } from "lucide-react";
import { reportError } from "@/lib/errorReporting";
import { useModalBackdrop } from "@/hooks/useModalBackdrop";
import { trackEvent } from "@/lib/analytics";
import { fileToDataUrl } from "@/lib/fileToDataUrl";
import { compressDataUrl } from "@/lib/imageCompress";
import { defaultAwayLogo, defaultHomeLogo } from "@/lib/defaults";
import { randomizeTeamLogo } from "@/lib/logoRandomize";
import { applyLogoPreset, LOGO_PRESETS } from "@/lib/logoPresets";
import {
  applyLogoImagePreset,
  DEFAULT_AWAY_PRESET_ID,
  DEFAULT_HOME_PRESET_ID,
  getLogoImagePreset,
  type LogoImagePreset,
} from "@/lib/logoImagePresets";
import type { JerseyConfig, TeamLogo } from "@/types";
import { DEFAULT_LOGO_DISPLAY_SIZE, MAX_LOGO_DISPLAY_SIZE, MIN_LOGO_DISPLAY_SIZE } from "@/types";
import { LogoDesignerCustomPanel } from "./LogoDesignerCustomPanel";
import { LogoDesignerPresetPanel } from "./LogoDesignerPresetPanel";
import { JerseyControls } from "./JerseyControls";
import { JerseyIcon } from "./JerseyIcon";
import { TeamLogoBadge } from "./TeamLogoBadge";

export type TeamAppearance = {
  logo: TeamLogo;
  jersey: JerseyConfig;
  shortName: string;
  /** Postere çizilen logo boyutu — iki takım için ortak */
  logoDisplaySize: number;
};

type Tab = "preset" | "design" | "jersey";

const TABS: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: "preset", label: "Hazır logo", icon: Sparkles },
  { id: "design", label: "Tasarla", icon: Palette },
  { id: "jersey", label: "Forma", icon: Shirt },
];

function initialsOf(name: string): string {
  return name.trim().slice(0, 2).toLocaleUpperCase("tr-TR") || "?";
}

/** Tasarım modunda başlangıç: zaten tasarlanmış logo ya da takıma göre bir şablon. */
function designBaseFor(logo: TeamLogo, side: "home" | "away", shortName: string): TeamLogo {
  if (logo.mode === "generated") return logo;
  const template = LOGO_PRESETS[side === "home" ? 0 : 1];
  return { ...applyLogoPreset(template, logo, shortName), initials: initialsOf(shortName) };
}

/**
 * Takım görünümü: logo (hazır / yüklenen / tasarım), forma ve takım adı.
 * Tüm değişiklikler taslakta tutulur; Kaydet ile tek seferde postere uygulanır,
 * Vazgeç ile atılır. Böylece sekmeler arasında gezinmek hiçbir şeyi silmez.
 */
export function LogoDesignerModal({
  open,
  onClose,
  teamSide,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  teamSide: "home" | "away";
  initial: TeamAppearance;
  onSave: (appearance: TeamAppearance) => void;
}) {
  const [draft, setDraft] = useState<TeamAppearance>(initial);
  const [tab, setTab] = useState<Tab>(initial.logo.mode === "generated" ? "design" : "preset");
  const [design, setDesign] = useState<TeamLogo>(() =>
    designBaseFor(initial.logo, teamSide, initial.shortName)
  );
  const [uploadedLogo, setUploadedLogo] = useState<TeamLogo | null>(
    initial.logo.mode === "upload" ? initial.logo : null
  );
  const [applyPresetJersey, setApplyPresetJersey] = useState(true);
  // Telefon (dikey ya da yatay): önizleme küçük şerit, takım adı alanı hemen görünür.
  const compactPreview = useMediaQuery("(max-width: 767px), (orientation: landscape) and (max-height: 520px)");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { backdropProps, panelProps, markFilePickerOpening, clearPickingFile } = useModalBackdrop({
    open,
    onClose,
    busy,
  });

  const patchDraft = (patch: Partial<TeamAppearance>) => setDraft((d) => ({ ...d, ...patch }));

  /** Tasarımdaki her değişiklik logoyu tasarım moduna geçirir. */
  const applyDesign = (next: TeamLogo) => {
    const generated: TeamLogo = { ...next, mode: "generated", presetId: undefined, imageUrl: undefined };
    if (draft.logo.mode !== "generated") trackEvent("logo_generated");
    setDesign(generated);
    patchDraft({ logo: generated });
  };

  const handlePresetSelect = (preset: LogoImagePreset) => {
    trackEvent("logo_preset_selected", { preset_id: preset.id });
    patchDraft({
      logo: applyLogoImagePreset(preset, draft.logo, draft.shortName),
      ...(applyPresetJersey ? { jersey: { ...preset.jersey } } : {}),
    });
  };

  const handleUpload = async (file: File) => {
    setUploadError(null);
    setBusy(true);
    try {
      const rawUrl = await fileToDataUrl(file);
      const imageUrl = await compressDataUrl(rawUrl, {
        maxEdge: 320,
        quality: 0.9,
        // WebP: şeffaf PNG logoların arka planı korunur (JPEG siyaha boyuyordu).
        kind: "cutout",
      });
      trackEvent("logo_uploaded");
      // Yeni görsel: eski Storage yolu artık bu görsele ait değil.
      const uploaded: TeamLogo = {
        ...draft.logo,
        mode: "upload",
        presetId: undefined,
        imageUrl,
        storagePath: undefined,
      };
      setUploadedLogo(uploaded);
      patchDraft({ logo: uploaded });
    } catch (err) {
      reportError(err, "logo", { level: "warning" });
      setUploadError("Logo yüklenemedi. Daha küçük bir görsel dene.");
    } finally {
      setBusy(false);
    }
  };

  const handleNameChange = (value: string) => {
    const shortName = value.toLocaleUpperCase("tr-TR");
    // Baş harfler adla eşleşiyorsa (kullanıcı değiştirmediyse) adla birlikte güncellenir.
    const follow = (logo: TeamLogo) =>
      logo.initials === initialsOf(draft.shortName) ? { ...logo, initials: initialsOf(shortName) } : logo;
    setDesign((d) => follow(d));
    setDraft((d) => ({ ...d, shortName, logo: d.logo.mode === "generated" ? follow(d.logo) : d.logo }));
  };

  const handleResetToDefault = () => {
    const presetId = teamSide === "home" ? DEFAULT_HOME_PRESET_ID : DEFAULT_AWAY_PRESET_ID;
    const base = teamSide === "home" ? defaultHomeLogo : defaultAwayLogo;
    const jersey = getLogoImagePreset(presetId)?.jersey;
    patchDraft({
      logo: { ...base, initials: initialsOf(draft.shortName), teamName: draft.shortName },
      ...(jersey ? { jersey: { ...jersey } } : {}),
    });
    setTab("preset");
  };

  const handleSave = () => {
    trackEvent("logo_designer_saved", { team: teamSide, mode: draft.logo.mode });
    onSave({ ...draft, logo: { ...draft.logo, teamName: draft.shortName } });
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
      {...backdropProps}
    >
      <div
        className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-4xl h-[min(760px,92vh)] shadow-2xl overflow-hidden flex flex-col"
        {...panelProps}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-white">Takım görünümü</h2>
            <p className="text-[10px] text-zinc-500">
              {teamSide === "home" ? "Ev sahibi" : "Deplasman"} · logo, forma ve takım adı
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)] md:grid-rows-1 md:grid-cols-[272px_1fr]">
          <aside className="border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950/60 p-4 flex flex-col gap-4 min-h-0 md:overflow-y-auto max-md:gap-3 max-md:p-3 phone-land:gap-2.5 phone-land:p-3">
            {/* Dar ekranda (telefon) önizleme küçük, yatay şerit: takım adı alanı ekranda kalsın. */}
            <div
              className={`rounded-xl border border-zinc-800 bg-[radial-gradient(ellipse_at_top,rgba(63,63,70,0.55),rgba(9,9,11,0.9)_70%)] flex items-center ${
                compactPreview ? "flex-row justify-center gap-5 p-2" : "flex-col gap-3 p-4"
              }`}
            >
              <div className={`${compactPreview ? "h-[68px]" : "h-[132px]"} flex items-center justify-center`}>
                <TeamLogoBadge logo={draft.logo} shortName={draft.shortName} size={compactPreview ? 64 : 118} />
              </div>
              {!compactPreview && (
                <p
                  className="text-center text-lg leading-none text-white tracking-wide uppercase truncate max-w-full"
                  style={{ fontFamily: "var(--font-display)" }}
                  lang="tr"
                >
                  {draft.shortName || (teamSide === "home" ? "TAKIM A" : "TAKIM B")}
                </p>
              )}
              <JerseyIcon jersey={draft.jersey} number={10} size={compactPreview ? 44 : 64} numberAlign="right" />
            </div>

            <label className="block">
              <span className="text-[11px] font-semibold text-zinc-300">Takım adı</span>
              <input
                value={draft.shortName}
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                placeholder={teamSide === "home" ? "TAKIM A" : "TAKIM B"}
                maxLength={18}
                className="mt-1 w-full h-9 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 text-sm text-white font-bold uppercase tracking-wide focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30"
              />
            </label>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-zinc-300">Postere logo boyutu</span>
                <span className="flex items-center gap-2">
                  {draft.logoDisplaySize !== DEFAULT_LOGO_DISPLAY_SIZE && (
                    <button
                      type="button"
                      onClick={() => patchDraft({ logoDisplaySize: DEFAULT_LOGO_DISPLAY_SIZE })}
                      className="text-[10px] font-semibold text-zinc-400 underline underline-offset-2 hover:text-white"
                    >
                      Varsayılan
                    </button>
                  )}
                  <span className="text-[10px] font-bold text-green-400 tabular-nums">
                    {draft.logoDisplaySize}
                  </span>
                </span>
              </div>
              <input
                type="range"
                min={MIN_LOGO_DISPLAY_SIZE}
                max={MAX_LOGO_DISPLAY_SIZE}
                value={draft.logoDisplaySize}
                onChange={(e) => patchDraft({ logoDisplaySize: Number(e.target.value) })}
                className="w-full accent-green-600 h-1"
              />
              <p className="mt-1 text-[10px] text-zinc-500">İki takımın logosu için ortaktır.</p>
            </div>
          </aside>

          <section className="flex flex-col min-h-0">
            <div className="shrink-0 px-4 pt-3 pb-2">
              <div className="flex gap-1 p-1 rounded-lg bg-zinc-950 border border-zinc-800" role="tablist">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    className={`flex-1 h-8 rounded-md text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      tab === id ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-1">
              {tab === "preset" && (
                <LogoDesignerPresetPanel
                  logo={draft.logo}
                  uploadedLogo={uploadedLogo}
                  applyPresetJersey={applyPresetJersey}
                  onApplyPresetJerseyChange={setApplyPresetJersey}
                  onSelectPreset={handlePresetSelect}
                  onSelectUploaded={() => uploadedLogo && patchDraft({ logo: uploadedLogo })}
                  onFilePickerOpen={markFilePickerOpening}
                  onFilePickerClose={clearPickingFile}
                  onUpload={handleUpload}
                  uploadError={uploadError}
                />
              )}
              {tab === "design" && (
                <>
                  {draft.logo.mode !== "generated" && (
                    <p className="mb-3 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-[11px] text-zinc-300 leading-relaxed">
                      Şu an {draft.logo.mode === "upload" ? "yüklediğin" : "hazır"} logo kullanılıyor.
                      Aşağıdan bir seçim yaptığında kendi tasarımına geçersin; Vazgeç ile her şey geri alınır.
                    </p>
                  )}
                  <LogoDesignerCustomPanel
                    design={design}
                    shortName={draft.shortName}
                    onChange={(patch) => applyDesign({ ...design, ...patch })}
                    onReplace={applyDesign}
                    onRandomize={() => {
                      trackEvent("logo_randomized");
                      applyDesign(randomizeTeamLogo(design, draft.shortName));
                    }}
                  />
                </>
              )}
              {tab === "jersey" && (
                <>
                  {draft.logo.mode === "generated" && (
                    <button
                      type="button"
                      onClick={() => {
                        trackEvent("jersey_from_logo");
                        patchDraft({
                          jersey: {
                            ...draft.jersey,
                            primaryColor: draft.logo.primaryColor,
                            secondaryColor: draft.logo.secondaryColor,
                            numberColor: draft.logo.textColor,
                          },
                        });
                      }}
                      className="mb-4 w-full flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-left hover:border-zinc-500"
                    >
                      <TeamLogoBadge logo={draft.logo} shortName={draft.shortName} size={30} />
                      <span className="text-[11px] text-zinc-300">
                        <span className="font-semibold text-white">Logonun renklerini kullan</span>
                        <span className="block text-zinc-500">Forma renkleri ve numara rengi logoya uyar</span>
                      </span>
                    </button>
                  )}
                  <JerseyControls jersey={draft.jersey} onChange={(jersey) => patchDraft({ jersey })} />
                </>
              )}
            </div>
          </section>
        </div>

        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800"
            title="Logo ve formayı takımın varsayılanına döndür"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Varsayılana dön
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="h-9 px-5 rounded-lg bg-green-600 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-50"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
