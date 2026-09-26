/** Provider timestamps are wall-clock values in the requested forecast timezone. */
export function localHourKey(timezone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (key: string) => parts.find(p => p.type === key)!.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:00`;
}
export function forecastInstant(local: string, timezone: string): Date {
  const target = Date.parse(`${local.slice(0, 16)}:00Z`);
  let instant = target;
  for (let i = 0; i < 3; i++) {
    const displayed = Date.parse(`${localHourKey(timezone, new Date(instant))}:00Z`);
    instant += target - displayed;
  }
  return new Date(instant);
}
/** Meteorological bearings describe where wind comes FROM; arrows point TO. */
export function windArrowRotation(from: number): number { return ((from + 180) % 360 + 360) % 360; }
