export function createGoogleRouteLink(rawOrigin: string, rawDestination: string): string {
  // 1. Raw‑Strings säubern: NBSP entfernen, mehrfachen Whitespace reduzieren, trimmen
  const clean = (s: string) =>
    s
      .replace(/\u00A0/g, ' ')            // NBSP → space
      .replace(/\s+/g, ' ')               // multiple spaces → single
      .trim();

  let origin = clean(rawOrigin);
  let destination = clean(rawDestination);

  // 2. Wenn kein Komma zwischen Straße und Ort, dann versuchen einzufügen
  const ensureComma = (addr: string) =>
    addr.includes(',') ? addr : addr.replace(/(\d+)\s+([A-Za-zÄÖÜäöü])/,
                                             (_, num, rest) => `${num}, ${rest}`);
  origin = ensureComma(origin);
  destination = ensureComma(destination);

  // 3. Für bessere Treffer “, Germany” anhängen, wenn nicht schon drin
  const appendCountry = (addr: string) =>
    /germany/i.test(addr) ? addr : `${addr}, Germany`;
  origin = appendCountry(origin);
  destination = appendCountry(destination);

  // 4. URL‑encode und Link zusammenbauen
  const o = encodeURIComponent(origin);
  const d = encodeURIComponent(destination);
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}`;
}
