/** Delete a sighting and its verification logs. Usage: SANITY_API_TOKEN=... node cleanup-probe.mjs <sightingId> */
import {createClient} from '@sanity/client'

const id = process.argv[2]
if (!id) {
  console.error('pass a sighting id')
  process.exit(1)
}
const token = process.env.SANITY_API_TOKEN
if (!token) {
  console.error('set SANITY_API_TOKEN')
  process.exit(1)
}
const client = createClient({projectId: 'yy3ugxmv', dataset: 'production', apiVersion: '2025-08-01', useCdn: false, token})
const logs = await client.fetch(`*[_type == "verification" && sighting._ref == $id]._id`, {id})
for (const l of logs) await client.delete(l)
await client.delete(id)
console.log(`deleted ${id} + ${logs.length} logs`)
