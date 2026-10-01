/** Toplam saha ücreti üst sınırı (₺) — yanlış yazımlara karşı */
export const MAX_FEE_TOTAL = 1_000_000;

export function clampFeeTotal(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
  return Math.min(MAX_FEE_TOTAL, Math.max(0, n));
}

/**
 * Ücrete ortak olan kişi sayısı: maçtaki iki takımın tüm oyuncuları (tek takım
 * posterinde de saha iki takımla oynanır); kaleciler ödemiyorsa ikisi düşer.
 */
export function feePayerCount(squadSize: number, goalkeepersPay: boolean): number {
  return Math.max(1, squadSize * 2 - (goalkeepersPay ? 0 : 2));
}

/** Kişi başı tutar, yukarı yuvarlanmış tam ₺ (eksik kalmasın) */
export function feePerPerson(total: number, squadSize: number, goalkeepersPay: boolean): number {
  if (total <= 0) return 0;
  return Math.ceil(total / feePayerCount(squadSize, goalkeepersPay));
}

export function formatLira(amount: number): string {
  return `₺${amount.toLocaleString("tr-TR")}`;
}
