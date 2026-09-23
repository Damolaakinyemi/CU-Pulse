import { useEffect, useId, useRef, useState } from 'react'
import { GLOSSARY } from '../lib/glossary.js'

/**
 * A term with a plain-language explanation. Hover, focus or tap to open;
 * Esc or tapping elsewhere closes it. Falls back to plain text for unknown ids.
 */
export default function Term({ id, children }) {
  const entry = GLOSSARY[id]
  const [open, setOpen] = useState(false)
  const tipId = useId()
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  if (!entry) return children ?? null
  return (
    <span className="term" ref={ref} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="term-label"
        aria-describedby={tipId}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children ?? entry.term}
      </button>
      <span role="tooltip" id={tipId} className="term-pop" hidden={!open}>
        <b>{entry.term}.</b> {entry.what} <span className="term-why">{entry.why}</span>
      </span>
    </span>
  )
}
