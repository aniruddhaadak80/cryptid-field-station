/**
 * One-shot seeder for Cryptid Field Station.
 *
 * Creates the 7 cryptids, files the 12 sightings as `submitted`, then runs
 * the same agent triage the web app runs (heuristic credibility + live
 * Open-Meteo weather), writing every step to `verification` documents.
 *
 * Needs: SANITY_API_TOKEN (project Editor). Safe to re-run — it cleans up
 * its own previous seed (`sighting-seed-*`) before importing.
 */
import {createClient} from '@sanity/client'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const cryptids = JSON.parse(readFileSync(join(root, 'cryptids.json'), 'utf8'))
const sightings = JSON.parse(readFileSync(join(root, 'sightings.json'), 'utf8'))

const token = process.env.SANITY_API_TOKEN
if (!token) {
  console.error('Set SANITY_API_TOKEN first (project Editor token).')
  process.exit(1)
}
const client = createClient({
  projectId: 'yy3ugxmv',
  dataset: 'production',
  apiVersion: '2025-08-01',
  useCdn: false,
  token,
})

const FAKE_HINTS = ['fake', 'made up', 'taxidermy', 'admits', 'control sample', 'prove the pipeline', 'to be rejected']

function heuristic(story, traits, evidenceUrl) {
  let score = 50
  const reasons = []
  if (story.length >= 300) {
    score += 15
    reasons.push('Detailed first-hand account (300+ chars).')
  } else if (story.length < 120) {
    score -= 15
    reasons.push('Very short account — little to corroborate.')
  }
  if (evidenceUrl) {
    score += 10
    reasons.push('Evidence attached for the ranger to inspect.')
  } else {
    score -= 5
    reasons.push('No evidence attached.')
  }
  const lower = story.toLowerCase()
  const hits = traits.filter((t) => lower.includes(t.toLowerCase().split(' ')[0]))
  score += Math.min(20, hits.length * 7)
  if (hits.length > 0) reasons.push(`Matches known traits: ${hits.slice(0, 3).join('; ')}.`)
  if (FAKE_HINTS.some((h) => lower.includes(h))) {
    score -= 40
    reasons.push('Story itself flags fabrication — treats as control sample.')
  }
  score = Math.max(0, Math.min(100, score))
  return {score, verdict: score >= 70 ? 'credible' : score >= 40 ? 'thin' : 'reject', reasons}
}

async function weather(lat, lng, observedAt) {
  try {
    const day = observedAt.slice(0, 10)
    const url =
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
      `&start_date=${day}&end_date=${day}&hourly=temperature_2m,precipitation,weathercode&timezone=auto`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    const hours = json?.hourly?.time ?? []
    if (hours.length === 0) return null
    const target = new Date(observedAt).getTime()
    let best = 0
    let bestDelta = Infinity
    hours.forEach((h, i) => {
      const d = Math.abs(new Date(h).getTime() - target)
      if (d < bestDelta) {
        bestDelta = d
        best = i
      }
    })
    const temp = json.hourly.temperature_2m?.[best]
    if (typeof temp !== 'number') return null
    const labels = {0: 'clear sky', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'fog', 61: 'light rain', 63: 'rain', 65: 'heavy rain', 71: 'light snow', 73: 'snow', 80: 'showers', 95: 'thunderstorm'}
    const conditions = labels[json.hourly.weathercode?.[best]] ?? 'mixed conditions'
    const precip = json.hourly.precipitation?.[best] ?? 0
    return {summary: `${conditions}, ${temp.toFixed(1)}°C, ${precip}mm precip near report hour`, temperatureC: temp, conditions}
  } catch {
    return null
  }
}

async function log(sightingId, from, to, actor, note, checks) {
  await client.create({
    _type: 'verification',
    sighting: {_type: 'reference', _ref: sightingId},
    from,
    to,
    actor,
    note,
    checks,
    decidedAt: new Date().toISOString(),
  })
}

// 1. Clean previous seed (only our own deterministic ids).
const oldIds = await client.fetch(`*[_type == "sighting" && _id match "sighting-seed-*"]._id`)
for (const id of oldIds) {
  const logs = await client.fetch(`*[_type == "verification" && sighting._ref == $id]._id`, {id})
  for (const l of logs) await client.delete(l)
  await client.delete(id)
}
console.log(`cleaned ${oldIds.length} previous seeded sightings`)

// 2. Cryptids.
for (const c of cryptids) await client.createOrReplace(c)
console.log(`upserted ${cryptids.length} cryptids`)

// 3. Sightings + agent triage.
const traitMap = Object.fromEntries(cryptids.map((c) => [c._id, c.distinctiveTraits ?? []]))
let i = 0
for (const s of sightings) {
  const id = `sighting-seed-${i++}`
  await client.createOrReplace({
    _id: id,
    _type: 'sighting',
    title: s.title,
    cryptid: {_type: 'reference', _ref: s.cryptidId},
    reporterName: s.reporterName,
    observedAt: new Date(s.observedAt).toISOString(),
    locationName: s.locationName,
    location: {_type: 'geopoint', lat: s.lat, lng: s.lng},
    story: s.story,
    evidenceUrl: s.evidenceUrl || undefined,
    evidenceType: s.evidenceType ?? 'image',
    status: 'submitted',
  })
  await log(id, undefined, 'submitted', 'system', 'Intake: seeded report filed.', undefined)

  const v = heuristic(s.story, traitMap[s.cryptidId] ?? [], s.evidenceUrl)
  const w = await weather(s.lat, s.lng, s.observedAt)
  const checks = {
    aiScore: v.score,
    aiVerdict: `${v.verdict} (heuristic — seed run)`,
    aiReasons: v.reasons,
    weatherSummary: w?.summary ?? null,
  }
  await client.patch(id).set({status: 'in-review', credibilityScore: v.score, ...(w ? {weather: w} : {})}).commit()
  await log(id, 'submitted', 'in-review', 'agent', `Seed triage: ${v.verdict}, score ${v.score}/100.`, checks)

  if (v.score >= 90 && s.evidenceUrl) {
    await client.patch(id).set({status: 'published'}).commit()
    await log(id, 'in-review', 'verified', 'agent', `Auto-verify: score ${v.score} ≥ 90 with evidence.`, undefined)
    await log(id, 'verified', 'published', 'agent', 'Auto-publish: exceptional report.', undefined)
  } else if (v.score >= 80) {
    await client.patch(id).set({status: 'verified'}).commit()
    await log(id, 'in-review', 'verified', 'agent', `Seed verify: score ${v.score} ≥ 80. Rangers re-check on the board.`, undefined)
  } else if (v.score <= 20) {
    await client.patch(id).set({status: 'rejected'}).commit()
    await log(id, 'in-review', 'rejected', 'agent', `Auto-reject: score ${v.score} ≤ 20. Rangers can overturn.`, undefined)
  }
  console.log(`${id}: ${s.title} → score ${v.score}`)
}
console.log('seed complete')
