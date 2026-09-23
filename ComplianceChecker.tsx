'use client';

import { useState } from 'react';
import { assessCompany, type RiskResult } from '@/lib/riskEngine';

const box = 'mt-1 w-full rounded border border-steel px-3 py-2';
type TextKey = 'legalName' | 'country' | 'gstin' | 'iec' | 'udyam';

export default function ComplianceChecker() {
  const [f, setF] = useState({ legalName: '', country: 'IN', gstin: '', iec: '', udyam: '', domainAgeDays: 0, adverse: 0, factory: false });
  const [res, setRes] = useState<RiskResult | null>(null);

  const text = (k: TextKey, label: string) => (
    <label className="text-sm">{label}
      <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={box} />
    </label>
  );

  const run = () =>
    setRes(
      assessCompany(
        {
          legalName: f.legalName, country: f.country, gstin: f.gstin || undefined, iec: f.iec || undefined, udyam: f.udyam || undefined,
          domainAgeDays: f.domainAgeDays, factoryVerified: f.factory, adverseTradeEvents: f.adverse,
        },
        { OFAC: [], UN: [], EU: [] },
      ),
    );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-steel bg-white p-4">
        {text('legalName', 'Legal name')}
        {text('country', 'Country code')}
        {text('gstin', 'GSTIN')}
        {text('iec', 'IEC')}
        {text('udyam', 'Udyam number')}
        <label className="text-sm">Domain age (days)
          <input type="number" value={f.domainAgeDays} onChange={(e) => setF({ ...f, domainAgeDays: Number(e.target.value) })} className={box} />
        </label>
        <label className="text-sm">Adverse trade events
          <input type="number" min={0} value={f.adverse} onChange={(e) => setF({ ...f, adverse: Number(e.target.value) })} className={box} />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" checked={f.factory} onChange={(e) => setF({ ...f, factory: e.target.checked })} /> Factory verified
        </label>
        <button type="button" onClick={run} className="col-span-2 rounded bg-emerald px-4 py-2 font-medium text-navy">Run check</button>
      </div>
      <div className="rounded-lg border border-steel bg-white p-4 text-sm" aria-live="polite">
        {res ? (
          <>
            <p className="text-2xl font-semibold">{res.score}/100 ({res.grade} risk)</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">{res.redFlags.map((r) => <li key={r}>{r}</li>)}</ul>
            <p className="mt-3 text-xs text-maritime">Preview limits: numbers are checked for format only, and no sanctions lists are loaded, so screening always shows clear.</p>
          </>
        ) : (
          <p className="text-maritime">Fill in the company details and select Run check.</p>
        )}
      </div>
    </div>
  );
}
