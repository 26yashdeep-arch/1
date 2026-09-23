'use client';

import { useState } from 'react';
import { usePredictiveIntent, type LandedCost } from '@/hooks/usePredictiveIntent';

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

type Form = { hs: string; port: string; weightKg: number; exw: number; freight: number; insuranceRate: number; dutyRate: number; terminal: number };

const FIELDS: [keyof Form, string, 'text' | 'number'][] = [
  ['hs', 'HS code', 'text'],
  ['port', 'Destination port', 'text'],
  ['weightKg', 'Weight (kg)', 'number'],
  ['exw', 'Ex-works price (USD)', 'number'],
  ['freight', 'Freight (USD)', 'number'],
  ['insuranceRate', 'Insurance rate (%)', 'number'],
  ['dutyRate', 'Customs duty (%)', 'number'],
  ['terminal', 'Terminal charges (USD)', 'number'],
];

export default function BuyerEngine({ initialHs }: { initialHs: string }) {
  const { track, quote } = usePredictiveIntent();
  const [f, setF] = useState<Form>({ hs: initialHs, port: '', weightKg: 1000, exw: 5000, freight: 800, insuranceRate: 0.5, dutyRate: 7.5, terminal: 150 });
  const [result, setResult] = useState<LandedCost | null>(null);

  const calculate = () => {
    track({ hs: f.hs, port: f.port || undefined, weightKg: f.weightKg });
    setResult(quote({ exw: f.exw, freight: f.freight, insuranceRate: f.insuranceRate / 100, dutyRate: f.dutyRate / 100, terminal: f.terminal }));
  };

  const rows: [string, number][] = result
    ? [['Ex-works', result.exw], ['Freight', result.freight], ['Insurance', result.insurance], ['Customs duty', result.customs], ['Terminal', result.terminal]]
    : [];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-steel bg-white p-4">
        {FIELDS.map(([key, label, type]) => (
          <label key={key} className="text-sm">{label}
            <input
              type={type}
              value={f[key]}
              onChange={(e) => setF({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
              className="mt-1 w-full rounded border border-steel px-3 py-2"
            />
          </label>
        ))}
        <button type="button" onClick={calculate} className="col-span-2 rounded bg-emerald px-4 py-2 font-medium text-navy">
          Calculate landed cost
        </button>
      </div>
      <div className="rounded-lg border border-steel bg-white p-4" aria-live="polite">
        {result ? (
          <>
            <table className="w-full text-sm">
              <tbody>
                {rows.map(([k, v]) => (
                  <tr key={k} className="border-b border-steel"><td className="py-1">{k}</td><td className="py-1 text-right">{usd(v)}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-lg font-semibold">Total landed cost: {usd(result.total)}</p>
            <p className="text-xs text-maritime">Estimate only. Insurance is charged on 110% of cost plus freight; duty on CIF value.</p>
          </>
        ) : (
          <p className="text-sm text-maritime">Enter your shipment details and select Calculate landed cost.</p>
        )}
      </div>
    </div>
  );
}
