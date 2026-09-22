export function Badge({status}: {status: string}) {
  const cls = `badge b-${status.replace('-', '-')}`
  return <span className={cls}>{status}</span>
}

export function CacheNote({live}: {live: boolean}) {
  if (live) return null
  return (
    <div className="cache">
      📡 Showing the baked-in field cache — the Sanity dataset is empty or unreachable. Run the seed script and this page goes live automatically.
    </div>
  )
}
