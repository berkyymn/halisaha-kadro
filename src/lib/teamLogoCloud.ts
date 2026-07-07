import {
  DEFAULT_AWAY_PRESET_ID,
  DEFAULT_HOME_PRESET_ID,
} from "@/lib/logoImagePresets";
import type { TeamLogo, TeamConfig } from "@/types";

export type TeamSide = "home" | "away";

export function defaultPresetIdForSide(side: TeamSide): string {
  return side === "home" ? DEFAULT_HOME_PRESET_ID : DEFAULT_AWAY_PRESET_ID;
}

export function isUploadLogoWithImage(logo: TeamLogo | undefined): boolean {
  return Boolean(
    logo?.mode === "upload" && logo.imageUrl?.startsWith("data:")
  );
}

export function isDefaultTeamPresetLogo(
  logo: TeamLogo | undefined,
  side: TeamSide
): boolean {
  if (!logo) return true;
  return (
    logo.mode === "preset" && logo.presetId === defaultPresetIdForSide(side)
  );
}

/** Kullanıcı bilinçli seçim yapmış mı (varsayılan preset değil) */
export function isTeamLogoCustomized(
  logo: TeamLogo | undefined,
  side: TeamSide
): boolean {
  if (!logo) return false;
  if (logo.mode === "generated") return true;
  if (isUploadLogoWithImage(logo)) return true;
  if (logo.mode === "preset" && logo.presetId) {
    return logo.presetId !== defaultPresetIdForSide(side);
  }
  return false;
}

export function isBrokenUploadLogo(logo: TeamLogo | undefined): boolean {
  return logo?.mode === "upload" && !logo.imageUrl?.startsWith("data:");
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
    initials: (logo.initials || shortName.slice(0, 2) || "?").toUpperCase(),
    showInitials: true,
    showIcon: logo.showIcon && logo.icon !== "none",
  };
}

/** Bulutta eksik / varsayılan logo varsa yerel özelleştirmeyi koru */
export function mergeTeamLogoPreservingLocal(
  local: TeamLogo,
  remote: TeamLogo,
  side: TeamSide,
  preferLocalIfBothCustomized = false
): TeamLogo {
  if (!remoteHasUsableLogo(remote, side) && isTeamLogoCustomized(local, side)) {
    return local;
  }

  if (
    preferLocalIfBothCustomized &&
    isTeamLogoCustomized(local, side) &&
    isTeamLogoCustomized(remote, side)
  ) {
    return local;
  }

  if (!isUploadLogoWithImage(remote) && isUploadLogoWithImage(local)) {
    return { ...remote, mode: "upload", imageUrl: local.imageUrl };
  }

  if (isBrokenUploadLogo(remote)) {
    if (isTeamLogoCustomized(local, side)) return local;
    return fallbackLogoAfterUploadStrip(
      remote,
      local.teamName || remote.teamName
    );
  }

  if (
    isDefaultTeamPresetLogo(remote, side) &&
    isTeamLogoCustomized(local, side)
  ) {
    return local;
  }

  if (
    remote.mode === "preset" &&
    local.mode === "generated" &&
    isTeamLogoCustomized(local, side)
  ) {
    return local;
  }

  return remote;
}

export function shouldPreferLocalTeamBranding(
  local: TeamConfig,
  remote: TeamConfig,
  side: TeamSide
): boolean {
  if (!isTeamLogoCustomized(local.logo, side)) return false;
  const mergedLogo = mergeTeamLogoPreservingLocal(local.logo, remote.logo, side);
  return mergedLogo === local.logo;
}

function remoteHasUsableLogo(logo: TeamLogo, side: TeamSide): boolean {
  if (isTeamLogoCustomized(logo, side)) return true;
  if (isDefaultTeamPresetLogo(logo, side)) return true;
  return logo.mode === "generated";
}

export function countCustomTeamLogos(
  homeLogo: TeamLogo | undefined,
  awayLogo: TeamLogo | undefined
): number {
  let count = 0;
  if (isTeamLogoCustomized(homeLogo, "home")) count += 1;
  if (isTeamLogoCustomized(awayLogo, "away")) count += 1;
  return count;
}
