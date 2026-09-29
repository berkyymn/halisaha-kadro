"use client";

import { initErrorReporting } from "@/lib/errorReporting";
import { installChunkRecovery } from "@/lib/chunkRecovery";

// Modül yüklenir yüklenmez başlat: ilk render hataları da yakalanır.
initErrorReporting();
installChunkRecovery();

export function ErrorReportingInit() {
  return null;
}
