"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { getFormationById } from "@/lib/formations";
import { FORMATION_DEEP_LINK_PARAM } from "@/lib/formationGuide";
import { trackEvent } from "@/lib/analytics";

/**
 * Diziliş rehberindeki "Bu dizilişle kadro kur" bağlantısı (`/?dizilis=7-3-2-1`):
 * formatı ve dizilişi uygular, sonra parametreyi adresten siler (yenileyince
 * tekrar uygulanmasın). AppShell'de çağrılır: yerel kayıt ve ilk bulut yüklemesi
 * bittikten sonra çalışır, bulut kadrosu seçimi ezmez. Araç çubuğundaki
 * format/diziliş seçimiyle aynı eylemleri kullanır: özel oyuncular kaybolmaz.
 */
export function useFormationDeepLink(): void {
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get(FORMATION_DEEP_LINK_PARAM);
    if (!id) return;
    url.searchParams.delete(FORMATION_DEEP_LINK_PARAM);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);

    const formation = getFormationById(id);
    if (!formation) return;
    const state = useAppStore.getState();
    if (state.squadSize !== formation.squadSize) state.setSquadSize(formation.squadSize);
    useAppStore.getState().setHomeFormation(formation.id);
    if (useAppStore.getState().teamMode === "versus") useAppStore.getState().setAwayFormation(formation.id);
    trackEvent("formation_deep_link", { formation_id: formation.id });
  }, []);
}
