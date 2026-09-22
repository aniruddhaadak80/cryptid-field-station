import Link from 'next/link'
import {readClient, queries, safeFetch, type Sighting} from '@/lib/sanity'
import {fallbackSightings, cryptidNameById} from '@/lib/fallback'
import {Badge, CacheNote} from '@/components/ui'

export const revalidate = 60
const FILTERS = ['all', 'submitted', 'in-review', 'verified', 'rejected', 'published']

export default async function SightingsPage({searchParams}: {searchParams: {status?: string}}) {
  const status = searchParams.status ?? 'all'
  const res = await safeFetch(() => readClient.fetch<Sighting[]>(queries.sightings), fallbackSightings())
  const enriched = res.data.map((s) => ({
    ...s,
    cryptidName: s.cryptidName ?? cryptidNameById(s.cryptidId ?? '').name,
  }))
  const list = status === 'all' ? enriched : enriched.filter((s) => s.status === status)
  return (
    <>
      <h1>Sightings log</h1>
      <CacheNote live={res.live} />
      <div className="row">
        {FILTERS.map((f) => (
          <Link key={f} href={f === 'all' ? '/sightings' : `/sightings?status=${f}`} prefetch={false}>
            <span className="badge" style={f === status ? {borderColor: '#7cf2a8'} : undefined}>{f}</span>
          </Link>
        ))}
      </div>
      <div className="grid">
        {list.map((s) => (
          <div className="card" key={s._id}>
            <div className="body">
              <Badge status={s.status} />
              <h3><Link href={`/sightings/${encodeURIComponent(s._id)}`}>{s.title}</Link></h3>
              <div className="small muted">
                {s.cryptidName} · {s.locationName ?? 'location withheld'} · {s.observedAt.slice(0, 10)}
              </div>
              {typeof s.credibilityScore === 'number' && (
                <div className="small">Credibility: <b>{s.credibilityScore}</b>/100</div>
              )}
            </div>
          </div>
        ))}
      </div>
      {list.length === 0 && <p className="muted">Nothing in this lane yet.</p>}
    </>
  )
}
