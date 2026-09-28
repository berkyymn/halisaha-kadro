import type { PosterSnapshot } from "@/lib/posterSnapshot";

/** Bulut kaydı dedup için snapshot parmak izi */
export function fingerprintPosterSnapshot(snapshot: PosterSnapshot): string {
  return JSON.stringify(snapshot);
}
