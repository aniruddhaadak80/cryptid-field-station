'use client'

import {useCallback, useEffect, useState} from 'react'
import Link from 'next/link'
import {Badge} from '@/components/ui'
import type {Sighting} from '@/lib/sanity'

const LANES = ['submitted', 'in-review', 'verified', 'published', 'rejected'] as const

const NEXT: Record<string, Array<{to: string; label: string; danger?: boolean}>> = {
  submitted: [{to: 'in-review', label: 'Pull to review'}],
  'in-review': [
    {to: 'verified', label: 'Verify'},
    {to: 'rejected', label: 'Reject', danger: true},
  ],
  verified: [{to: 'published', label: 'Publish'}],
}

export default function RangerBoard({initial, live}: {initial: Sighting[]; live: boolean}) {
  const [sightings, setSightings] = useState<Sighting[]>(initial)
  const [isLive, setIsLive] = useState(live)
  const [busy, setBusy] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/sightings', {cache: 'no-store'})
      const json = await res.json()
      if (Array.isArray(json.sightings)) {
        setSightings(json.sightings)
        setIsLive(Boolean(json.live))
      }
    } catch {
      /* keep stale board rather than blanking it */
    }
  }, [])

  useEffect(() => {
    const t = setInterval(refresh, 15000)
    return () => clearInterval(t)
  }, [refresh])

  async function act(id: string, to: string) {
    setBusy(`${id}:${to}`)
    try {
      const res = await fetch(`/api/sightings/${encodeURIComponent(id)}/transition`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({to, actor: 'ranger', note: `Ranger decision from the board: ${to}.`}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Transition failed')
      await refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Transition failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      {!isLive && (
        <div className="cache">📡 Board is showing the field cache (dataset empty/unreachable). Live lanes appear after seeding. <button onClick={refresh}>Retry</button></div>
      )}
      <div className="row" style={{marginBottom: 12}}>
        <button className="btn ghost" onClick={refresh}>↻ Refresh</button>
        <span className="small muted">Auto-refreshes every 15s · same transitions the agent uses.</span>
      </div>
      <div className="lanes">
        {LANES.map((lane) => {
          const items = sightings.filter((s) => s.status === lane)
          return (
            <div className="lane" key={lane}>
              <h3>{lane} ({items.length})</h3>
              {items.map((s) => (
                <div className="mini" key={s._id}>
                  <Link href={`/sightings/${encodeURIComponent(s._id)}`}><b>{s.title}</b></Link>
                  <div className="muted">{s.cryptidName} · {typeof s.credibilityScore === 'number' ? `${s.credibilityScore}/100` : 'unscored'}</div>
                  {(NEXT[lane] ?? []).length > 0 && (
                    <div className="ops">
                      {(NEXT[lane] ?? []).map((n) => (
                        <button
                          key={n.to}
                          className={n.danger ? 'no' : ''}
                          disabled={busy !== null}
                          onClick={() => act(s._id, n.to)}
                        >
                          {busy === `${s._id}:${n.to}` ? '…' : n.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {items.length === 0 && <div className="small muted">—</div>}
            </div>
          )
        })}
      </div>
      <p className="small muted" style={{marginTop: 16}}>
        Every click writes a <code>verification</code> document next to the sighting — the same audit trail the
        agent writes. <Badge status="in-review" /> + human judgment beats either alone.
      </p>
    </>
  )
}
