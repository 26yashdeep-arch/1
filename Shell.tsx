import Link from 'next/link';
import type { ReactNode } from 'react';
import { COMPANY } from '@/lib/company';

const NAV = [
  ['/', 'Home'],
  ['/about', 'About'],
  ['/buyer', 'Buyers'],
  ['/supplier', 'Suppliers'],
  ['/compliance', 'Compliance'],
  ['/crm', 'Deal room'],
  ['/agreements/ncnda', 'NCNDA'],
  ['/services/audit', 'Audit'],
  ['/admin', 'Admin'],
] as const;

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-steel bg-white p-5">
      <h2 className="mb-2 text-lg font-semibold text-navy">{title}</h2>
      <div className="space-y-2 text-sm text-maritime">{children}</div>
    </section>
  );
}

export default function Shell({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-navy">
      <p className="bg-amber-300 px-4 py-1 text-center text-sm font-medium">Private preview build. Not public.</p>
      <header className="bg-navy text-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="font-semibold">{COMPANY.name}</Link>
          <nav aria-label="Main" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-emerald focus-visible:underline">{label}</Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-3xl font-semibold">{title}</h1>
        {lead && <p className="max-w-2xl text-maritime">{lead}</p>}
        {children}
      </main>
      <footer className="bg-maritime px-4 py-6 text-sm text-paper">
        <p className="font-medium">{COMPANY.name} (proprietor: {COMPANY.proprietor})</p>
        <p>GSTIN {COMPANY.gstin} | {COMPANY.udyam}</p>
        <p>{COMPANY.address}</p>
        <p>{COMPANY.email} | {COMPANY.phone}</p>
      </footer>
    </div>
  );
}
