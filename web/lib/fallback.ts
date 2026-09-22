import cryptids from '../data/cryptids.json'
import seedSightings from '../data/sightings.json'
import type {Cryptid, Sighting} from './sanity'

interface RawCryptid {
  _id: string
  name: string
  slug: {current: string}
  classification: string
  dangerLevel: number
  status: string
  firstReported?: string
  habitat?: string
  description: string
  distinctiveTraits?: string[]
  imageUrl?: string
}

export function fallbackCryptids(): Cryptid[] {
  return (cryptids as RawCryptid[]).map((c) => ({
    _id: c._id,
    name: c.name,
    slug: c.slug.current,
    classification: c.classification,
    dangerLevel: c.dangerLevel,
    status: c.status,
    habitat: c.habitat,
    description: c.description,
    distinctiveTraits: c.distinctiveTraits,
    imageUrl: c.imageUrl,
  }))
}

/** Pre-seed field cache so the guide is useful before the dataset is seeded. */
export function fallbackSightings(): Sighting[] {
  return (seedSightings as Array<Record<string, unknown>>).map((s, i) => ({
    _id: `seed-${i}`,
    title: s.title as string,
    cryptidId: s.cryptidId as string,
    reporterName: s.reporterName as string,
    observedAt: s.observedAt as string,
    locationName: s.locationName as string,
    lat: s.lat as number,
    lng: s.lng as number,
    story: s.story as string,
    evidenceUrl: (s.evidenceUrl as string) || undefined,
    evidenceType: (s.evidenceType as string) || 'image',
    status: 'submitted',
  }))
}

export function cryptidNameById(id: string): {name: string; slug: string} {
  const c = (cryptids as Array<Record<string, unknown>>).find((x) => x._id === id) as
    | {_id: string; name: string; slug: {current: string}}
    | undefined
  if (!c) return {name: 'Unknown cryptid', slug: ''}
  return {name: c.name as string, slug: (c.slug as {current: string}).current}
}
