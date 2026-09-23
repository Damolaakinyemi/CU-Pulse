import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { prefersReducedMotion } from './motion.js'

export const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'trends', label: 'Trends' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'peers', label: 'Peers' },
  { id: 'stress', label: 'Stress test' },
  { id: 'method', label: 'Method' },
]

/** Hash routes: #/cu/5536/forecast, #/cu/5536/report */
export const PAGES = ['case-study', 'accuracy', 'glossary']

function parse(full) {
  const hash = full.split('?')[0]
  const page = hash.match(/^#\/([a-z-]+)$/)
  if (page && PAGES.includes(page[1])) return { cu: null, section: page[1] }
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
      const next = parse(window.location.hash)
      if (document.startViewTransition && !prefersReducedMotion()) {
        document.startViewTransition(() => flushSync(() => setRoute(next)))
      } else {
        setRoute(next)
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return route
}

export function go(cu, section) {
  window.location.hash = href(cu, section)
}

function readParams() {
  const q = window.location.hash.split('?')[1]
  return new URLSearchParams(q ?? '')
}

/**
 * A setting kept in the link itself (#/cu/5536/stress?severity=80), so a scenario
 * or view can be shared and survives a reload. Writes with replaceState, so it
 * neither adds history entries nor triggers navigation.
 */
export function useHashParam(name, fallback) {
  const [value, setValue] = useState(() => readParams().get(name) ?? fallback)
  useEffect(() => {
    const onHash = () => setValue(readParams().get(name) ?? fallback)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [name, fallback])
  const set = (next) => {
    const [path] = window.location.hash.split('?')
    const params = readParams()
    if (next == null || next === fallback) params.delete(name)
    else params.set(name, next)
    const qs = params.toString()
    window.history.replaceState(null, '', `${path}${qs ? `?${qs}` : ''}`)
    setValue(next ?? fallback)
  }
  return [value, set]
}

/** Scroll to an in-page section without touching the route. */
export function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
