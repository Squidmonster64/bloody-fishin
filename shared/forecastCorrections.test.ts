import { describe, it, expect } from 'vitest';
import { forecastInstant, localHourKey, windArrowRotation } from './forecastTime';
import { rateSL20, isGolden } from './scoring';
describe('offshore forecast regressions', () => {
  it('interprets Perth wall clock independently of server or traveller timezone', () => {
    expect(forecastInstant('2026-09-26T22:00', 'Australia/Perth').toISOString()).toBe('2026-09-26T14:00:00.000Z');
    expect(localHourKey('Australia/Perth', new Date('2026-09-26T14:07Z'))).toBe('2026-09-26T22:00');
    expect(forecastInstant('2026-09-27T00:00', 'Australia/Perth').toISOString()).toBe('2026-09-26T16:00:00.000Z');
    expect(forecastInstant('2026-07-01T12:00', 'America/New_York').toISOString()).toBe('2026-07-01T16:00:00.000Z');
  });
  it('points arrows downwind, including cardinal directions and wraparound', () => {
    expect([0,90,180,270,360].map(windArrowRotation)).toEqual([180,270,0,90,180]);
  });
  it('downgrades calm mean winds for strong gusts and thunderstorms', () => {
    expect(rateSL20(8, .4, 12, .5, .2, 14).label).toBe('Excellent');
    expect(rateSL20(8, .4, 12, .5, .2, 20).label).toBe('Go');
    expect(rateSL20(8, .4, 12, .5, .2, 21).label).toBe('Marginal');
    expect(rateSL20(8, .4, 12, .5, .2, 28).label).toBe('Avoid');
    expect(rateSL20(8, .4, 12, .5, .2, 10, true).label).toBe('Avoid');
    expect(isGolden({windKt:8,swellH:.4,rainProb:0,fishStars:5,daylight:true,gustKt:21})).toBe(false);
  });
});
