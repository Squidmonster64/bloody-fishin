import { fetchWithTimeout } from '../shared/http.js';
import { inPerthWaters, type OfficialMarine, type OfficialMarineDay } from '../shared/officialMarine.js';
const source = 'https://www.bom.gov.au/wa/forecasts/perth-waters.shtml';
const area = 'Perth Local Waters — Two Rocks to Dawesville, inshore from Rottnest';
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const clean = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
export function parseOfficialMarine(html: string, now = new Date()): OfficialMarine {
  const issued = clean(html).match(/Forecast issued at (.+?\d{4})\./)?.[1] ?? null;
  const stamp = issued?.match(/(\d{1,2}):(\d{2}) (am|pm) WST on \w+ (\d{1,2}) (\w+) (\d{4})/);
  if (!stamp) throw new Error('BOM issue timestamp missing');
  const month = months.indexOf(stamp[5]);
  const hour = Number(stamp[1]) % 12 + (stamp[3] === 'pm' ? 12 : 0);
  const issuedMs = Date.UTC(Number(stamp[6]), month, Number(stamp[4]), hour - 8, Number(stamp[2]));
  if (month < 0 || now.getTime() - issuedMs > 24 * 3600000 || issuedMs > now.getTime() + 3600000) throw new Error('BOM forecast stale');
  const days: OfficialMarineDay[] = [];
  for (const match of Array.from(html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2|$)/gi))) {
    const title = clean(match[1]);
    const date = title.match(/\w+ (\d{1,2}) (\w+)/);
    let year = Number(stamp[6]), mon = date ? months.indexOf(date[2]) : month;
    if (mon < 0) continue;
    const day = date ? Number(date[1]) : /until midnight/.test(title) ? Number(stamp[4]) : null;
    if (day === null) continue;
    if (mon < month - 6) year++;
    const fields: Record<string, string> = {};
    for (const pair of Array.from(match[2].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi))) fields[clean(pair[1]).toLowerCase()] = clean(pair[2]);
    if (!fields.winds || !fields.weather) continue;
    days.push({date: `${year}-${String(mon+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`, winds: fields.winds, seas: fields.seas ?? '', swell: fields.swell ?? fields['1st swell'] ?? '', weather: fields.weather, thunderstorm: /thunderstorm/i.test(fields.weather)});
  }
  if (!days.length) throw new Error('BOM daily forecast missing');
  return {status: 'available', source, area, issued, checkedAt: now.toISOString(), days};
}
let cached: OfficialMarine | null = null;
export async function getOfficialMarine(lat: number, lon: number): Promise<OfficialMarine> {
  const empty = {source, area, issued: null, checkedAt: new Date().toISOString(), days: []};
  if (!inPerthWaters(lat, lon)) return {...empty, status: 'outside-coverage'};
  if (cached && Date.now() - Date.parse(cached.checkedAt) < 5 * 60000) return cached;
  try {
    const response = await fetchWithTimeout(source, {timeoutMs: 10000});
    if (!response.ok) throw new Error('BOM unavailable');
    cached = parseOfficialMarine(await response.text());
    return cached;
  } catch { return {...empty, status: 'unavailable'}; }
}
