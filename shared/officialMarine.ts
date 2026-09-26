export interface OfficialMarineDay {
  date: string;
  winds: string;
  seas: string;
  swell: string;
  weather: string;
  thunderstorm: boolean;
}
export interface OfficialMarine {
  status: 'available' | 'unavailable' | 'outside-coverage';
  source: string;
  area: string;
  issued: string | null;
  checkedAt: string;
  days: OfficialMarineDay[];
}
/** Conservative subset of Perth local waters, inshore of Rottnest. */
export function inPerthWaters(lat: number, lon: number) {
  return lat >= -32.65 && lat <= -31.45 && lon >= 115.55 && lon <= 115.78;
}
