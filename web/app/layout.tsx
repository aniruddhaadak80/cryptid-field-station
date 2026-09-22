import type {Metadata} from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cryptid Field Station',
  description: 'Report cryptid sightings, watch an AI + ranger workflow verify them, browse the field guide.',
  openGraph: {
    title: 'Cryptid Field Station',
    description: 'Report it. Check it. Publish it. A Sanity-powered cryptid field guide.',
    images: ['/og'],
  },
  twitter: {card: 'summary_large_image', images: ['/og']},
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <nav>
            <Link className="brand" href="/">👁️ Cryptid Field Station</Link>
            <div className="links">
              <Link href="/guide">Field Guide</Link>
              <Link href="/sightings">Sightings</Link>
              <Link href="/report">Report</Link>
              <Link href="/ranger">Ranger Board</Link>
            </div>
          </nav>
        </header>
        <main className="wrap">{children}</main>
        <footer className="foot">
          Structured content in Sanity (project <code>yy3ugxmv</code>) · Sanity Challenge · Path Two entry
        </footer>
      </body>
    </html>
  )
}
