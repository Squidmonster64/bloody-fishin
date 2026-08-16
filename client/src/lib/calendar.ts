/** Calendar export for a Sickie window. */
function stamp(date: string, hour: number) {
  const dt = new Date(`${date}T00:00:00Z`);
  dt.setUTCHours(hour, 0, 0, 0);
  return dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function downloadSickieCalendarEvent({
  locationName, timezone, date, startHour, endDate, endHour, description,
}: {
  locationName: string; timezone: string; date: string; startHour: number; endDate: string; endHour: number; description: string;
}) {
  const uid = `bloody-dave-${Date.now()}@fishing-planner`;
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bloody Daves Fishing Planner//EN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${stamp(date, startHour)}Z`,
    `DTSTART;TZID=${timezone}:${stamp(date, startHour)}`,
    `DTEND;TZID=${timezone}:${stamp(endDate, endHour)}`,
    `SUMMARY:${escapeIcs(`Fishing window — ${locationName}`)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `bloody-daves-${date}-fishing-window.ics`;
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
}
