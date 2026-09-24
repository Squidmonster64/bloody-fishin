import {it,expect,vi,afterEach} from "vitest";
import {fetchFishingData} from "./fishingEngine";
afterEach(()=>vi.unstubAllGlobals());
it("preserves provider-local midnight when the runtime uses another timezone",async()=>{
 vi.stubGlobal('fetch',async(url:string)=>new Response(JSON.stringify(url.includes('marine-api') ? {hourly:{time:[]}} : {hourly:{time:['2026-09-17T00:00','2026-09-17T07:00'],wind_speed_10m:[8,8]},daily:{time:['2026-09-17'],sunrise:['2026-09-17T06:15'],sunset:['2026-09-17T18:15']}})));
 const data=await fetchFishingData({name:'Perth',lat:-32,lon:115},1,'Australia/Perth');
 expect(data.merged.map(r=>r.hour)).toEqual([0,7]);
 expect(data.merged[0].golden).toBe(false);
});
