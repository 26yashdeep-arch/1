'use client';

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

const sha256 = async (text: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export interface SignReceipt {
  id: string;
  signerIp: string;
  signedAt: string;
  sha256: string;
}

interface Props {
  agreementId: string;
  agreementText: string;
  signerName: string;
  onSigned?: (receipt: SignReceipt) => void;
}

export default function NcndaSigner({ agreementId, agreementText, signerName, onSigned }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [docHash, setDocHash] = useState('');
  const [hasInk, setHasInk] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<SignReceipt | null>(null);

  useEffect(() => {
    sha256(agreementText).then(setDocHash);
  }, [agreementText]);

  useEffect(() => {
    const c = canvasRef.current;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.clientWidth * ratio;
    c.height = c.clientHeight * ratio;
    g.scale(ratio, ratio);
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.strokeStyle = '#0F172A';
  }, []);

  const point = (e: PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const start = (e: PointerEvent<HTMLCanvasElement>) => {
    const g = e.currentTarget.getContext('2d');
    if (!g) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const [x, y] = point(e);
    g.beginPath();
    g.moveTo(x, y);
  };

  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const g = e.currentTarget.getContext('2d');
    if (!g) return;
    const [x, y] = point(e);
    g.lineTo(x, y);
    g.stroke();
    setHasInk(true);
  };

  const stop = () => {
    drawing.current = false;
  };

  const clear = () => {
    const c = canvasRef.current;
    c?.getContext('2d')?.clearRect(0, 0, c.clientWidth, c.clientHeight);
    setHasInk(false);
  };

  const sign = async () => {
    const c = canvasRef.current;
    if (!c) return;
    setBusy(true);
    setError('');
    try {
      const signature = c.toDataURL('image/png');
      const clientTimestamp = new Date().toISOString();
      const digest = await sha256([docHash, signerName, clientTimestamp, signature].join('|'));
      const res = await fetch('/api/agreements/ncnda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId, documentSha256: docHash, sha256: digest, signerName, signature, clientTimestamp }),
      });
      if (!res.ok) throw new Error(`Signing failed (${res.status}). Try again.`);
      const data = (await res.json()) as Omit<SignReceipt, 'sha256'>;
      const r: SignReceipt = { ...data, sha256: digest };
      setReceipt(r);
      onSigned?.(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signing failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (receipt) {
    return (
      <section className="rounded-lg border border-[#10B981] bg-[#F8FAFC] p-4 text-[#0F172A]" role="status">
        <h2 className="text-lg font-semibold">Agreement signed</h2>
        <dl className="mt-2 space-y-1 break-all text-sm">
          <div><dt className="inline font-medium">Reference: </dt><dd className="inline">{receipt.id}</dd></div>
          <div><dt className="inline font-medium">Signed at: </dt><dd className="inline">{receipt.signedAt}</dd></div>
          <div><dt className="inline font-medium">Signer IP: </dt><dd className="inline">{receipt.signerIp}</dd></div>
          <div><dt className="inline font-medium">SHA-256: </dt><dd className="inline">{receipt.sha256}</dd></div>
        </dl>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-4 text-[#0F172A]">
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded border border-[#CBD5E1] bg-white p-3 text-sm">
        {agreementText}
      </pre>
      <p className="break-all text-xs text-[#1E293B]">Document SHA-256: {docHash || 'computing…'}</p>

      <canvas
        ref={canvasRef}
        aria-label={`Signature pad for ${signerName}`}
        className="h-40 w-full touch-none rounded border border-dashed border-[#CBD5E1] bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
      />
      <button type="button" onClick={clear} className="text-sm underline">Clear signature</button>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
        <span>I, {signerName}, have read this agreement and sign it electronically.</span>
      </label>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={sign}
        disabled={busy || !hasInk || !agreed || !docHash}
        className="rounded bg-[#10B981] px-4 py-2 font-medium text-[#0F172A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
      >
        {busy ? 'Signing…' : 'Sign agreement'}
      </button>
    </section>
  );
}
