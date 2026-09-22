import Link from 'next/link'
import {readClient, queries, safeFetch, type Cryptid, type Sighting} from '@/lib/sanity'
import {fallbackCryptids, fallbackSightings} from '@/lib/fallback'
import {Badge, CacheNote} from '@/components/ui'

export const revalidate = 60

export default async function Home() {
  const [cryptidsRes, sightingsRes] = await Promise.all([
    safeFetch(() => readClient.fetch<Cryptid[]>(queries.cryptids), fallbackCryptids()),
    safeFetch(() => readClient.fetch<Sighting[]>(queries.sightings), fallbackSightings()),
  ])
  const live = cryptidsRes.live && sightingsRes.live
  const counts = Object.fromEntries(
    (['submitted', 'in-review', 'verified', 'rejected', 'published'] as const).map((s) => [
      s,
      sightingsRes.data.filter((x) => x.status === s).length,
    ]),
  )
  const published = sightingsRes.data.filter((s) => s.status === 'published' || s.status === 'verified').slice(0, 3)

  return (
    <>
      <section className="hero">
        <h1>The woods file reports. We check them.</h1>
        <p>
          Cryptid Field Station turns hiker sightings into a verified field guide. Every report runs an AI
          credibility check plus a weather cross-check, then a human ranger approves it through the same
          workflow — all stored as structured content in Sanity.
        </p>
        <div className="row">
          <Link className="btn" href="/report">📡 File a sighting</Link>
          <Link className="btn ghost" href="/ranger">Open Ranger Board</Link>
        </div>
      </section>

      <CacheNote live={live} />

      <div className="stats">
        <div className="stat"><b>{cryptidsRes.data.length}</b><span>tracked cryptids</span></div>
        <div className="stat"><b>{sightingsRes.data.length}</b><span>sightings filed</span></div>
        <div className="stat"><b>{counts['in-review'] ?? 0}</b><span>awaiting review</span></div>
        <div className="stat"><b>{(counts.verified ?? 0) + (counts.published ?? 0)}</b><span>verified + published</span></div>
      </div>

      <h2 className="section">Field guide</h2>
      <div className="grid">
        {cryptidsRes.data.slice(0, 6).map((c) => (
          <div className="card" key={c._id}>
            {c.imageUrl && <img src={c.imageUrl} alt={c.name} loading="lazy" />}
            <div className="body">
              <h3><Link href={`/guide/${c.slug}`}>{c.name}</Link></h3>
              <div className="small muted">{c.classification} · danger {c.dangerLevel}/5 · {c.status}</div>
              <div className="small">{c.description.slice(0, 120)}…</div>
            </div>
          </div>
        ))}
      </div>
      <p><Link href="/guide">Browse all {cryptidsRes.data.length} entries →</Link></p>

      <h2 className="section">Fresh from the trail</h2>
      <div className="grid">
        {published.map((s) => (
          <div className="card" key={s._id}>
            <div className="body">
              <Badge status={s.status} />
              <h3><Link href={`/sightings/${encodeURIComponent(s._id)}`}>{s.title}</Link></h3>
              <div className="small muted">{s.cryptidName ?? ''} · {s.locationName ?? 'location withheld'}</div>
            </div>
          </div>
        ))}
        {published.length === 0 && <p className="muted">Nothing verified yet — the rangers are still reading.</p>}
      </div>

      <h2 className="section">How a report becomes canon</h2>
      <div className="steps">
        <div className="step"><b>1 · Report</b><span className="small muted">A hiker files a sighting with story, location, and evidence.</span></div>
        <div className="step"><b>2 · Agent checks</b><span className="small muted">An AI editor scores credibility (Gemini, or a heuristic stand-in); Open-Meteo pulls the actual sky that night.</span></div>
        <div className="step"><b>3 · Ranger review</b><span className="small muted">A human verifies or rejects through the same transitions the agent uses.</span></div>
        <div className="step"><b>4 · Field guide</b><span className="small muted">Published sightings join the cryptid entry, with the full audit trail attached.</span></div>
      </div>
    </>
  )
}
