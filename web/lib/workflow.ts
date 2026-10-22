import type {SanityClient} from '@sanity/client'

export const STATUSES = ['submitted', 'in-review', 'verified', 'rejected', 'published'] as const
export type Status = (typeof STATUSES)[number]
export type Actor = 'agent' | 'ranger' | 'system'

/** The whole review process as data: every edge both the agent and the ranger use. */
const ALLOWED: Record<Status, Status[]> = {
  submitted: ['in-review'],
  'in-review': ['verified', 'rejected'],
  verified: ['published'],
  // A ranger can overturn an auto-rejection and send the report back to
  // review; no other status leaves 'rejected'.
  rejected: ['in-review'],
  published: [],
}

/** Transitions that only a human may make. */
const RANGER_ONLY: Record<Status, Status[]> = {
  submitted: [],
  'in-review': [],
  verified: [],
  rejected: ['in-review'],
  published: [],
}

export const AUTO_PUBLISH_SCORE = 90
export const AUTO_REJECT_SCORE = 20

export function canTransition(from: string, to: string): boolean {
  return (ALLOWED[from as Status] ?? []).includes(to as Status)
}

/** True when only a ranger may make this move (e.g. overturning a rejection). */
export function requiresRanger(from: string, to: string): boolean {
  return (RANGER_ONLY[from as Status] ?? []).includes(to as Status)
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

/** The submission payload the intake route accepts, after validation. */
export interface SubmissionInput {
  title: string
  cryptidId: string
  reporterName: string
  observedAt: string
  story: string
  locationName?: string
  lat?: number
  lng?: number
  evidenceUrl?: string
  evidenceType: 'image' | 'video'
}

export interface SubmissionValidation {
  ok: boolean
  error?: string
  value?: SubmissionInput
}

const STORY_MIN = 80

/**
 * Validate an intake payload.
 *
 * `observedAt` has to be a date the server can read: `new Date(x).toISOString()`
 * throws on an unparseable value, which used to turn a malformed report into a
 * 500 instead of a 400.
 */
export function validateSubmission(body: unknown): SubmissionValidation {
  const b = (body ?? {}) as Record<string, unknown>
  const title = typeof b.title === 'string' ? b.title.trim() : ''
  const cryptidId = typeof b.cryptidId === 'string' ? b.cryptidId.trim() : ''
  const reporterName = typeof b.reporterName === 'string' ? b.reporterName.trim() : ''
  const observedAtRaw = typeof b.observedAt === 'string' ? b.observedAt.trim() : ''
  const story = typeof b.story === 'string' ? b.story : ''

  if (!title || !cryptidId || !reporterName || !observedAtRaw || story.length < STORY_MIN) {
    return {
      ok: false,
      error: `Missing fields — title, cryptid, reporter, date, and a ${STORY_MIN}+ character story are required.`,
    }
  }

  const observedAt = new Date(observedAtRaw)
  if (Number.isNaN(observedAt.getTime())) {
    return {ok: false, error: 'observedAt must be a date the server can read (for example 2026-09-24T21:00:00.000Z).'}
  }

  const locationName = typeof b.locationName === 'string' ? b.locationName.trim() : ''
  const evidenceUrl = typeof b.evidenceUrl === 'string' ? b.evidenceUrl.trim() : ''

  return {
    ok: true,
    value: {
      title,
      cryptidId,
      reporterName,
      observedAt: observedAt.toISOString(),
      story,
      locationName: locationName || undefined,
      lat: typeof b.lat === 'number' ? b.lat : undefined,
      lng: typeof b.lng === 'number' ? b.lng : undefined,
      evidenceUrl: evidenceUrl || undefined,
      evidenceType: b.evidenceType === 'video' ? 'video' : 'image',
    },
  }
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
  if (requiresRanger(from, input.to) && input.actor !== 'ranger') {
    throw new Error(`Only a ranger can move a ${from} sighting to ${input.to}`)
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
