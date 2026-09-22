export interface AiVerdict {
  score: number
  verdict: 'credible' | 'thin' | 'reject'
  reasons: string[]
  source: 'gemini' | 'heuristic'
}

const FAKE_HINTS = ['fake', 'made up', 'taxidermy', 'admits', 'control sample', 'prove the pipeline', 'to be rejected']

/** Deterministic pre-screen — runs everywhere, even with no model key. */
export function heuristicCheck(story: string, traits: string[], evidenceUrl?: string): AiVerdict {
  let score = 50
  const reasons: string[] = []
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
  return {score, verdict: score >= 70 ? 'credible' : score >= 40 ? 'thin' : 'reject', reasons, source: 'heuristic'}
}

/**
 * Skeptical-editor verdict via the Gemini API (direct REST, no extra deps).
 * Falls back to the heuristic when the key is missing or the call fails.
 */
export async function runAiCheck(input: {
  story: string
  traits: string[]
  cryptidName: string
  evidenceUrl?: string
}): Promise<AiVerdict> {
  const fallback = () => heuristicCheck(input.story, input.traits, input.evidenceUrl)
  const key = process.env.GEMINI_API_KEY
  if (!key) return fallback()
  try {
    const model = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash'
    const prompt = `You are a skeptical field editor for a cryptid-watching field guide. Score this sighting report 0-100 for credibility (specificity, internal consistency, match to the cryptid's known traits, honesty about uncertainty). Downgrade hard for stories that admit fabrication.

Cryptid: ${input.cryptidName}
Known traits: ${input.traits.join('; ') || 'none listed'}
Evidence attached: ${input.evidenceUrl ? 'yes' : 'no'}

Report:
${input.story}

Reply with JSON only: {"score": <number>, "verdict": "credible"|"thin"|"reject", "reasons": ["...", "...", "..."]}`
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-goog-api-key': key},
        body: JSON.stringify({
          contents: [{parts: [{text: prompt}]}],
          generationConfig: {responseMimeType: 'application/json', maxOutputTokens: 512},
        }),
      },
    )
    if (!res.ok) return fallback()
    const json = await res.json()
    const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return fallback()
    const parsed = JSON.parse(match[0])
    const score = Math.max(0, Math.min(100, Number(parsed.score) || 0))
    return {
      score,
      verdict: parsed.verdict === 'credible' || parsed.verdict === 'reject' ? parsed.verdict : 'thin',
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 4).map(String) : [],
      source: 'gemini',
    }
  } catch {
    return fallback()
  }
}
