import { fetchWithTimeout } from '../shared/http.js';
import {
  inPerthCoast,
  inPerthWaters,
  type OfficialMarine,
  type OfficialMarineDay,
  type OfficialMarineZone,
} from '../shared/officialMarine.js';

const localWaters = {
  source: 'https://www.bom.gov.au/wa/forecasts/perth-waters.shtml',
  area: 'Perth Local Waters — Two Rocks to Dawesville, inshore from Rottnest',
  warningArea: 'Perth Local Waters',
};
const perthCoast = {
  source: 'https://www.bom.gov.au/wa/forecasts/perth-coast.shtml',
  area: 'Perth Coast — Two Rocks to Dawesville, offshore from Rottnest',
  warningArea: 'Perth Coast',
};
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const clean = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const warningLevels = [
  { pattern: /Hurricane Force Wind Warning/i, level: 'hurricane' },
  { pattern: /Storm Force Wind Warning/i, level: 'storm' },
  { pattern: /Gale Warning/i, level: 'gale' },
  { pattern: /Strong Wind Warning/i, level: 'strong' },
] as const;
const warningPriority = { none: 0, strong: 1, gale: 2, storm: 3, hurricane: 4 } as const;

type Zone = typeof localWaters | typeof perthCoast;

function warningInText(text: string, zone: Zone) {
  const found: { level: OfficialMarineDay['windWarning']; weekday: string | null; text: string }[] = [];
  for (const { pattern, level } of warningLevels) {
    for (const match of Array.from(text.matchAll(new RegExp(`${pattern.source}(?:\\s+for\\s+(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday))?(?:\\s+for\\s+([^.;]+))?`, 'gi')))) {
      const namedArea = match[2]?.trim();
      if (namedArea && !namedArea.toLowerCase().includes(zone.warningArea.toLowerCase())) continue;
      found.push({ level, weekday: match[1] ?? null, text: match[0] });
    }
  }
  return found;
}

