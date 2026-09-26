import { expect, it } from 'vitest';
import { parseOfficialMarine } from './officialMarine';
import { inPerthWaters } from '../shared/officialMarine';
const html = `<p>Forecast issued at 7:01 pm WST on Saturday 26 September 2026.</p>
<h2>Sunday 27 September</h2><dl><dt>Winds</dt><dd><span>Variable below 10 knots.</span></dd><dt>Seas</dt><dd>Below 1 metre.</dd><dt>Swell</dt><dd>Southwesterly 1 to 1.5 metres.</dd><dt>Weather</dt><dd class="last">The chance of a thunderstorm.</dd></dl>`;
it('reads the official dated outlook and storm risk without changing values', () => {
 const result = parseOfficialMarine(html, new Date('2026-09-26T14:00Z'));
 expect(result.status).toBe('available');
 expect(result.days[0]).toMatchObject({date:'2026-09-27', winds:'Variable below 10 knots.', thunderstorm:true});
});
it('rejects stale or malformed official data', () => {
 expect(() => parseOfficialMarine(html, new Date('2026-09-29T14:00Z'))).toThrow(/stale/);
 expect(() => parseOfficialMarine('<p>Unavailable</p>')).toThrow();
});
it('does not apply Perth local waters forecasts to distant spots', () => {
 expect(inPerthWaters(-32.06,115.65)).toBe(true);
 expect(inPerthWaters(-25.5,113.5)).toBe(false);
 expect(inPerthWaters(-32,115.46)).toBe(false);
});
