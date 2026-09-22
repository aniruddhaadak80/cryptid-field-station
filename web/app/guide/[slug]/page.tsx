import Link from 'next/link'
import {readClient, queries, safeFetch, type Cryptid, type Sighting} from '@/lib/sanity'
import {fallbackCryptids, fallbackSightings, cryptidNameById} from '@/lib/fallback'
import {Badge, CacheNote} from '@/components/ui'

export const revalidate = 60

export default async function CryptidPage({params}: {params: {slug: string}}) {
  const [cryptidRes, sightingsRes] = await Promise.all([
    safeFetch(() => readClient.fetch<Cryptid | null>(queries.cryptidBySlug, {slug: params.slug}), null),
    safeFetch(() => readClient.fetch<Sighting[]>(queries.sightingsForCryptid, {slug: params.slug}), null),
  ])

  let cryptid = cryptidRes.data
  let sightings = sightingsRes.data
  let live = cryptidRes.live && sightingsRes.live
  if (!cryptid) {
    const fb = fallbackCryptids().find((c) => c.slug === params.slug)
    if (!fb) return <p>Unknown cryptid. <Link href="/guide">Back to the guide</Link></p>
    cryptid = fb
    sightings = fallbackSightings()
      .filter((s) => s.cryptidId === fb._id)
      .map((s) => ({...s, cryptidName: cryptidNameById(s.cryptidId ?? '').name, cryptidSlug: fb.slug}))
    live = false
  }

  return (
    <>
      <p><Link href="/guide">← Field guide</Link></p>
      <h1>{cryptid.name}</h1>
      <p className="muted">{cryptid.classification} · danger {cryptid.dangerLevel}/5 · {cryptid.status}</p>
      <CacheNote live={live} />
      {cryptid.imageUrl && <img className="detail-img" src={cryptid.imageUrl} alt={cryptid.name} />}
      <p>{cryptid.description}</p>
      {cryptid.habitat && <p><b>Habitat:</b> {cryptid.habitat}</p>}
      {cryptid.distinctiveTraits && (
        <p><b>Field marks:</b> {cryptid.distinctiveTraits.join(' · ')}</p>
      )}
      <h2 className="section">Verified sightings ({sightings?.length ?? 0})</h2>
      <div className="grid">
        {(sightings ?? []).map((s) => (
          <div className="card" key={s._id}>
            <div className="body">
              <Badge status={s.status} />
              <h3><Link href={`/sightings/${encodeURIComponent(s._id)}`}>{s.title}</Link></h3>
              <div className="small muted">{s.locationName} · {s.observedAt.slice(0, 10)}</div>
            </div>
          </div>
        ))}
      </div>
      <p><Link className="btn" href={`/report?cryptid=${cryptid.slug}`}>Report a {cryptid.name} sighting</Link></p>
    </>
  )
}
