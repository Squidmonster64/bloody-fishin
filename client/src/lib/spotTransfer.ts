import type { MySpot } from "../hooks/useMySpots";
import { validateCoordinates } from "@shared/http";

export function exportSpots(spots: MySpot[]): string {
  return JSON.stringify({version: 1, product: "Bloody Fishin", spots}, null, 2);
}
export function importSpots(text: string, existing: MySpot[]): MySpot[] {
  const parsed = JSON.parse(text);
  const incoming = Array.isArray(parsed) ? parsed : parsed.version === 1 ? parsed.spots : null;
  if (!Array.isArray(incoming) || incoming.length > 1000) throw new Error("Choose a Bloody Fishin spots export (up to 1,000 spots).");
  const next = [...existing];
  for (const entry of incoming) {
    if (!entry || typeof entry.name !== "string" || !entry.name.trim() || typeof entry.lat !== "number" || typeof entry.lon !== "number" || validateCoordinates(entry.lat, entry.lon)) throw new Error("The export contains an invalid spot. Nothing was imported.");
    if (next.some(s => Math.abs(s.lat-entry.lat)<0.00005 && Math.abs(s.lon-entry.lon)<0.00005)) continue;
    next.push({id: `spot_${crypto.randomUUID()}`, name: entry.name.slice(0,120), lat: entry.lat, lon: entry.lon, savedAt: new Date().toISOString(), notes: typeof entry.notes === "string" ? entry.notes.slice(0,10000) : undefined});
  }
  return next;
}
