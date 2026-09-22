import {NextResponse} from 'next/server'
import {serverClient} from '@/lib/sanity'
import {transition, STATUSES, type Actor, type Status} from '@/lib/workflow'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, {params}: {params: {id: string}}) {
  const id = decodeURIComponent(params.id)
  if (id.startsWith('seed-')) {
    return NextResponse.json({error: 'That card is field-cache, not a live document — seed the dataset first.'}, {status: 409})
  }
  let client
  try {
    client = serverClient()
  } catch {
    return NextResponse.json({error: 'Ranger uplink offline: SANITY_API_TOKEN is not configured.'}, {status: 503})
  }
  try {
    const body = await req.json()
    const {to, actor, note} = body ?? {}
    if (!STATUSES.includes(to)) return NextResponse.json({error: `Unknown status ${to}`}, {status: 400})
    if (actor !== 'ranger' && actor !== 'agent') {
      return NextResponse.json({error: 'Actor must be ranger or agent.'}, {status: 400})
    }
    const result = await transition(client, {
      sightingId: id,
      to: to as Status,
      actor: actor as Actor,
      note: note ? String(note).slice(0, 500) : undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({error: err instanceof Error ? err.message : 'Transition failed'}, {status: 400})
  }
}
