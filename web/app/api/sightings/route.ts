import {NextResponse} from 'next/server'
import {readClient, queries, safeFetch, type Sighting} from '@/lib/sanity'
import {fallbackSightings, cryptidNameById} from '@/lib/fallback'
import {serverClient} from '@/lib/sanity'
import {transition, AUTO_PUBLISH_SCORE, AUTO_REJECT_SCORE, type Checks} from '@/lib/workflow'
import {runAiCheck} from '@/lib/ai-check'
import {fetchWeather} from '@/lib/weather'

export const dynamic = 'force-dynamic'

export async function GET() {
  const res = await safeFetch(() => readClient.fetch<Sighting[]>(queries.sightings), fallbackSightings())
  const sightings = res.data.map((s) => ({
    ...s,
    cryptidName: s.cryptidName ?? cryptidNameById(s.cryptidId ?? '').name,
  }))
  return NextResponse.json({sightings, live: res.live})
}

export async function POST(req: Request) {
  let client
  try {
    client = serverClient()
  } catch {
    return NextResponse.json(
      {error: 'Ranger uplink offline: SANITY_API_TOKEN is not configured on this deployment.'},
      {status: 503},
    )
  }
  try {
    const body = await req.json()
    const {title, cryptidId, reporterName, observedAt, locationName, lat, lng, story, evidenceUrl, evidenceType} = body ?? {}
    if (!title || !cryptidId || !reporterName || !observedAt || !story || String(story).length < 80) {
      return NextResponse.json({error: 'Missing fields — title, cryptid, reporter, date, and a 80+ character story are required.'}, {status: 400})
    }

    const doc = await client.create({
      _type: 'sighting',
      title: String(title).slice(0, 120),
      cryptid: {_type: 'reference', _ref: String(cryptidId)},
      reporterName: String(reporterName).slice(0, 60),
      observedAt: new Date(observedAt).toISOString(),
      locationName: locationName ? String(locationName).slice(0, 120) : undefined,
      location: typeof lat === 'number' && typeof lng === 'number' ? {_type: 'geopoint', lat, lng} : undefined,
      story: String(story),
      evidenceUrl: evidenceUrl ? String(evidenceUrl) : undefined,
      evidenceType: evidenceType === 'video' ? 'video' : 'image',
      status: 'submitted',
    })
    const sightingId = doc._id as string

    await client.create({
      _type: 'verification',
      sighting: {_type: 'reference', _ref: sightingId},
      from: undefined,
      to: 'submitted',
      actor: 'system',
      note: 'Intake: report received from the field form.',
      decidedAt: new Date().toISOString(),
    })

    // Agent checks: credibility verdict + actual sky, in parallel.
    const cryptid = await client.fetch<{name: string; distinctiveTraits?: string[]} | null>(
      `*[_type == "cryptid" && _id == $id][0]{name, distinctiveTraits}`,
      {id: String(cryptidId)},
    )
    const [verdict, weather] = await Promise.all([
      runAiCheck({
        story: String(story),
        traits: cryptid?.distinctiveTraits ?? [],
        cryptidName: cryptid?.name ?? 'unknown cryptid',
        evidenceUrl: evidenceUrl ? String(evidenceUrl) : undefined,
      }),
      fetchWeather(typeof lat === 'number' ? lat : undefined, typeof lng === 'number' ? lng : undefined, new Date(observedAt).toISOString()),
    ])
    const checks: Checks = {
      aiScore: verdict.score,
      aiVerdict: `${verdict.verdict} (${verdict.source})`,
      aiReasons: verdict.reasons,
      weatherSummary: weather?.summary ?? null,
    }

    await transition(client, {
      sightingId,
      to: 'in-review',
      actor: 'agent',
      note: `Agent triage: ${verdict.verdict} (${verdict.source}), score ${verdict.score}/100.`,
      checks,
      score: verdict.score,
      weather: weather ? {summary: weather.summary, temperatureC: weather.temperatureC, conditions: weather.conditions} : undefined,
    })

    let status: string = 'in-review'
    if (verdict.score >= AUTO_PUBLISH_SCORE && evidenceUrl) {
      await transition(client, {sightingId, to: 'verified', actor: 'agent', note: `Auto-verify: score ${verdict.score} ≥ ${AUTO_PUBLISH_SCORE} with evidence attached.`})
      await transition(client, {sightingId, to: 'published', actor: 'agent', note: 'Auto-publish: exceptional report, straight into the guide.'})
      status = 'published'
    } else if (verdict.score <= AUTO_REJECT_SCORE) {
      await transition(client, {sightingId, to: 'rejected', actor: 'agent', note: `Auto-reject: score ${verdict.score} ≤ ${AUTO_REJECT_SCORE}. A ranger can still overturn this.`})
      status = 'rejected'
    }
    return NextResponse.json({id: sightingId, status, score: verdict.score, source: verdict.source})
  } catch (err) {
    return NextResponse.json({error: err instanceof Error ? err.message : 'Submission failed'}, {status: 500})
  }
}
