import Link from 'next/link'
import {readClient, queries, safeFetch, type Cryptid} from '@/lib/sanity'
import {fallbackCryptids} from '@/lib/fallback'
import {CacheNote} from '@/components/ui'

export const revalidate = 60

export default async function GuidePage() {
  const res = await safeFetch(() => readClient.fetch<Cryptid[]>(queries.cryptids), fallbackCryptids())
  return (
    <>
      <h1>Field guide</h1>
      <p className="muted">{res.data.length} cryptids on the books. Danger ratings are ranger-certified and legally meaningless.</p>
      <CacheNote live={res.live} />
      <div className="grid">
        {res.data.map((c) => (
          <div className="card" key={c._id}>
            {c.imageUrl && <img src={c.imageUrl} alt={c.name} loading="lazy" />}
            <div className="body">
              <h3><Link href={`/guide/${c.slug}`}>{c.name}</Link></h3>
              <div className="small muted">{c.classification} · danger {c.dangerLevel}/5 · {c.status}</div>
              <div className="small">{c.description.slice(0, 140)}…</div>
              {c.distinctiveTraits && <div className="small muted">Traits: {c.distinctiveTraits.slice(0, 3).join(' · ')}</div>}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
