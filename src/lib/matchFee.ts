/** Toplam saha ücreti üst sınırı (₺) — yanlış yazımlara karşı */
export const MAX_FEE_TOTAL = 1_000_000;

export function clampFeeTotal(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
  return Math.min(MAX_FEE_TOTAL, Math.max(0, n));
}

export type FeeSplit = {
  goalkeepersPay: boolean;
  /** Yalnızca bu takım öder (tek takım posteri; ör. rakip kendi payını ayrı öder) */
  teamOnly: boolean;
};

/**
 * Ücrete ortak olan kişi sayısı: varsayılan maçtaki iki takımın tüm oyuncuları;
 * `teamOnly` ise yalnızca bir takım. Kaleciler ödemiyorsa takım başına bir kişi düşer.
 */
export function feePayerCount(squadSize: number, split: FeeSplit): number {
  const teams = split.teamOnly ? 1 : 2;
  return Math.max(1, (squadSize - (split.goalkeepersPay ? 0 : 1)) * teams);
}

/** Kişi başı tutar, yukarı yuvarlanmış tam ₺ (eksik kalmasın) */
export function feePerPerson(total: number, squadSize: number, split: FeeSplit): number {
  if (total <= 0) return 0;
  return Math.ceil(total / feePayerCount(squadSize, split));
}

export function formatLira(amount: number): string {
  return `₺${amount.toLocaleString("tr-TR")}`;
}
