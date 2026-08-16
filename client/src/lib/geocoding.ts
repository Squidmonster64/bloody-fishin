/**
 * Worldwide place search using Open-Meteo's public geocoding service.
 * Results are coordinates only; a user must still choose a personal spot name
 * before saving it to localStorage.
 */
export interface PlaceMatch {
  name: string;
  lat: number;
  lon: number;
  description: string;
}

export async function findPlaces(query: string): Promise<PlaceMatch[]> {
  const name = query.trim();
  if (name.length < 2) return [];
  const search = async (term: string) => {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", term);
    url.searchParams.set("count", "5");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    const response = await fetch(url);
    if (!response.ok) throw new Error("Place search is unavailable right now.");
    return response.json() as Promise<{ results?: Array<{ name: string; latitude: number; longitude: number; admin1?: string; country?: string }> }>;
  };
  let payload = await search(name);
  if (!payload.results?.length) {
    const simplerName = name.replace(/[\s,]+(?:WA|NSW|VIC|QLD|SA|TAS|NT|ACT|Australia|United States|USA|UK)$/i, "").trim();
    if (simplerName && simplerName !== name) payload = await search(simplerName);
  }

  return (payload.results ?? []).map((result) => ({
    name: result.name,
    lat: result.latitude,
    lon: result.longitude,
    description: [result.name, result.admin1, result.country].filter(Boolean).join(", "),
  }));
}
