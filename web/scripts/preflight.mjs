/**
 * Preflight checks that need no Sanity token:
 *  1. Gemini key + model name validity (tiny probe, prints status only — never the key)
 *  2. Heuristic credibility scores for every seeded sighting (mirrors lib/ai-check.ts)
 *  3. Open-Meteo weather resolution for every seeded coordinate (mirrors lib/weather.ts)
 *
 * Usage: node scripts/preflight.mjs [path-to-env-file]
 */
import {readFileSync} from 'node:fs'

const envPath = process.argv[2] ?? '.env.local'
const vars = {}
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) vars[m[1]] = m[2].replace(/^"|"$/g, '')
  }
} catch {
  console.log(`no env file at ${envPath} — skipping Gemini probe`)
}

// 1. Gemini probe -------------------------------------------------------------
async function probeGemini() {
  const key = vars.GEMINI_API_KEY
  if (!key) {
    console.log('[gemini] no key — production will use the heuristic pre-screen')
    return
  }
  const configured = vars.GEMINI_MODEL ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
  const candidates = [...new Set([configured, 'gemini-2.5-flash', 'gemini-2.0-flash'])]
  for (const model of candidates) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          contents: [{parts: [{text: 'Reply with exactly: OOKPIK'}]}],
          generationConfig: {maxOutputTokens: 16},
        }),
      })
      const text = res.ok
        ? (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        : (await res.text()).slice(0, 120)
      console.log(`[gemini] ${model} → HTTP ${res.status} reply=${JSON.stringify(text)}`)
      if (res.ok) {
        if (model !== configured) console.log(`[gemini] NOTE: configured model ${configured} failed but ${model} works — update GEMINI_MODEL`)
        return
      }
    } catch (e) {
      console.log(`[gemini] ${model} → ERROR ${e.message}`)
    }
  }
}

// 2 + 3. Seeds -----------------------------------------------------------------
const cryptids = JSON.parse(readFileSync(new URL('../data/cryptids.json', import.meta.url), 'utf8'))
const sightings = JSON.parse(readFileSync(new URL('../data/sightings.json', import.meta.url), 'utf8'))
const traits = Object.fromEntries(cryptids.map((c) => [c._id, c.distinctiveTraits ?? []]))

function heuristic(story, traitList, evidenceUrl) {
  let score = 50
  if (story.length >= 300) score += 15
  else if (story.length < 120) score -= 15
  score += evidenceUrl ? 10 : -5
  const lower = story.toLowerCase()
  score += Math.min(20, traitList.filter((t) => lower.includes(t.toLowerCase().split(' ')[0])).length * 7)
  if (['fake', 'made up', 'taxidermy', 'admits', 'control sample', 'prove the pipeline', 'to be rejected'].some((h) => lower.includes(h))) score -= 40
  return Math.max(0, Math.min(100, score))
}

async function weather(lat, lng, observedAt) {
  try {
    const day = observedAt.slice(0, 10)
    const res = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${day}&end_date=${day}&hourly=temperature_2m,precipitation,weathercode&timezone=auto`,
    )
    if (!res.ok) return `HTTP ${res.status}`
    const j = await res.json()
    if (!j?.hourly?.time?.length) return 'no hours'
    return `${j.hourly.temperature_2m?.[12] ?? '?'}°C code=${j.hourly.weathercode?.[12] ?? '?'}`
  } catch (e) {
    return `ERROR ${e.message}`
  }
}

await probeGemini()
for (const s of sightings) {
  const score = heuristic(s.story, traits[s.cryptidId] ?? [], s.evidenceUrl)
  const lane = score >= 90 && s.evidenceUrl ? 'auto-publish' : score >= 80 ? 'agent-verify' : score <= 20 ? 'auto-reject' : 'ranger-review'
  const sky = await weather(s.lat, s.lng, s.observedAt)
  console.log(`[${String(score).padStart(3)} → ${lane.padEnd(13)}] ${s.title} | sky: ${sky}`)
}
console.log('preflight complete')
