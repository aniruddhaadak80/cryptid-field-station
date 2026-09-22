export interface WeatherContext {
  summary: string
  temperatureC: number
  conditions: string
}

const CODE_LABEL: Record<number, string> = {
  0: 'clear sky', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast',
  45: 'fog', 48: 'rime fog', 51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle',
  61: 'light rain', 63: 'rain', 65: 'heavy rain', 71: 'light snow', 73: 'snow',
  75: 'heavy snow', 80: 'showers', 81: 'showers', 82: 'violent showers',
  95: 'thunderstorm', 96: 'hailstorm',
}

/**
 * External corroboration for the workflow: what was the sky doing over the
 * sighting? Open-Meteo needs no key, so this check runs in every environment.
 */
export async function fetchWeather(lat?: number, lng?: number, observedAt?: string): Promise<WeatherContext | null> {
  if (lat === undefined || lng === undefined || !observedAt) return null
  try {
    const day = observedAt.slice(0, 10)
    const url =
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
      `&start_date=${day}&end_date=${day}&hourly=temperature_2m,precipitation,weathercode&timezone=auto`
    const res = await fetch(url, {next: {revalidate: 86400}})
    if (!res.ok) return null
    const json = await res.json()
    const hours: string[] = json?.hourly?.time ?? []
    if (hours.length === 0) return null
    // Pick the hour closest to the reported time.
    const target = new Date(observedAt).getTime()
    let best = 0
    let bestDelta = Infinity
    hours.forEach((h, i) => {
      const d = Math.abs(new Date(h).getTime() - target)
      if (d < bestDelta) {
        bestDelta = d
        best = i
      }
    })
    const temp = json.hourly.temperature_2m?.[best]
    const precip = json.hourly.precipitation?.[best] ?? 0
    const code = json.hourly.weathercode?.[best] ?? 3
    const conditions = CODE_LABEL[code] ?? 'unknown conditions'
    if (typeof temp !== 'number') return null
    return {
      summary: `${conditions}, ${temp.toFixed(1)}°C, ${precip}mm precip near report hour`,
      temperatureC: temp,
      conditions,
    }
  } catch {
    return null
  }
}
