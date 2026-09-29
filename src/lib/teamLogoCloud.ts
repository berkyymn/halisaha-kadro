import {
  DEFAULT_AWAY_PRESET_ID,
  DEFAULT_HOME_PRESET_ID,
} from "@/lib/logoImagePresets";
import type { TeamLogo } from "@/types";

export type TeamSide = "home" | "away";

export function defaultPresetIdForSide(side: TeamSide): string {
  return side === "home" ? DEFAULT_HOME_PRESET_ID : DEFAULT_AWAY_PRESET_ID;
}

/** Henüz buluta yüklenmemiş (inline data URL) logo */
export function isUploadLogoWithImage(logo: TeamLogo | undefined): boolean {
  return Boolean(
    logo?.mode === "upload" && logo.imageUrl?.startsWith("data:")
  );
}

/** Kullanılabilir yüklenmiş logo: yerel data URL, Storage indirme URL'si veya Storage yolu */
export function hasUsableUploadLogo(logo: TeamLogo | undefined): boolean {
  return Boolean(
    logo?.mode === "upload" &&
      (logo.imageUrl?.startsWith("data:") ||
        logo.imageUrl?.startsWith("https://") ||
        logo.storagePath)
  );
}

/** Kullanıcı bilinçli seçim yapmış mı (varsayılan preset değil) */
export function isTeamLogoCustomized(
  logo: TeamLogo | undefined,
  side: TeamSide
): boolean {
  if (!logo) return false;
  if (logo.mode === "generated") return true;
  if (hasUsableUploadLogo(logo)) return true;
  if (logo.mode === "preset" && logo.presetId) {
    return logo.presetId !== defaultPresetIdForSide(side);
  }
  return false;
}

/** Buluta kayıt: preset için yalnızca presetId; generated için görsel alanları temizle */
export function slimTeamLogoForCloud(logo: TeamLogo): TeamLogo {
  if (logo.storagePath) {
    const { imageUrl, ...rest } = logo;
    void imageUrl;
    return rest;
  }
  if (logo.mode === "preset" && logo.presetId) {
    const { imageUrl, ...rest } = logo;
    void imageUrl;
    return rest;
  }
  if (logo.mode === "generated") {
    const { presetId, imageUrl, ...rest } = logo;
    void presetId;
    void imageUrl;
    return { ...rest, mode: "generated" };
  }
  return logo;
}

export function fallbackLogoAfterUploadStrip(
  logo: TeamLogo,
  shortName: string
): TeamLogo {
  const { imageUrl, presetId, ...rest } = logo;
  void imageUrl;
  void presetId;
  return {
    ...rest,
    mode: "generated",
    initials: (logo.initials || shortName.slice(0, 2) || "?").toLocaleUpperCase("tr-TR"),
    showInitials: true,
    showIcon: logo.showIcon && logo.icon !== "none",
  };
}

