// Shared by the browser (customer import) and the server (public customer form).

/** Collapses runs of whitespace and trims. */
export const clean = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim();

/** Bangladeshi numbers in any common shape (+880 17…, 88017…, 1743…, 017-43…) become 01XXXXXXXXX. */
export function normPhone(raw: string) {
  const s = clean(raw);
  let d = s.replace(/\D/g, "");
  if (d.startsWith("880")) d = d.slice(2);
  else if (d.startsWith("88") && d.length === 13) d = d.slice(2);
  if (d.length === 10 && d.startsWith("1")) d = "0" + d;
  return /^01\d{9}$/.test(d) ? d : s;
}

/** Digits only - two numbers with the same key are the same customer. */
export const phoneKey = (p: string) => normPhone(p).replace(/\D/g, "");
