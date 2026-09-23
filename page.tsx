import Shell, { Card } from '@/components/Shell';
import { COMPANY } from '@/lib/company';

const input = 'mt-1 w-full rounded border border-steel bg-white px-3 py-2';

export default function Home() {
  return (
    <Shell
      title="Trade facilitation between Indian manufacturers and global buyers"
      lead="Search by HS code, product or country. We connect buyers with suppliers and earn a commission on completed deals."
    >
      <form action="/buyer" className="grid gap-3 rounded-lg border border-steel bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-sm">HS code or product
          <input name="q" required placeholder="7318.15.00 or hex bolts" className={input} />
        </label>
        <label className="text-sm">Country
          <input name="country" placeholder="Italy" className={input} />
        </label>
        <button className="self-end rounded bg-emerald px-5 py-2 font-medium text-navy">Search</button>
      </form>
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Verify us">
          <p><a className="underline" href="https://services.gst.gov.in/services/searchtp">Check GSTIN {COMPANY.gstin}</a></p>
          <p><a className="underline" href="https://udyamregistration.gov.in/Udyam_Verify.aspx">Check {COMPANY.udyam}</a></p>
        </Card>
        <Card title="Freight and commodity indices">
          <p>Live FOB and CIF indices will appear here once a data provider is chosen.</p>
        </Card>
        <Card title="Deal activity">
          <p>RFQ, cargo and factory counts appear here once the database is connected.</p>
        </Card>
      </div>
    </Shell>
  );
}
