import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchFishingData } from './fishingEngine';
import { buildBrief } from '../../../server/briefing';
import type { Request } from 'express';
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('provider coordinates, units and time alignment', () => {
 it('uses coastal weather plus offshore wind/marine consistently in browser and brief', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-26T14:07Z'));
  const time = ['2026-09-26T14:00','2026-09-26T22:00','2026-09-26T23:00','2026-09-27T00:00'];
  const weather = {latitude:-32.09139,longitude:115.760864,timezone:'Australia/Perth',hourly:{time,temperature_2m:[21,16,15,14],precipitation_probability:[0,0,0,0],precipitation:[0,0,0,0],weather_code:[0,0,0,0]},daily:{time:['2026-09-26','2026-09-27'],sunrise:['2026-09-26T06:01','2026-09-27T06:00'],sunset:['2026-09-26T18:15','2026-09-27T18:16']}};
  const wind = {latitude:-32.09139,longitude:115.65217,timezone:'Australia/Perth',hourly:{time,wind_speed_10m:[12,18,19,13],wind_direction_10m:[90,180,270,0],wind_gusts_10m:[15,26,29,18]}};
  const marine = {latitude:-32.0833,longitude:115.6667,hourly:{time,wave_height:[1,1,1,1],swell_wave_height:[.5,.5,.5,.5],swell_wave_period:[12,12,12,12],wind_wave_height:[.3,.3,.3,.3]}};
  const calls: URL[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
   const url = new URL(input, 'https://weather.bloodydaves.com');
   if(url.hostname.includes('open-meteo')) {
    calls.push(url);
    if(url.hostname.startsWith('marine-')) return new Response(JSON.stringify(marine));
    return new Response(JSON.stringify(url.searchParams.get('hourly')?.includes('wind_speed_10m') ? wind : weather));
   }
   return new Response(JSON.stringify({status:'unavailable',days:[]}),{status:200});
  }));
  const app = await fetchFishingData({name:'Fremantle Offshore',lat:-32.06,lon:115.65},8,'Australia/Perth');
  const brief = await buildBrief({query:{spot:'freo',days:'8'}} as unknown as Request);
  expect(calls).toHaveLength(6);
  for(const url of calls) {
   expect(url.searchParams.get('latitude')).toBe('-32.06');
   expect(url.searchParams.get('longitude')).toBe('115.65');
   const isCoastalWeather = !url.hostname.startsWith('marine-') && url.searchParams.get('hourly')?.includes('temperature_2m');
   expect(url.searchParams.get('cell_selection')).toBe(isCoastalWeather ? 'land' : 'sea');
   if(url.searchParams.get('hourly')?.includes('wind_speed_10m')) expect(url.searchParams.get('wind_speed_unit')).toBe('kn');
  }
  expect(app.merged.map(r=>r.hour)).toEqual([14,22,23,0]);
  expect(brief.upcomingHours.map(r=>r.time)).toEqual(['2026-09-26 22:00','2026-09-26 23:00','2026-09-27 00:00']);
  expect(brief.upcomingHours.map(r=>r.sl20)).toEqual(['Marginal','Avoid','Go']);
  expect(app.merged.slice(1).map(r=>r.slRank)).toEqual([1,0,2]);
  expect(brief.providerGrid.weather).toEqual(app.providerGrid?.weather);
  expect(brief.providerGrid.wind).toEqual(app.providerGrid?.wind);
  expect(app.merged.map(r=>r.temp)).toEqual([21,16,15,14]);
  expect(app.merged.map(r=>r.windKt)).toEqual([12,18,19,13]);
 });
});
