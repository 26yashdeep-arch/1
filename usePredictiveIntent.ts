'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const KEY = 'gyd:intent:v1';
const WINDOW_MS = 10 * 60 * 1000;

export interface IntentEvent {
  t: number;
  hs: string;
  port?: string;
  weightKg?: number;
}

export interface LandedCostInput {
  exw: number;
  freight: number;
  insuranceRate: number;
  dutyRate: number;
  terminal: number;
}

export interface LandedCost {
  exw: number;
  freight: number;
  insurance: number;
  cif: number;
  customs: number;
  terminal: number;
  total: number;
}

export interface IntentScore {
  score: number;
  level: 'COLD' | 'WARM' | 'SURGE';
  topHs?: string;
}

/** Total Landed Cost = P_exw + C_freight + C_insurance + T_customs(HS) + S_terminal (insurance on 110% of cost+freight; duty on CIF). */
export function computeLandedCost(i: LandedCostInput): LandedCost {
  const base = i.exw + i.freight;
  const insurance = base * 1.1 * i.insuranceRate;
  const cif = base + insurance;
  const customs = cif * i.dutyRate;
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    exw: r(i.exw),
    freight: r(i.freight),
    insurance: r(insurance),
    cif: r(cif),
    customs: r(customs),
    terminal: r(i.terminal),
    total: r(cif + customs + i.terminal),
  };
}

export function scoreIntent(events: IntentEvent[], now = Date.now()): IntentScore {
  if (events.length === 0) return { score: 0, level: 'COLD' };
  const perHs = new Map<string, number>();
  events.forEach((e) => perHs.set(e.hs, (perHs.get(e.hs) ?? 0) + 1));
  let topHs = '';
  let topCount = 0;
  perHs.forEach((n, hs) => {
    if (n > topCount) {
      topCount = n;
      topHs = hs;
    }
  });
  const recent = events.filter((e) => now - e.t <= WINDOW_MS).length;
  const maxWeight = Math.max(0, ...events.map((e) => e.weightKg ?? 0));
  const hasPort = events.some((e) => Boolean(e.port));

  const score = Math.round(
    Math.min(topCount, 5) * 8 + // repeat HS searches, max 40
      Math.min(recent, 10) * 3 + // query frequency in window, max 30
      Math.min(maxWeight / 20000, 1) * 15 + // declared shipment size, max 15
      (hasPort ? 15 : 0), // destination port chosen, max 15
  );
  return { score, level: score >= 70 ? 'SURGE' : score >= 40 ? 'WARM' : 'COLD', topHs };
}

export function usePredictiveIntent() {
  const [events, setEvents] = useState<IntentEvent[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setEvents(JSON.parse(raw) as IntentEvent[]);
    } catch {
      /* storage unavailable: run in memory only */
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify(events));
    } catch {
      /* ignore quota or privacy-mode errors */
    }
  }, [events]);

  const track = useCallback((e: Omit<IntentEvent, 't'>) => {
    setEvents((prev) => [...prev, { ...e, t: Date.now() }].slice(-100));
  }, []);

  const reset = useCallback(() => setEvents([]), []);
  const intent = useMemo(() => scoreIntent(events), [events]);

  return { track, reset, intent, quote: computeLandedCost };
}
