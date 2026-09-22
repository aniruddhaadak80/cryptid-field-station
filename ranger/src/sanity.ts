import {createClient} from '@sanity/client'

export const WEB_URL = (import.meta.env.VITE_WEB_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export const sanity = createClient({
  projectId: 'yy3ugxmv',
  dataset: 'production',
  apiVersion: '2025-08-01',
  useCdn: false, // listens need the live stream, not the CDN
})

export interface Sighting {
  _id: string
  title: string
  cryptidName?: string
  locationName?: string
  observedAt: string
  status: string
  credibilityScore?: number
}

export const SIGHTINGS_QUERY = `*[_type == "sighting"] | order(observedAt desc) {
  _id, title, "cryptidName": cryptid->name, locationName, observedAt, status, credibilityScore
}`
