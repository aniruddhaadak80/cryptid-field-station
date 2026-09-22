import {readClient, queries, safeFetch, type Sighting} from '@/lib/sanity'
import {fallbackSightings, cryptidNameById} from '@/lib/fallback'
import RangerBoard from '@/components/RangerBoard'

export const revalidate = 0

export default async function RangerPage() {
  const res = await safeFetch(() => readClient.fetch<Sighting[]>(queries.sightings), fallbackSightings())
  const enriched = res.data.map((s) => ({
    ...s,
    cryptidName: s.cryptidName ?? cryptidNameById(s.cryptidId ?? '').name,
  }))
  return (
    <>
      <h1>Ranger Board</h1>
      <p className="muted">
        Triage for humans. Pull reports into review, verify the credible, reject the taxidermy —
        each decision lands in the same verification log the agent writes.
      </p>
      <RangerBoard initial={enriched} live={res.live} />
    </>
  )
}
