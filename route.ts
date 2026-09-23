import { NextResponse } from 'next/server';

// Preview stub: checks the payload shape only. Replace with a database write and audit-trail entry before launch.
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { agreementId?: string; sha256?: string; signature?: string } | null;
  if (!b?.agreementId || !b.sha256 || !b.signature?.startsWith('data:image/png')) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  return NextResponse.json({
    id: crypto.randomUUID(),
    signerIp: req.headers.get('cf-connecting-ip') ?? 'unknown',
    signedAt: new Date().toISOString(),
  });
}
