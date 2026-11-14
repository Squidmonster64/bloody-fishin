export interface OfficialMarineDay {
  date: string;
  winds: string;
  seas: string;
  swell: string;
  weather: string;
  thunderstorm: boolean;
  windWarning: 'none' | 'strong' | 'gale' | 'storm' | 'hurricane';
  windWarningArea?: string;
}
export interface OfficialMarineZone {
  area: string;
  source: string;
  status: 'available' | 'unavailable';
  issued: string | null;
}
export interface OfficialMarine {
  status: 'available' | 'unavailable' | 'outside-coverage';
  source: string;
  area: string;
  issued: string | null;
  checkedAt: string;
  days: OfficialMarineDay[];
  warningsChecked: boolean;
  zones: OfficialMarineZone[];
}

const PERTH_SOUTH_LAT = -32.65;
const PERTH_NORTH_LAT = -31.45;
const PERTH_LOCAL_WATERS_WEST_LON = 115.49;
const PERTH_LOCAL_WATERS_EAST_LON = 115.78;
const PERTH_COAST_WEST_LON = 115.00;

/** Conservative subset of Perth local waters, inshore of Rottnest. */
export function inPerthWaters(lat: number, lon: number) {
  return lat >= PERTH_SOUTH_LAT && lat <= PERTH_NORTH_LAT
    && lon >= PERTH_LOCAL_WATERS_WEST_LON && lon <= PERTH_LOCAL_WATERS_EAST_LON;
}

/** Conservative subset of Perth Coast offshore of Rottnest. */
export function inPerthCoast(lat: number, lon: number) {
  return lat >= PERTH_SOUTH_LAT && lat <= PERTH_NORTH_LAT
    && lon >= PERTH_COAST_WEST_LON && lon < PERTH_LOCAL_WATERS_WEST_LON;
}
