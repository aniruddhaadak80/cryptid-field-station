import Link from 'next/link'
import {readClient, queries, safeFetch, type Sighting, type Verification} from '@/lib/sanity'
import {fallbackSightings, cryptidNameById} from '@/lib/fallback'
import {Badge, CacheNote} from '@/components/ui'

export const revalidate = 60

export default async function SightingPage({params}: {params: {id: string}}) {
  const id = decodeURIComponent(params.id)
  if (id.startsWith('seed-')) {
    const s = fallbackSightings().find((x) => x._id === id)
    if (!s) return <p>Not found. <Link href="/sightings">Back to the log</Link></p>
    return (
      <>
        <p><Link href="/sightings">← Sightings log</Link></p>
        <h1>{s.title}</h1>
        <p className="muted">{cryptidNameById(s.cryptidId ?? '').name} · {s.locationName} · {s.observedAt.slice(0, 10)}</p>
        <div className="cache">🧭 Cached field copy — the full verification audit trail appears here once the dataset is seeded.</div>
        <p>{s.story}</p>
      </>
    )
  }
  const [sightingRes, verRes] = await Promise.all([
    safeFetch(() => readClient.fetch<Sighting | null>(queries.sightingById, {id}), null),
    safeFetch(() => readClient.fetch<Verification[]>(queries.verificationsFor, {id}), []),
  ])
  const s = sightingRes.data
  if (!s) return <p>Not found. <Link href="/sightings">Back to the log</Link></p>
  const video = s.evidenceType === 'video' && s.evidenceUrl
  return (
    <>
      <p><Link href="/sightings">← Sightings log</Link></p>
      <h1>{s.title}</h1>
      <p className="muted">
        {s.cryptidName} · {s.locationName ?? 'location withheld'} · {s.observedAt.slice(0, 10)} · reported by {s.reporterName}
      </p>
      <CacheNote live={sightingRes.live} />
      <p><Badge status={s.status} /> {typeof s.credibilityScore === 'number' && <span className="small"> · credibility <b>{s.credibilityScore}</b>/100</span>}</p>
      {s.evidenceUrl && !video && <img className="detail-img" src={s.evidenceUrl} alt="sighting evidence" />}
      {video && <video className="detail-img" src={s.evidenceUrl} controls muted playsInline />}
      <p>{s.story}</p>
      {s.weatherSummary && <p className="small"><b>Sky that night:</b> {s.weatherSummary}</p>}
      <h2 className="section">Verification trail</h2>
      <div className="timeline">
        {verRes.data.map((v) => (
          <div className="t" key={v._id}>
            <div><b>{v.from ?? '∅'} → {v.to}</b> <span className="small muted">by {v.actor}{v.decidedAt ? ` · ${v.decidedAt.slice(0, 16).replace('T', ' ')}` : ''}</span></div>
            {v.note && <div className="small">{v.note}</div>}
            {typeof v.aiScore === 'number' && (
              <div className="small muted">AI: {v.aiScore}/100 ({v.aiVerdict}){v.weatherSummary ? ` · sky: ${v.weatherSummary}` : ''}</div>
            )}
            {v.aiReasons && v.aiReasons.length > 0 && (
              <ul className="small muted">{v.aiReasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
            )}
          </div>
        ))}
        {verRes.data.length === 0 && <p className="muted small">No transitions recorded yet.</p>}
      </div>
    </>
  )
}
