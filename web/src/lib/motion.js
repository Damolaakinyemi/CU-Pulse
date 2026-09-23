import { useEffect, useRef, useState } from 'react'

export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))

/**
 * A number that glides to its new value (exponential ease-out) instead of jumping,
 * so a changed outcome reads as a consequence. Instant under reduced motion.
 */
export function useTween(target, duration = 240) {
  const [shown, setShown] = useState(target)
  const from = useRef(target)
  const frame = useRef(0)

  useEffect(() => {
    if (!Number.isFinite(target) || prefersReducedMotion()) {
      from.current = target
      frame.current = requestAnimationFrame(() => setShown(target))
      return () => cancelAnimationFrame(frame.current)
    }
    const start = performance.now()
    const origin = Number.isFinite(from.current) ? from.current : target
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const v = origin + (target - origin) * easeOutExpo(t)
      from.current = v
      setShown(v)
      if (t < 1) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame.current)
  }, [target, duration])

  return shown
}

/**
 * Rows whose numeric fields (and [lo, hi] pairs) glide from their previous values to
 * the new ones. The chart itself never animates, so it always settles exactly on the data.
 */
export function useTweenRows(input, duration = 240) {
  // Keyed on content, not identity: callers rebuild rows every render.
  const sig = JSON.stringify(input)
  const [shown, setShown] = useState(input)
  const prev = useRef(input)
  const frame = useRef(0)

  useEffect(() => {
    const rows = JSON.parse(sig)
    const from = prev.current
    const same = from.length === rows.length && from.every((r, i) => r.quarter === rows[i].quarter)
    if (!same || prefersReducedMotion()) {
      prev.current = rows
      frame.current = requestAnimationFrame(() => setShown(rows))
      return () => cancelAnimationFrame(frame.current)
    }
    const mix = (a, b, t) => {
      if (Array.isArray(b)) return Array.isArray(a) ? b.map((v, k) => mix(a[k], v, t)) : b
      return Number.isFinite(a) && Number.isFinite(b) ? a + (b - a) * t : b
    }
    const start = performance.now()
    const step = (now) => {
      const t = easeOutExpo(Math.min(1, (now - start) / duration))
      const next = rows.map((r, i) => {
        const out = { ...r }
        for (const k of Object.keys(r)) out[k] = mix(from[i][k], r[k], t)
        return out
      })
      prev.current = next
      setShown(next)
      if (t < 1) frame.current = requestAnimationFrame(step)
      else prev.current = rows
    }
    frame.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame.current)
  }, [sig, duration])

  return shown
}
