/** Provider precipitation includes rain, showers and snow water equivalent. */
export function precipitationMm(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function precipitationTotal(values: Array<number | null | undefined>): number | null {
  if (!values.length || values.some(value => precipitationMm(value) === null)) return null;
  return Math.round(values.reduce<number>((sum, value) => sum + value!, 0) * 100) / 100;
}
