import {ImageResponse} from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 90,
          background: '#0c1210',
          color: '#e8f0e9',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{fontSize: 28, color: '#7cf2a8', letterSpacing: 4}}>FIELD STATION // EST. 2026</div>
        <div style={{fontSize: 84, fontWeight: 800, marginTop: 12}}>Cryptid Field Station</div>
        <div style={{width: 220, height: 6, background: '#7cf2a8', margin: '28px 0'}} />
        <div style={{fontSize: 34, color: '#9db3a4'}}>Report it. Check it. Publish it.</div>
      </div>
    ),
    {width: 1200, height: 630},
  )
}
