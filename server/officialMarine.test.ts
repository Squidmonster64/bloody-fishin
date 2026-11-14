import { readFileSync } from 'node:fs';
import { beforeEach, expect, it, vi } from 'vitest';
import { applyOfficialMarineWarning, assessHour } from '../shared/scoring';
import { inPerthCoast, inPerthWaters } from '../shared/officialMarine';
import { getOfficialMarine, parseOfficialMarine, resetOfficialMarineCache } from './officialMarine';

const now = new Date('2026-11-14T06:00:00Z');
const coastSource = 'https://www.bom.gov.au/wa/forecasts/perth-coast.shtml';
const watersSource = 'https://www.bom.gov.au/wa/forecasts/perth-waters.shtml';
const coastZone = {
  source: coastSource,
  area: 'Perth Coast — Two Rocks to Dawesville, offshore from Rottnest',
  warningArea: 'Perth Coast',
};
const watersZone = {
  source: watersSource,
  area: 'Perth Local Waters — Two Rocks to Dawesville, inshore from Rottnest',
  warningArea: 'Perth Local Waters',
};
const coastHtml = readFileSync(new URL('./fixtures/bom/perth-coast-2026-11-14-strong-wind.html', import.meta.url), 'utf8');
const watersHtml = readFileSync(new URL('./fixtures/bom/perth-waters-2026-11-14-strong-wind-current.html', import.meta.url), 'utf8');
const baseline = {
  windKt: 9, gustKt: 12, windDirDeg: 90, swellH: 1.1, swellP: 11,
  waveH: 1.4, windWaveH: 0.3, thunderstorm: false, daylight: true,
};

beforeEach(() => {
  resetOfficialMarineCache();
  vi.unstubAllGlobals();
});

it('reads the real Perth Coast warning only for Saturday', () => {
  const result = parseOfficialMarine(coastHtml, coastZone, now);
  expect(result).toMatchObject({ warningsChecked: true, days: expect.arrayContaining([
    expect.objectContaining({ date: '2026-11-14', windWarning: 'strong', windWarningArea: 'Perth Coast' }),
    expect.objectContaining({ date: '2026-11-15', windWarning: 'none' }),
    expect.objectContaining({ date: '2026-11-16', windWarning: 'none' }),
    expect.objectContaining({ date: '2026-11-17', windWarning: 'none' }),
  ]) });
});

it('does not count the generic warnings link or a warning for another area', () => {
  const local = parseOfficialMarine(watersHtml, watersZone, now);
  expect(local.days.every(day => day.windWarning === 'none')).toBe(true);
  expect(local.warningsChecked).toBe(true);
  const wrongArea = parseOfficialMarine(coastHtml, watersZone, now);
  expect(wrongArea.days.every(day => day.windWarning === 'none')).toBe(true);
});

it('finds a warning in the named day section and applies an unmapped warning to every day', () => {
  const withSundayGale = coastHtml.replace(
    '<h2>Sunday 15 November</h2>',
    '<h2>Sunday 15 November</h2><p class="marine warning">Gale Warning for Sunday for Perth Coast</p>',
  );
  const gale = parseOfficialMarine(withSundayGale, coastZone, now);
  expect(gale.days.find(day => day.date === '2026-11-15')?.windWarning).toBe('gale');

  const withLocalStrong = watersHtml.replace(
    '<h2>Forecast for Saturday until midnight</h2>',
    '<h2>Forecast for Saturday until midnight</h2><p class="marine warning">Strong Wind Warning for Saturday for Perth Local Waters</p>',
  );
  expect(parseOfficialMarine(withLocalStrong, watersZone, now).days[0].windWarning).toBe('strong');

  const unknownDate = coastHtml.replace(
    '<p class="marine warning">Strong Wind Warning for Saturday for Perth Coast</p>',
    '',
  ).replace(
    '<h2>Weather Situation</h2>',
    '<p class="marine warning">Strong Wind Warning</p><h2>Weather Situation</h2>',
  );
  const allDays = parseOfficialMarine(unknownDate, coastZone, now);
  expect(allDays.days.every(day => day.windWarning === 'strong')).toBe(true);
});

