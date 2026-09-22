import {useCallback, useEffect, useState} from 'react'
import {sanity, WEB_URL, SIGHTINGS_QUERY, type Sighting} from './sanity'
import './styles.css'

const LANES = ['submitted', 'in-review', 'verified', 'published', 'rejected'] as const
const NEXT: Record<string, Array<{to: string; label: string}>> = {
  submitted: [{to: 'in-review', label: 'Pull to review'}],
  'in-review': [
    {to: 'verified', label: 'Verify'},
    {to: 'rejected', label: 'Reject'},
  ],
  verified: [{to: 'published', label: 'Publish'}],
}

/**
 * Ranger Dispatch — the custom real-time app on top of the same Sanity
 * content. Subscribes to the live stream, so a hiker's report lands in the
 * `submitted` lane the moment it's filed, and every decision writes to the
 * shared verification log through the web workflow API.
 */
export default function App() {
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await sanity.fetch<Sighting[]>(SIGHTINGS_QUERY)
      setSightings(data)
      setConnected(true)
    } catch {
      setConnected(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const sub = sanity.listen(SIGHTINGS_QUERY).subscribe({next: () => refresh(), error: () => setConnected(false)})
    return () => sub.unsubscribe()
  }, [refresh])

  async function act(id: string, to: string) {
    if (!WEB_URL) return
    setBusy(`${id}:${to}`)
    try {
      const res = await fetch(`${WEB_URL}/api/sightings/${encodeURIComponent(id)}/transition`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({to, actor: 'ranger', note: `Ranger Dispatch decision: ${to}.`}),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as {error?: string}).error ?? 'Transition failed')
      }
      await refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Transition failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="dispatch">
      <header>
        <h1>🛖 Ranger Dispatch</h1>
        <span className={connected ? 'dot on' : 'dot'}>{connected ? 'live' : 'offline'}</span>
      </header>
      {!WEB_URL && <p className="warn">VITE_WEB_URL is not set — board is read-only until it points at the web app.</p>}
      <div className="lanes">
        {LANES.map((lane) => {
          const items = sightings.filter((s) => s.status === lane)
          return (
            <section className="lane" key={lane}>
              <h2>{lane} ({items.length})</h2>
              {items.map((s) => (
                <article className="mini" key={s._id}>
                  <b>{s.title}</b>
                  <div className="meta">{s.cryptidName} · {typeof s.credibilityScore === 'number' ? `${s.credibilityScore}/100` : 'unscored'}</div>
                  {WEB_URL && (NEXT[lane] ?? []).map((n) => (
                    <button key={n.to} disabled={busy !== null} onClick={() => act(s._id, n.to)}>
                      {busy === `${s._id}:${n.to}` ? '…' : n.label}
                    </button>
                  ))}
                </article>
              ))}
              {items.length === 0 && <div className="meta">—</div>}
            </section>
          )
        })}
      </div>
    </div>
  )
}
