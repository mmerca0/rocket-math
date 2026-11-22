/**
 * A new random UUID (v4). Uses crypto.randomUUID where available; falls back
 * to crypto.getRandomValues, which also works on plain-http pages where
 * randomUUID is missing. The server only accepts UUIDs as ids.
 */
export function newId(): string {
  // randomUUID only exists on https (and localhost) pages.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40; // version 4
  b[8] = (b[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(b, (x: number) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
