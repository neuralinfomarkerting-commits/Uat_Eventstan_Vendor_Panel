export interface PriceUnitMaster {
  id: string;
  code: string;
  label: string;
  minValue?: number | null;
  maxValue?: number | null;
  isActive: boolean;
  sortOrder: number;
  requiresHourRange: boolean;
  requiresPersonRange: boolean;
  requiresPieceRange: boolean;
}

export function normalizePriceUnitKey(value?: string | null) {
  return (value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function findPriceUnit(
  units: PriceUnitMaster[],
  value?: string | null,
) {
  const normalized = normalizePriceUnitKey(value);
  return units.find(
    (unit) =>
      normalizePriceUnitKey(unit.code) === normalized ||
      normalizePriceUnitKey(unit.label) === normalized,
  );
}