export function parseOfficialMarine(html: string, zone: Zone, now = new Date()): OfficialMarine {
  const pageText = clean(html);
  const issued = pageText.match(/Forecast issued at (.+?\d{4})\./)?.[1] ?? null;
  const stamp = issued?.match(/(\d{1,2}):(\d{2}) (am|pm) WST on \w+ (\d{1,2}) (\w+) (\d{4})/);
  if (!stamp) throw new Error('BOM issue timestamp missing');
  const month = months.indexOf(stamp[5]);
  const hour = Number(stamp[1]) % 12 + (stamp[3] === 'pm' ? 12 : 0);
  const issuedMs = Date.UTC(Number(stamp[6]), month, Number(stamp[4]), hour - 8, Number(stamp[2]));
  if (month < 0 || now.getTime() - issuedMs > 24 * 3600000 || issuedMs > now.getTime() + 3600000) throw new Error('BOM forecast stale');

  const days: OfficialMarineDay[] = [];
  const sections = Array.from(html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2|$)/gi));
  for (const match of sections) {
    const title = clean(match[1]);
    const date = title.match(/\w+ (\d{1,2}) (\w+)/);
    let year = Number(stamp[6]), mon = date ? months.indexOf(date[2]) : month;
    if (mon < 0) continue;
    const day = date ? Number(date[1]) : /until midnight/i.test(title) ? Number(stamp[4]) : null;
    if (day === null) continue;
    if (mon < month - 6) year++;
    const fields: Record<string, string> = {};
    for (const pair of Array.from(match[2].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi))) {
      fields[clean(pair[1]).toLowerCase()] = clean(pair[2]);
    }
    if (!fields.winds || !fields.weather) continue;
    days.push({
      date: `${year}-${String(mon + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      winds: fields.winds,
      seas: fields.seas ?? '',
      swell: fields.swell ?? fields['1st swell'] ?? '',
      weather: fields.weather,
      thunderstorm: /thunderstorm/i.test(fields.weather),
      windWarning: 'none',
    });
  }
  if (!days.length) throw new Error('BOM daily forecast missing');

  const sectionWarnings = new Set<string>();
  const assignWarning = (day: OfficialMarineDay, level: OfficialMarineDay['windWarning']) => {
    if (warningPriority[level] > warningPriority[day.windWarning]) {
      day.windWarning = level;
      day.windWarningArea = zone.warningArea;
    }
  };
  for (const section of sections) {
    const title = clean(section[1]);
    const match = title.match(/\w+ (\d{1,2}) (\w+)/);
    const sectionDate = match
      ? days.find(day => day.date.endsWith(`-${String(months.indexOf(match[2]) + 1).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`))
      : /until midnight/i.test(title) ? days.find(day => day.date.endsWith(`-${String(Number(stamp[4])).padStart(2, '0')}`)) : undefined;
    if (!sectionDate) continue;
    for (const warning of warningInText(clean(section[2]), zone)) {
      sectionWarnings.add(warning.text);
      assignWarning(sectionDate, warning.level);
    }
  }

  for (const warning of warningInText(pageText, zone)) {
    let targetDays = warning.weekday
      ? days.filter(day => weekdays[new Date(`${day.date}T00:00:00Z`).getUTCDay()] === warning.weekday)
      : sectionWarnings.has(warning.text) ? [] : days;
    if (warning.weekday && targetDays.length === 0) targetDays = days;
    for (const day of targetDays) assignWarning(day, warning.level);
  }

  const zoneResult: OfficialMarineZone = { area: zone.warningArea, source: zone.source, status: 'available', issued };
  return {
    status: 'available',
    source: zone.source,
    area: zone.area,
    issued,
    checkedAt: now.toISOString(),
    days,
    warningsChecked: true,
    zones: [zoneResult],
  };
}

const pageCache = new Map<string, { marine: OfficialMarine; fetchedAt: number }>();
const CACHE_MS = 5 * 60000;

async function getPage(zone: Zone, now: Date): Promise<OfficialMarine> {
  const cached = pageCache.get(zone.source);
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) return cached.marine;
  try {
    const response = await fetchWithTimeout(zone.source, { timeoutMs: 10000 });
    if (!response.ok) throw new Error('BOM unavailable');
    const parsed = parseOfficialMarine(await response.text(), zone, now);
    pageCache.set(zone.source, { marine: parsed, fetchedAt: Date.now() });
    return parsed;
  } catch {
    return {
      status: 'unavailable',
      source: zone.source,
      area: zone.area,
      issued: null,
      checkedAt: now.toISOString(),
      days: [],
      warningsChecked: false,
      zones: [{ area: zone.warningArea, source: zone.source, status: 'unavailable', issued: null }],
    };
  }
}

export function resetOfficialMarineCache() {
  pageCache.clear();
}

function combineDays(pages: OfficialMarine[]): OfficialMarineDay[] {
  const combined = new Map<string, OfficialMarineDay>();
  for (const page of pages) for (const day of page.days) {
    const existing = combined.get(day.date);
    if (!existing) {
      combined.set(day.date, { ...day });
      continue;
    }
    if (warningPriority[day.windWarning] > warningPriority[existing.windWarning]) {
      existing.windWarning = day.windWarning;
      existing.windWarningArea = day.windWarningArea;
    }
    existing.thunderstorm ||= day.thunderstorm;
  }
  return Array.from(combined.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getOfficialMarine(lat: number, lon: number, now = new Date()): Promise<OfficialMarine> {
  const checkedAt = now.toISOString();
  const needsWaters = inPerthWaters(lat, lon);
  const needsCoast = inPerthCoast(lat, lon);
  if (!needsWaters && !needsCoast) {
    return {
      status: 'outside-coverage',
      source: localWaters.source,
      area: localWaters.area,
      issued: null,
      checkedAt,
      days: [],
      warningsChecked: false,
      zones: [],
    };
  }

  const zones = needsCoast ? [localWaters, perthCoast] : [localWaters];
  const pages = await Promise.all(zones.map(zone => getPage(zone, now)));
  const ownPage = pages[needsCoast ? 1 : 0];
  const available = pages.every(page => page.status === 'available');
  return {
    ...ownPage,
    status: available ? 'available' : 'unavailable',
    checkedAt,
    days: combineDays(pages),
    warningsChecked: available,
    zones: pages.flatMap(page => page.zones),
  };
}
