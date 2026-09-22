import {readClient, queries, safeFetch, type Cryptid} from '@/lib/sanity'
import {fallbackCryptids} from '@/lib/fallback'
import ReportForm from '@/components/ReportForm'

export const revalidate = 60

export default async function ReportPage({searchParams}: {searchParams: {cryptid?: string}}) {
  const res = await safeFetch(() => readClient.fetch<Cryptid[]>(queries.cryptids), fallbackCryptids())
  const options = res.data.map((c) => ({_id: c._id, name: c.name, slug: c.slug}))
  const uplink = Boolean(process.env.SANITY_API_TOKEN)
  const preselect = searchParams.cryptid
  void preselect
  return (
    <>
      <h1>File a sighting</h1>
      <p className="muted">
        Tell it straight — including what makes you unsure. The agent scores honesty, pulls the actual
        weather for your coordinates, and a ranger makes the final call. Fabrications are welcome only as
        control samples (ask our jackalope).
      </p>
      <ReportForm cryptids={options} uplink={uplink} />
    </>
  )
}
