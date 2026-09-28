"use client";

import { initErrorReporting } from "@/lib/errorReporting";

// Modül yüklenir yüklenmez başlat: ilk render hataları da yakalanır.
initErrorReporting();

export function ErrorReportingInit() {
  return null;
}
