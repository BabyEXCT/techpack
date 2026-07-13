export type SizeTotals = Record<string, number>;

export function normalizeSize(size: string) {
  return size.trim().toUpperCase();
}

export function buildSizeTotals(
  rows: Array<{ size?: string | null; qty?: number | null }>
): SizeTotals {
  return rows.reduce<SizeTotals>((acc, row) => {
    const size = row.size ? normalizeSize(row.size) : "";
    if (!size) return acc;
    const qty = typeof row.qty === "number" && Number.isFinite(row.qty) ? row.qty : 1;
    acc[size] = (acc[size] ?? 0) + qty;
    return acc;
  }, {});
}

export function sumSizeTotals(totals: SizeTotals) {
  return Object.values(totals).reduce((sum, value) => sum + value, 0);
}
