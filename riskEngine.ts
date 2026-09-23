export type Watchlist = 'OFAC' | 'UN' | 'EU';

export interface CompanyProfile {
  legalName: string;
  country: string;
  gstin?: string;
  iec?: string;
  udyam?: string;
  domainAgeDays?: number;
  factoryVerified: boolean;
  adverseTradeEvents: number;
}

export interface RiskCheck {
  name: string;
  passed: boolean;
  points: number;
  max: number;
}

export interface RiskResult {
  score: number;
  grade: 'LOW' | 'MEDIUM' | 'HIGH';
  checks: RiskCheck[];
  redFlags: string[];
  sanctionHits: { list: Watchlist; entry: string; similarity: number }[];
}

const B36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Format + mod-36 checksum. Confirms the number is well-formed, not that it is active: live status needs a GSP/GST API. */
export function isValidGstin(input: string): boolean {
  const s = input.trim().toUpperCase();
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const p = B36.indexOf(s.charAt(i)) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(p / 36) + (p % 36);
  }
  return B36.charAt((36 - (sum % 36)) % 36) === s.charAt(14);
}

export const isValidIec = (v: string) => /^[A-Z0-9]{10}$/.test(v.trim().toUpperCase());
export const isValidUdyam = (v: string) => /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/.test(v.trim().toUpperCase());

const STOP = new Set(['LTD', 'LIMITED', 'PVT', 'PRIVATE', 'LLC', 'INC', 'CO', 'CORP', 'GMBH', 'THE', 'AND']);

const tokens = (name: string): Set<string> =>
  new Set(
    name
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((t) => t && !STOP.has(t)),
  );

function similarity(a: string, b: string): number {
  const x = tokens(a);
  const y = tokens(b);
  if (x.size === 0 || y.size === 0) return 0;
  let shared = 0;
  x.forEach((t) => {
    if (y.has(t)) shared++;
  });
  return shared / (x.size + y.size - shared);
}

/** Fuzzy token-set match against watchlists you load from the official OFAC / UN / EU consolidated files. */
export function screenSanctions(name: string, lists: Record<Watchlist, string[]>, threshold = 0.8) {
  const hits: RiskResult['sanctionHits'] = [];
  (Object.keys(lists) as Watchlist[]).forEach((list) => {
    for (const entry of lists[list]) {
      const s = similarity(name, entry);
      if (s >= threshold) hits.push({ list, entry, similarity: Number(s.toFixed(2)) });
    }
  });
  return hits;
}

export function assessCompany(c: CompanyProfile, lists: Record<Watchlist, string[]>): RiskResult {
  const redFlags: string[] = [];
  const checks: RiskCheck[] = [];
  const add = (name: string, passed: boolean, max: number, ratio = passed ? 1 : 0) =>
    checks.push({ name, passed, max, points: Math.round(max * ratio) });

  const indian = c.country.toUpperCase() === 'IN';
  const gstOk = c.gstin ? isValidGstin(c.gstin) : false;
  const iecOk = c.iec ? isValidIec(c.iec) : false;
  const udyamOk = c.udyam ? isValidUdyam(c.udyam) : false;

  if (indian) {
    add('GSTIN', gstOk, 15);
    add('IEC', iecOk, 10);
    add('Udyam', udyamOk, 10);
    if (c.gstin && !gstOk) redFlags.push('GSTIN fails format/checksum validation');
    if (!c.gstin) redFlags.push('No GSTIN supplied');
    if (!c.iec) redFlags.push('No IEC supplied: cannot export or import directly');
  } else {
    add('Foreign registry ID', Boolean(c.gstin || c.iec), 35, c.gstin || c.iec ? 0.6 : 0);
    redFlags.push('Foreign entity: verify via EORI/VIES, Companies House or CBP');
  }

  const age = c.domainAgeDays ?? 0;
  add('Domain age', age >= 365, 15, Math.min(age / 730, 1));
  if (age < 180) redFlags.push('Domain younger than 180 days');

  add('Factory verification', c.factoryVerified, 20);
  if (!c.factoryVerified) redFlags.push('Physical factory not verified');

  const adverse = Math.max(0, 15 - 5 * c.adverseTradeEvents);
  add('Trade history', c.adverseTradeEvents === 0, 15, adverse / 15);
  if (c.adverseTradeEvents > 0) redFlags.push(`${c.adverseTradeEvents} adverse trade event(s) on record`);

  const sanctionHits = screenSanctions(c.legalName, lists);
  add('Sanctions screening', sanctionHits.length === 0, 15);
  if (sanctionHits.length > 0) redFlags.push('Potential sanctions match: manual compliance review required');

  let score = checks.reduce((n, k) => n + k.points, 0);
  if (sanctionHits.length > 0) score = Math.min(score, 20);
  score = Math.max(0, Math.min(100, score));

  return { score, grade: score >= 75 ? 'LOW' : score >= 50 ? 'MEDIUM' : 'HIGH', checks, redFlags, sanctionHits };
}
