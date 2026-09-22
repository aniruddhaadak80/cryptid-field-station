/**
 * sighting-review — the review process as data.
 *
 * Shape mirrors the Sanity Workflows cookbook (editorial review + AI content
 * pipeline): stages, guarded transitions, and effects. The runnable version
 * of this exact definition lives in `web/lib/workflow.ts` + the
 * `/api/sightings*` routes, with each transition appended to a
 * `verification` document so the agent and the ranger share one audit trail.
 */
export const sightingReview = {
  name: 'sighting-review',
  subject: 'sighting',
  stages: ['submitted', 'in-review', 'verified', 'rejected', 'published'],
  transitions: [
    {from: 'submitted', to: 'in-review', via: ['agent', 'ranger'], effect: 'runChecks'},
    {from: 'in-review', to: 'verified', via: ['agent', 'ranger'], effect: 'approve', guard: 'score >= 80 or ranger override'},
    {from: 'in-review', to: 'rejected', via: ['agent', 'ranger'], effect: 'reject', guard: 'score <= 20 or ranger call'},
    {from: 'verified', to: 'published', via: ['agent', 'ranger'], effect: 'publish', guard: 'score >= 90 auto, else ranger'},
  ],
  effects: {
    // Cookbook "AI content pipeline": automated checks first, human only where it matters.
    runChecks: ['aiCredibilityVerdict', 'weatherCorroboration'],
    aiCredibilityVerdict: {model: 'GEMINI_MODEL (default gemini-2.5-flash)', fallback: 'heuristic pre-screen', impl: 'web/lib/ai-check.ts'},
    // External API call inside the workflow.
    weatherCorroboration: {api: 'Open-Meteo archive (no key)', impl: 'web/lib/weather.ts'},
    approve: {impl: 'POST /api/sightings/[id]/transition {to: verified, actor: ranger}'},
    reject: {impl: 'POST /api/sightings/[id]/transition {to: rejected, actor: ranger}'},
    publish: {impl: 'POST /api/sightings/[id]/transition {to: published, actor: ranger|agent}'},
  },
  audit: 'every transition appends a `verification` document (from, to, actor, note, checks)',
}