it('keeps clear forecasts at none and rejects stale or malformed data', () => {
  const html = `<p>Forecast issued at 7:01 pm WST on Saturday 26 September 2026.</p>
    <h2>Sunday 27 September</h2><dl><dt>Winds</dt><dd>Variable below 10 knots.</dd>
    <dt>Weather</dt><dd>Fine.</dd></dl>`;
  const result = parseOfficialMarine(html, coastZone, new Date('2026-09-26T14:00Z'));
  expect(result.days[0]).toMatchObject({ date: '2026-09-27', thunderstorm: false, windWarning: 'none' });
  expect(result.warningsChecked).toBe(true);
  expect(() => parseOfficialMarine(html, coastZone, new Date('2026-09-29T14:00Z'))).toThrow(/stale/);
  expect(() => parseOfficialMarine('<p>Unavailable</p>', coastZone)).toThrow();
});

it('applies warning overrides and the unchecked-warning cap to calls', () => {
  const baseCall = assessHour(baseline);
  expect(applyOfficialMarineWarning(baseCall, 'strong', true)).toMatchObject({
    state: 'outside', legacy: { label: 'Avoid' }, reasons: ['warning'],
  });
  expect(applyOfficialMarineWarning(baseCall, 'gale', true)).toMatchObject({
    state: 'outside', reasons: ['warning'],
  });
  expect(applyOfficialMarineWarning(baseCall, 'none', false)).toMatchObject({
    state: 'marginal', legacy: { label: 'Marginal' }, reasons: ['warning-unchecked'],
  });
});

it('uses separate inshore and Rottnest Coast coverage boxes', () => {
  expect(inPerthWaters(-31.999, 115.543)).toBe(true);
  expect(inPerthWaters(-32, 115.46)).toBe(false);
  expect(inPerthCoast(-31.998, 115.467)).toBe(true);
  expect(inPerthCoast(-32.06, 115.65)).toBe(false);
});

it('reads Local Waters only inshore and both pages for Rottnest West', async () => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    return {
      ok: true,
      text: async () => url === coastSource ? coastHtml : watersHtml,
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);

  const thomsonBay = await getOfficialMarine(-31.999, 115.543, now);
  expect(thomsonBay.status).toBe('available');
  expect(thomsonBay.warningsChecked).toBe(true);
  expect(thomsonBay.days.find(day => day.date === '2026-11-14')?.windWarning).toBe('none');
  expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([watersSource]);

  resetOfficialMarineCache();
  fetchMock.mockClear();
  const rottnestWest = await getOfficialMarine(-31.998, 115.467, now);
  expect(rottnestWest.status).toBe('available');
  expect(rottnestWest.zones).toHaveLength(2);
  expect(rottnestWest.days.find(day => day.date === '2026-11-14')).toMatchObject({
    windWarning: 'strong', windWarningArea: 'Perth Coast',
  });
  expect(fetchMock.mock.calls.map(([url]) => String(url)).sort()).toEqual([coastSource, watersSource].sort());
  expect(fetchMock.mock.calls.length).toBe(2);
});

it('fails closed when a needed page is unavailable and does not fetch outside coverage', async () => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    return url === coastSource
      ? { ok: false, text: async () => '' } as Response
      : { ok: true, text: async () => watersHtml } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  const incomplete = await getOfficialMarine(-31.998, 115.467, now);
  expect(incomplete.status).toBe('unavailable');
  expect(incomplete.warningsChecked).toBe(false);
  expect(incomplete.zones).toHaveLength(2);

  fetchMock.mockClear();
  const outside = await getOfficialMarine(4.17, 73.51, now);
  expect(outside).toMatchObject({ status: 'outside-coverage', warningsChecked: false, zones: [] });
  expect(fetchMock).not.toHaveBeenCalled();
});
