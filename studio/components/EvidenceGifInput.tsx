import {useEffect, useRef, useState} from 'react'
import {set, unset, type StringInputProps} from 'sanity'

const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url)

/**
 * Custom Studio input for sighting evidence. Paste an image or video URL and
 * get an instant preview; for video it captures 6 frames into a filmstrip so
 * rangers can skim a "trail-cam clip" without pressing play — our lightweight
 * take on the video-to-GIF component idea.
 */
export function EvidenceGifInput(props: StringInputProps) {
  const {value, onChange, elementProps} = props
  const videoRef = useRef<HTMLVideoElement>(null)
  const [frames, setFrames] = useState<string[]>([])
  const [status, setStatus] = useState('')

  const url = value ?? ''
  const showVideo = isVideo(url)

  useEffect(() => {
    setFrames([])
    setStatus('')
  }, [url])

  const captureStrip = async () => {
    const video = videoRef.current
    if (!video) return
    setStatus('Capturing frames…')
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 160
      canvas.height = 90
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const out: string[] = []
      const duration = video.duration || 10
      for (let i = 0; i < 6; i++) {
        video.currentTime = (duration / 7) * (i + 1)
        await new Promise((res) => {
          const onSeek = () => {
            video.removeEventListener('seeked', onSeek)
            res(null)
          }
          video.addEventListener('seeked', onSeek)
          setTimeout(() => res(null), 800)
        })
        ctx.drawImage(video, 0, 0, 160, 90)
        out.push(canvas.toDataURL('image/jpeg', 0.6))
      }
      setFrames(out)
      setStatus('6-frame strip ready — skim the clip at a glance.')
    } catch {
      setStatus('Could not capture frames (the host may block cross-origin reads).')
    }
  }

  return (
    <div style={{display: 'grid', gap: 8}}>
      <input
        {...elementProps}
        value={url}
        placeholder="https://… .jpg, .png, .mp4, .webm"
        onChange={(e) => onChange(e.target.value ? set(e.target.value) : unset())}
        style={{width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc'}}
      />
      {url && !showVideo && (
        <img src={url} alt="evidence preview" style={{maxWidth: '100%', borderRadius: 6}} />
      )}
      {url && showVideo && (
        <div style={{display: 'grid', gap: 8}}>
          <video ref={videoRef} src={url} controls muted playsInline style={{maxWidth: '100%', borderRadius: 6}} crossOrigin="anonymous" />
          <button type="button" onClick={captureStrip} style={{justifySelf: 'start', padding: '6px 12px', borderRadius: 6, cursor: 'pointer'}}>
            🎞 Capture GIF-strip
          </button>
          {status && <small>{status}</small>}
          {frames.length > 0 && (
            <div style={{display: 'flex', gap: 4, flexWrap: 'wrap'}}>
              {frames.map((f, i) => (
                <img key={i} src={f} alt={`frame ${i + 1}`} width={160} style={{borderRadius: 4}} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
