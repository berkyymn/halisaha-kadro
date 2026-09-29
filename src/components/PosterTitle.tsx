import type { MatchInfo } from "@/types";
import { buildPosterTitleStyles, titleLines } from "@/lib/posterTitleStyles";

/**
 * Başlığın tek çizimi: poster ve düzenleme önizlemesi aynı bileşeni kullanır.
 * Boyutlar `cqw` olduğundan en yakın container (poster ya da önizleme kutusu)
 * genişliğine göre ölçeklenir.
 */
export function PosterTitle({ info }: { info: MatchInfo }) {
  const styles = buildPosterTitleStyles(info);
  const { line1, line2, subtitle } = titleLines(info);

  return (
    // lang="tr": CSS büyük harf dönüşümü Türkçe kuralını kullansın (i → İ), poster dışında da.
    <div lang="tr" className="relative uppercase select-none" style={{ fontFamily: "var(--font-display)" }}>
      {info.titleEffectId === "smoky" && (
        <div
          className="absolute inset-0 -z-10 blur-2xl opacity-40 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,0,0,0.9), transparent)",
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
        {line2 && (
          <span className="whitespace-nowrap" style={styles.line2}>
            {line2}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-[0.4em] whitespace-nowrap" style={styles.subtitle}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
