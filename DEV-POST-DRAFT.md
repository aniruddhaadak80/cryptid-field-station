---
title: I Vibe-Coded a Cryptid-Reporting Station on Sanity (and the Workflow Rejects Bigfoot Blurs)
published: false
tags: devchallenge, sanitychallenge, sanity, ai
---

*This is a submission for the [Sanity Challenge, Path Two: Vibe-Code Something Strange](https://dev.to/challenges/sanity-2026-09-16)*

## What I Built

**Cryptid Field Station** — a field guide where hikers report cryptid sightings, an AI + human workflow verifies them, and rangers triage from a live command center.

- Hikers file sightings (story, coordinates, photo/video evidence) from the public site.
- On intake, an **agent** runs two checks in parallel: an AI credibility verdict — Gemini via a skeptical-editor prompt, with a deterministic heuristic pre-screen as stand-in when no valid key is configured — and an **Open-Meteo weather pull** for the actual sky that night (an external API call inside the workflow; verified live for all 12 seed coordinates).
- Strong reports auto-advance (`submitted → in-review → verified → published`); obvious fabrications auto-reject; everything in between waits for a human **ranger**, who verifies/rejects/publishes through the *same transitions* the agent uses.
- Every transition appends a `verification` document next to the sighting — one audit trail, two authors (agent + human).
- Published sightings join the cryptid's field-guide entry with the full trail attached.

The control sample is my favorite part: the seed data includes a jackalope report that openly admits to being taxidermy. If the pipeline ever publishes it, the pipeline is broken. It gets rejected.

## Demo

- 🌲 Field guide + report form: https://cryptid-field-station.vercel.app
- 🛖 Ranger Dispatch board (real-time triage): https://cryptid-ranger-dispatch.vercel.app
- 🖥️ Sanity Studio: https://cryptid-field-station.sanity.studio (live; Sanity login required — the custom `EvidenceGifInput` sits on every sighting's evidence field)
- 🎬 Walkthrough: the deployments above *are* the demo — no login needed on the guide or board. Live state: 7 cryptids, 12 sightings (5 published, 1 verified, 3 rejected, 3 open for review), every transition audit-logged in `verification` docs. Intake probe-tested end to end (a test report scored 45 → `in-review` with weather attached, then removed).

Try it: file a sighting at `/report` (lat/lng optional but the weather check loves them), then watch it land in the Ranger Board's `submitted` lane and move through review.

## Code

- Repo: https://github.com/aniruddhaadak80/cryptid-field-station
- `web/` — Next.js 14 guide + workflow API routes (`/api/sightings`, `/transition`)
- `studio/` — 4 schemas + custom `EvidenceGifInput` (paste a trail-cam video URL, get a preview + capturable 6-frame GIF-strip)
- `ranger/` — real-time triage app (live Sanity subscription, own UI)
- `workflows/sighting-review.ts` — the review process as data (stages, guards, effects)
- `seed/` — 7 cryptids, 12 sightings with mixed fates, idempotent importer

## My Build Process

**IDE:** OpenCode (agentic, autonomous) powered by Muse Spark — prompted end-to-end, no interactive Studio clicking for the build itself.

**Prompts that worked:** "scaffold a monorepo with these four folders and make every app build before touching Sanity" (got three green builds in a row); "every write path goes through one `transition()` function" (kept agent + ranger honest); "reads must work with an empty dataset" (the baked-in field cache, which saved the demo before seeding).

**Prompts that didn't:** asking for the App SDK with `@sanity/sdk-react` from memory — I couldn't pin the exact provider API without docs in hand, so I course-corrected to a real-time custom app on `@sanity/client` `listen()` with its own UI, which is what the bonus actually asks for ("your own interface, instead of another read-only frontend"). The workflow engine went the same way: rather than fight the early-access `@sanity/workflow-engine` setup, I modeled the process as data (`status` + `verification` docs, cookbook-mapped in `workflows/`), which runs on any plan today.

**Where it got stuck:** an npm cache corruption on `esbuild` killed the Studio install (fixed with `--prefer-online` retry); the Vercel CLI hung on update-notifier checks in a non-TTY shell (fixed with `NO_UPDATE_NOTIFIER=1`); a TS slug-shape mismatch between raw seed JSON and the `Cryptid` type (fixed by mapping `slug.current` at the fallback boundary).

**Past the Studio:** yes to both bonuses. The Ranger app is a custom real-time surface with live updates and approve/reject/publish actions — not Studio, not read-only. The workflow is data: the agent moves drafts forward (triage, auto-verify ≥90, auto-reject ≤20) and the ranger approves through identical transitions, all audit-logged side by side.

## Sanity Project Details

- **Project ID:** `yy3ugxmv` (dataset `production`)
- **Public dataset query:** https://yy3ugxmv.api.sanity.io/v2025-08-01/data/query/production?query=*%5B_type%20%3D%3D%20%22cryptid%22%5D
- **Schemas:** `cryptid` (classification, danger 1–5, traits, habitat), `sighting` (cryptid ref, geopoint, evidence URL+type, workflow-owned `status`, cached weather), `expedition` (cryptid/sighting refs for joint field pushes), `verification` (from/to/actor/note/checks per transition)
- **Thoughtfulness notes:** `status` and `credibilityScore` are `readOnly` in Studio — the workflow owns them, humans use the board; evidence type drives conditional rendering (video player vs image); the jackalope is `debunked` by design as a pipeline control.

## Agent Session

Built autonomously in OpenCode; transcript available on request. Key decision log: monorepo-first, cache-first reads, one-transition-function rule, honest 503s when the write token is absent.
