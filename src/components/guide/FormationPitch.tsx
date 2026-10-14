import type { Formation, FormationRowRole } from "@/types";

/** Rol renkleri: uygulamadaki diziliş listesiyle aynı (PosterToolbar ROLE_STYLE). */
export const ROLE_COLORS: Record<FormationRowRole, { color: string; label: string; short: string }> = {
  GK: { color: "#fb923c", label: "Kaleci", short: "K" },
  DEF: { color: "#f87171", label: "Defans", short: "D" },
  MID: { color: "#4ade80", label: "Orta saha", short: "O" },
  ATT: { color: "#60a5fa", label: "Forvet", short: "F" },
};

/** Dikey saha şeması: kaleci altta, hücum yukarı (tek takım posteriyle aynı yön). */
export function FormationPitch({ formation, title }: { formation: Formation; title: string }) {
  const rows = formation.rows;
  const dots = rows.flatMap((row, rowIndex) => {
    // Kaleci 122'de, son hat 30'da; aradaki hatlar eşit aralıklı.
    const y = rowIndex === 0 ? 122 : 98 - ((rowIndex - 1) / Math.max(1, rows.length - 2)) * 66;
    return Array.from({ length: row.count }, (_, i) => {
      const spread = row.count === 1 ? 0.5 : i / (row.count - 1);
      const x = row.count === 1 ? 50 : 18 + spread * 64;
      return { key: `${rowIndex}-${i}`, x, y, role: row.role };
    });
  });

  return (
    <svg viewBox="0 0 100 140" role="img" aria-label={title} className="h-auto w-full">
      <rect x="2" y="2" width="96" height="136" rx="4" fill="#14532d" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x="2" y={2 + i * 19.4} width="96" height="9.7" fill="#166534" opacity="0.55" />
      ))}
      <g fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.8">
        <rect x="6" y="6" width="88" height="128" rx="1" />
        <line x1="6" y1="70" x2="94" y2="70" />
        <circle cx="50" cy="70" r="11" />
        <rect x="28" y="6" width="44" height="18" />
        <rect x="28" y="116" width="44" height="18" />
        <rect x="40" y="2.5" width="20" height="3.5" />
        <rect x="40" y="134" width="20" height="3.5" />
      </g>
      {dots.map((d) => (
        <g key={d.key}>
          <circle cx={d.x} cy={d.y} r="6" fill={ROLE_COLORS[d.role].color} stroke="rgba(0,0,0,0.6)" strokeWidth="1" />
          <text
            x={d.x}
            y={d.y + 2.3}
            textAnchor="middle"
            fontSize="6.5"
            fontWeight="800"
            fill="#0a0a0a"
            fontFamily="system-ui, sans-serif"
          >
            {ROLE_COLORS[d.role].short}
          </text>
        </g>
      ))}
    </svg>
  );
}
