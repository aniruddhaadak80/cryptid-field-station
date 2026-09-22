import {createClient, type SanityClient} from '@sanity/client'

export const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'yy3ugxmv'
export const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
const API_VERSION = '2025-08-01'

export const readClient = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: API_VERSION,
  useCdn: true,
})

/** Write client — throws when the server token is missing so routes can 503 honestly. */
export function serverClient(): SanityClient {
  const token = process.env.SANITY_API_TOKEN
  if (!token) throw new Error('SANITY_API_TOKEN is not set')
  return createClient({projectId: PROJECT_ID, dataset: DATASET, apiVersion: API_VERSION, useCdn: false, token})
}

export interface Cryptid {
  _id: string
  name: string
  slug: string
  classification: string
  dangerLevel: number
  status: string
  habitat?: string
  description: string
  distinctiveTraits?: string[]
  imageUrl?: string
}

export interface Sighting {
  _id: string
  title: string
  cryptidId?: string
  cryptidName?: string
  cryptidSlug?: string
  reporterName: string
  observedAt: string
  locationName?: string
  lat?: number
  lng?: number
  story: string
  evidenceUrl?: string
  evidenceType?: string
  status: string
  credibilityScore?: number
  weatherSummary?: string
}

export interface Verification {
  _id: string
  from?: string
  to: string
  actor: string
  note?: string
  decidedAt?: string
  aiScore?: number
  aiVerdict?: string
  aiReasons?: string[]
  weatherSummary?: string
}

const CRYPTID_PROJECTION = `{
  _id, name, "slug": slug.current, classification, dangerLevel, status,
  habitat, description, distinctiveTraits, imageUrl
}`

const SIGHTING_PROJECTION = `{
  _id, title, "cryptidId": cryptid._ref, "cryptidName": cryptid->name,
  "cryptidSlug": cryptid->slug.current, reporterName, observedAt, locationName,
  "lat": location.lat, "lng": location.lng, story, evidenceUrl, evidenceType,
  status, credibilityScore, "weatherSummary": weather.summary
}`

export const queries = {
  cryptids: `*[_type == "cryptid"] | order(name) ${CRYPTID_PROJECTION}`,
  cryptidBySlug: `*[_type == "cryptid" && slug.current == $slug][0] ${CRYPTID_PROJECTION}`,
  sightings: `*[_type == "sighting"] | order(observedAt desc) ${SIGHTING_PROJECTION}`,
  publishedSightings: `*[_type == "sighting" && status == "published"] | order(observedAt desc) ${SIGHTING_PROJECTION}`,
  sightingsForCryptid: `*[_type == "sighting" && cryptid->slug.current == $slug && status in ["verified", "published"]] | order(observedAt desc) ${SIGHTING_PROJECTION}`,
  sightingById: `*[_type == "sighting" && _id == $id][0] ${SIGHTING_PROJECTION}`,
  verificationsFor: `*[_type == "verification" && sighting._ref == $id] | order(decidedAt) {
    _id, from, to, actor, note, decidedAt,
    "aiScore": checks.aiScore, "aiVerdict": checks.aiVerdict,
    "aiReasons": checks.aiReasons, "weatherSummary": checks.weatherSummary
  }`,
}

/** Run a read; on any failure return the fallback and flag cached mode. */
export async function safeFetch<T>(fn: () => Promise<T>, fallback: T): Promise<{data: T; live: boolean}> {
  try {
    const data = await fn()
    if (Array.isArray(data) && data.length === 0) return {data: fallback, live: false}
    if (data === null || data === undefined) return {data: fallback, live: false}
    return {data, live: true}
  } catch {
    return {data: fallback, live: false}
  }
}
