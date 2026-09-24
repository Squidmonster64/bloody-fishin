import {it,expect,vi,afterEach} from 'vitest';
import type {Request} from 'express';
import {buildBrief} from './briefing';
import {fetchFishingData,rateSL20} from '../client/src/lib/fishingEngine';
afterEach(()=>vi.unstubAllGlobals());
it('produces identical hourly fishing and boating scores in server brief and full mobile contract',async()=>{
 const time=['2099-09-17T00:00','2099-09-17T06:00','2099-09-17T07:00','2099-09-17T12:00'];
 const weather={timezone:'Australia/Perth',hourly:{time,wind_speed_10m:[8,10,16,22],precipitation_probability:[0,10,30,50]},daily:{time:['2099-09-17'],sunrise:['2099-09-17T06:15'],sunset:['2099-09-17T18:15']}};
 const marine={hourly:{time,wave_height:[.7,.7,.7,.7],swell_wave_height:[.5,.5,.5,.5],swell_wave_period:[12,12,12,12],wind_wave_height:[.2,.2,.2,.2],sea_level_height_msl:[.2,.4,.6,.4]}};
 vi.stubGlobal('fetch',async(url:string)=>new Response(JSON.stringify(url.includes('marine-api')?marine:weather)));
 const data=await fetchFishingData({name:'Perth',lat:-32.06,lon:115.65},1,'Australia/Perth');
 const brief=await buildBrief({query:{spot:'freo',days:'1'}} as unknown as Request);
 expect(brief.upcomingHours).toHaveLength(4);
 for(let i=0;i<4;i++) {
  const row=data.merged[i], hour=brief.upcomingHours[i];
  expect(hour.fishScore).toBe(row.fishScore);
  expect(hour.fishStars).toBe(row.fishStars);
  expect(hour.sl20).toBe(rateSL20(row.windKt,row.swellH,row.swellP,row.waveH,row.windWaveH).label);
  expect(hour.tideRate).toBe(row.tideRate);
 }
});
