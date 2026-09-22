# 👁️ Cryptid Field Station

A vibe-coded field guide where hikers report **cryptid sightings**, an **AI + human workflow** verifies them, and rangers triage from a live command center.

**Submission for the [Sanity Challenge, Path Two: Vibe-Code Something Strange](https://dev.to/challenges/sanity-2026-09-16)** — Next.js frontend, Sanity as the content backbone, custom Studio input, workflow-as-data runner, and a real-time Ranger app.

- **Live field guide:** https://cryptid-field-station.vercel.app (`web/` on Vercel)
- **Live Ranger Dispatch:** https://cryptid-ranger-dispatch.vercel.app (`ranger/` on Vercel)
- **Sanity project ID:** `yy3ugxmv` (dataset `production`)
- **Studio:** `studio/` (custom video-to-GIF evidence input)
- **Ranger app:** `ranger/` (real-time triage, own UI)
- **Workflow engine:** `web/lib/workflow.ts` (submitted → in-review → verified/rejected → published; agent and ranger use the same transitions)
- **Seed lore:** `seed/` (7 cryptids, 12 sightings, import script)

## Repo layout

| Folder | What it is | Deploy target |
|---|---|---|
| `web/` | Next.js 14 public guide + report form + workflow API | Vercel (root dir `web`) |
| `studio/` | Sanity Studio v3 schemas + EvidenceGif input | `sanity deploy` |
| `ranger/` | Real-time triage app (React 19 + Sanity live data) | Sanity Dashboard / Vercel static |
| `seed/` | `cryptids.json`, `sightings.json`, `import.mjs` | one-shot script |
| `workflows/` | `sighting-review` definition (stages, guards, effects) | docs + mirrored in code |

## Environment

Copy `.env.example` (in `web/`) to `.env.local`. Keys are **server-side only** and never committed:

| Var | Required for | Notes |
|---|---|---|
| `SANITY_API_TOKEN` | report form, transitions, seeding, deploys | project **Editor** token |
| `GEMINI_API_KEY` | AI credibility verdict | Google AI Studio key; heuristic pre-screen runs without it |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | reads | `yy3ugxmv` (public) |
| `NEXT_PUBLIC_SANITY_DATASET` | reads | `production` (public) |

Reads work without any token — the dataset is public. Writes need the token.

## Quick start

```bash
# 1. web app
cd web && npm install && npm run dev

# 2. seed Sanity (needs SANITY_API_TOKEN)
cd seed && npm install && SANITY_API_TOKEN=... npm run import

# 3. studio
cd studio && npm install && npx sanity deploy   # needs `sanity login` first

# 4. ranger app
cd ranger && npm install && npm run dev
```

## Workflow in one picture

`submitted` → (agent: Gemini verdict + Open-Meteo weather check) → `in-review` →
ranger `verified` / `rejected` → ranger (or agent auto, score ≥ 90) `published`.

Every transition is appended to a `verification` document next to the sighting —
one audit trail both the agent and the human write through.
