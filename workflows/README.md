# Workflows

The review process is modeled **as data next to the content**: a sighting carries
`status`, and every move appends a `verification` document (`from`, `to`,
`actor`, `note`, `checks`). The agent and the ranger advance drafts through the
**same transitions** — `web/lib/workflow.ts:transition()` is the single choke
point both use.

Cookbook mapping (Sanity Workflows cookbook → this repo):

| Cookbook recipe | Here |
|---|---|
| Editorial review (assign → draft → review → publish, rejection loops back) | `submitted → in-review → verified/rejected → published` (`sighting-review.ts`) |
| AI content pipeline (agent drafts, automated checks, human steps in on flags) | Agent triage on intake: Gemini verdict + Open-Meteo weather; clean extremes auto-move, the middle waits for a ranger |
| Coordinated release | `expedition` groups sightings for a joint field push (schema + Studio) |
| Triggers / effects | `runChecks` effect on intake; external API call (Open-Meteo) inside the workflow |

Why documents instead of the early-access engine: the transitions, guards, and
audit trail run today on any plan, against the live dataset, with zero extra
infrastructure — and the definition ports 1:1 to `@sanity/workflow-engine`
when the team adopts it.
