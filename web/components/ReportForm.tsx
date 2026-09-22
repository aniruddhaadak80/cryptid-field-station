'use client'

import {useState} from 'react'

export interface CryptidOption {
  _id: string
  name: string
  slug: string
}

export default function ReportForm({cryptids, uplink}: {cryptids: CryptidOption[]; uplink: boolean}) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ok: boolean; message: string; id?: string} | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setResult(null)
    const fd = new FormData(e.currentTarget)
    const body = {
      title: String(fd.get('title') ?? ''),
      cryptidId: String(fd.get('cryptidId') ?? ''),
      reporterName: String(fd.get('reporterName') ?? ''),
      observedAt: String(fd.get('observedAt') ?? ''),
      locationName: String(fd.get('locationName') ?? ''),
      lat: fd.get('lat') ? Number(fd.get('lat')) : undefined,
      lng: fd.get('lng') ? Number(fd.get('lng')) : undefined,
      story: String(fd.get('story') ?? ''),
      evidenceUrl: String(fd.get('evidenceUrl') ?? '') || undefined,
      evidenceType: String(fd.get('evidenceType') ?? 'image'),
    }
    try {
      const res = await fetch('/api/sightings', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Submission failed')
      setResult({
        ok: true,
        message: `Filed! Status: ${json.status} · AI score ${json.score}/100 (${json.source}). ${json.status === 'published' ? 'Straight into the guide — the agent was that convinced.' : json.status === 'rejected' ? 'The agent rejected it on the spot — check the audit trail.' : 'A ranger will review it on the board.'}`,
        id: json.id,
      })
      ;(e.target as HTMLFormElement).reset()
    } catch (err) {
      setResult({ok: false, message: err instanceof Error ? err.message : 'Submission failed'})
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {!uplink && (
        <div className="cache">🔌 Ranger uplink offline — the write token isn&apos;t configured on this deployment yet. The form will wake up as soon as it is.</div>
      )}
      <form className="report" onSubmit={onSubmit}>
        <label>Title<input name="title" required minLength={8} maxLength={120} placeholder="Red eyes over the TNT area" /></label>
        <div className="two">
          <label>Cryptid
            <select name="cryptidId" required defaultValue="">
              <option value="" disabled>Pick one…</option>
              {cryptids.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </label>
          <label>Your name<input name="reporterName" required maxLength={60} placeholder="Carla D." /></label>
        </div>
        <div className="two">
          <label>Observed at<input name="observedAt" type="datetime-local" required /></label>
          <label>Location name<input name="locationName" maxLength={120} placeholder="McClintic Wildlife Area, WV" /></label>
        </div>
        <div className="two">
          <label>Latitude<input name="lat" type="number" step="any" min={-90} max={90} placeholder="38.85" /></label>
          <label>Longitude<input name="lng" type="number" step="any" min={-180} max={180} placeholder="-82.12" /></label>
        </div>
        <label>Story (min 80 characters)<textarea name="story" required minLength={80} placeholder="What did you see, exactly? What did it sound like? What makes you sure — or unsure?" /></label>
        <div className="two">
          <label>Evidence URL (optional)<input name="evidenceUrl" type="url" placeholder="https://… .jpg / .mp4" /></label>
          <label>Evidence type
            <select name="evidenceType" defaultValue="image">
              <option value="image">image</option>
              <option value="video">video</option>
            </select>
          </label>
        </div>
        <button className="btn" disabled={busy}>{busy ? 'Filing + running checks…' : '📡 File sighting'}</button>
      </form>
      {result && (
        <div className={`alert ${result.ok ? 'ok' : 'err'}`}>
          {result.message}{' '}
          {result.id && <a href={`/sightings/${encodeURIComponent(result.id)}`}>Follow the audit trail →</a>}
        </div>
      )}
    </>
  )
}
