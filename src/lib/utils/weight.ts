export type WeightUnit = "kg" | "lb";

const POUNDS_PER_KILOGRAM = 2.2046226218;

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function fromKilograms(weightKg: number | null, unit: WeightUnit) {
  if (weightKg === null) return null;
  return unit === "lb" ? round(weightKg * POUNDS_PER_KILOGRAM) : round(weightKg);
}

export function toKilograms(value: number | null, unit: WeightUnit) {
  if (value === null) return null;
  return unit === "lb" ? round(value / POUNDS_PER_KILOGRAM, 4) : round(value, 4);
}

export function formatWeight(weightKg: number | null, unit: WeightUnit) {
  const value = fromKilograms(weightKg, unit);
  if (value === null) return `0 ${unit}`;
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")} ${unit}`;
}
