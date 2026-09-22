import { useEffect, useState } from 'react'

export const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'trends', label: 'Trends' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'peers', label: 'Peers' },
  { id: 'stress', label: 'Stress test' },
  { id: 'method', label: 'Method' },
]

/** Hash routes: #/cu/5536/forecast, #/cu/5536/report */
function parse(hash) {
  const m = hash.match(/^#\/cu\/(\d+)(?:\/([a-z]+))?/)
  if (!m) return { cu: null, section: 'home' }
  const section = m[2] && (m[2] === 'report' || SECTIONS.some((s) => s.id === m[2])) ? m[2] : 'overview'
  return { cu: Number(m[1]), section }
}

export const href = (cu, section = 'overview') => `#/cu/${cu}${section === 'overview' ? '' : `/${section}`}`

export function useRoute() {
  const [route, setRoute] = useState(() => parse(window.location.hash))
  useEffect(() => {
    const onHash = () => {
      setRoute(parse(window.location.hash))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return route
}

export function go(cu, section) {
  window.location.hash = href(cu, section)
}
