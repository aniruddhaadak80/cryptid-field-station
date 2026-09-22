import type {SanityClient} from '@sanity/client'

export const STATUSES = ['submitted', 'in-review', 'verified', 'rejected', 'published'] as const
export type Status = (typeof STATUSES)[number]
export type Actor = 'agent' | 'ranger' | 'system'

/** The whole review process as data: every edge both the agent and the ranger use. */
const ALLOWED: Record<Status, Status[]> = {
  submitted: ['in-review'],
  'in-review': ['verified', 'rejected'],
  verified: ['published'],
  rejected: [],
  published: [],
}

export const AUTO_PUBLISH_SCORE = 90
export const AUTO_REJECT_SCORE = 20

export function canTransition(from: string, to: string): boolean {
  return (ALLOWED[from as Status] ?? []).includes(to as Status)
}

export interface Checks {
  aiScore: number | null
  aiVerdict: string
  aiReasons: string[]
  weatherSummary: string | null
}

export interface TransitionInput {
  sightingId: string
  to: Status
  actor: Actor
  note?: string
  checks?: Checks
  score?: number
  weather?: {summary: string; temperatureC?: number; conditions?: string}
}

/**
 * Single choke point for every status change. Patches the sighting, then
 * appends a `verification` document — the audit trail the agent and the
 * ranger share, so a draft moves forward no matter who pushes it.
 */
export async function transition(client: SanityClient, input: TransitionInput) {
  const current = await client.fetch<{status: string} | null>(
    `*[_type == "sighting" && _id == $id][0]{status}`,
    {id: input.sightingId},
  )
  const from = current?.status ?? 'unknown'
  if (!canTransition(from, input.to)) {
    throw new Error(`Illegal transition ${from} → ${input.to}`)
  }
  const patch: Record<string, unknown> = {status: input.to}
  if (typeof input.score === 'number') patch.credibilityScore = input.score
  if (input.weather) patch.weather = input.weather
  await client.patch(input.sightingId).set(patch).commit()
  const log = await client.create({
    _type: 'verification',
    sighting: {_type: 'reference', _ref: input.sightingId},
    from,
    to: input.to,
    actor: input.actor,
    note: input.note,
    checks: input.checks,
    decidedAt: new Date().toISOString(),
  })
  return {from, to: input.to, logId: log._id as string}
}
