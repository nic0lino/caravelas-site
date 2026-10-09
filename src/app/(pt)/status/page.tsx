import type { Metadata } from 'next';
import { getSiteContent } from '@/content';

export const revalidate = 60;
export const metadata: Metadata = { title: 'Status', robots: { index: false, follow: false } };

export default async function StatusPage() {
  const c = await getSiteContent();
  const counts = {
    marquee: c.marquee.length,
    features: c.features.length,
    schedule: c.schedule.length,
    prices: c.prices.length,
    coaches: c.coaches.length,
  };
  return (
    <main className="container-col py-10 text-sm">
      <h1 className="mb-4 text-2xl font-bold">Content status</h1>
      <dl className="mb-6 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1">
        <dt className="font-bold">source</dt><dd>{c.meta.source}</dd>
        <dt className="font-bold">fetchedAt</dt><dd>{c.meta.fetchedAt}</dd>
        {Object.entries(counts).map(([k, v]) => (
          <div key={k} className="contents"><dt className="font-bold">{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      <h2 className="mb-2 text-lg font-bold">Warnings ({c.meta.warnings.length})</h2>
      {c.meta.warnings.length === 0 ? (
        <p>None.</p>
      ) : (
        <ul className="list-disc pl-5">{c.meta.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
      )}
    </main>
  );
}
