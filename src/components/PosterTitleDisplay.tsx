"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { buildPosterTitleStyles } from "@/lib/posterTitleStyles";
import { PosterTitleModal } from "./PosterTitleModal";

export function PosterTitleDisplay() {
  const [open, setOpen] = useState(false);
  const matchInfo = useAppStore((s) => s.matchInfo);
  const styles = buildPosterTitleStyles(matchInfo);

  const line1 = (matchInfo.titleLine1 ?? "").trim() || "DERBİ";
  const line2 = (matchInfo.titleLine2 ?? "").trim() || "GECESİ";
  const subtitle = (matchInfo.titleSubtitle ?? "").trim();

  return (
    <>
      <div
        className="absolute left-1/2 z-30 flex -translate-x-1/2 justify-center pointer-events-none"
        style={{ top: "5%", width: "100%" }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="poster-title-hit group pointer-events-auto cursor-pointer border-0 bg-transparent p-0 text-center outline-none focus-visible:ring-2 focus-visible:ring-green-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-sm"
          style={styles.container}
          title="Başlığı düzenle"
        >
          <div
            className="relative uppercase select-none transition-transform duration-200 group-hover:scale-[1.015] group-active:scale-[0.995]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {matchInfo.titleEffectId === "smoky" && (
              <div
                className="absolute inset-0 -z-10 blur-2xl opacity-40 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,0,0,0.9), transparent)",
                }}
              />
            )}
            <div
              className="flex flex-col items-center justify-center leading-none"
              style={{ fontSize: styles.fontSize }}
            >
              <span className="whitespace-nowrap" style={styles.line1}>
                {line1}
              </span>
              <span className="whitespace-nowrap" style={styles.line2}>
                {line2}
              </span>
            </div>
            {subtitle && (
              <p className="mt-1.5 uppercase" style={styles.subtitle}>
                {subtitle}
              </p>
            )}
          </div>
        </button>
      </div>

      <PosterTitleModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
