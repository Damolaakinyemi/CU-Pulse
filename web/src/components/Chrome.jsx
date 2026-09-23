import { AlertTriangle, RotateCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { isNum, ordinal } from '../lib/format.js'

export function Exhibit({ title, sub, tools, source, className = '', children, id }) {
  return (
    <section className={`exhibit ${className}`} aria-labelledby={id}>
      <header className="exhibit-head">
        <h2 id={id}>
          {title}
          {sub && <span> · {sub}</span>}
        </h2>
        {tools && <div className="tools">{tools}</div>}
      </header>
      <div className="exhibit-body">{children}</div>
      {source && <p className="source">{source}</p>}
    </section>
  )
}

export function Stamp({ kind, children }) {
  return <span className={`stamp ${kind}`}>{children}</span>
}

export function Segmented({ label, options, value, onChange }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Peer position on a rule: IQR box, median tick, institution mark. */
export function PercentileRule({ value, peer, better, compact = false }) {
  // The mark starts on the peer median and travels to its place: distance from typical, shown.
  const [arrived, setArrived] = useState(false)
  useEffect(() => {
    const f = requestAnimationFrame(() => requestAnimationFrame(() => setArrived(true)))
    return () => cancelAnimationFrame(f)
  }, [])
  if (!peer || !isNum(value) || !isNum(peer.p25)) {
    return <div className="pctl pctl-caption">Peer comparison not available</div>
  }
  // Scale spans the peer IQR widened 1.5× each side, always including the value.
  const iqr = peer.p75 - peer.p25 || Math.abs(peer.median) * 0.1 || 0.001
  let lo = Math.min(peer.p25 - iqr * 1.5, value)
  let hi = Math.max(peer.p75 + iqr * 1.5, value)
  const pad = (hi - lo) * 0.04
  lo -= pad
  hi += pad
  const x = (v) => `${((v - lo) / (hi - lo)) * 100}%`
  const pctl = peer.percentile
  return (
    <div
      className="pctl"
      role="img"
      aria-label={`${isNum(pctl) ? `${ordinal(pctl)} percentile of peers` : 'Percentile not available'}${better ? `; ${better} is stronger` : ''}; peer median ${peer.median != null ? (peer.median * 100).toFixed(2) + '%' : 'not available'}`}
    >
      <div className="pctl-track" aria-hidden="true">
        <div className="pctl-iqr" style={{ left: x(peer.p25), width: `calc(${x(peer.p75)} - ${x(peer.p25)})` }} />
        <div className="pctl-median" style={{ left: x(peer.median) }} />
        {/* A full-width slot translated by a percent of its own width = a percent of the track (compositor-only motion). */}
        <div className="pctl-slot" style={{ transform: `translateX(${arrived ? x(value) : x(peer.median)})` }}>
          <div className="pctl-mark" />
        </div>
      </div>
      {compact ? (
        <div className="pctl-caption" aria-hidden="true">
          <span>
            {isNum(pctl) ? `${ordinal(pctl)} pctl` : 'n/a'}
            {better ? ` · ${better} is stronger` : ''}
          </span>
        </div>
      ) : (
        <div className="pctl-caption" aria-hidden="true">
          <span>{isNum(pctl) ? `${ordinal(pctl)} pctl of peers` : 'Percentile n/a'}</span>
          <span>{better === 'higher' ? 'higher is stronger' : better === 'lower' ? 'lower is stronger' : 'peer middle 50%'}</span>
        </div>
      )}
    </div>
  )
}

export function Skeleton({ height = 16, width = '100%', style }) {
  return <div className="skeleton" style={{ height, width, ...style }} aria-hidden="true" />
}

export function ErrorNotice({ error, onRetry, title = 'This section could not load' }) {
  return (
    <div className="notice" role="alert">
      <h2>
        <AlertTriangle size={18} strokeWidth={2} style={{ verticalAlign: -3, marginRight: 8, color: '#b3261e' }} />
        {title}
      </h2>
      <p>{error?.message ?? 'Something went wrong.'}</p>
      {onRetry && (
        <div className="actions">
          <button type="button" className="button" onClick={onRetry}>
            <RotateCw size={14} strokeWidth={2} /> Try again
          </button>
        </div>
      )}
    </div>
  )
}

/** Recharts tooltip content: a ruled readout, same across every synced exhibit. */
export function Readout({ active, payload, label, rows, stamp }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const items = rows(d).filter(Boolean)
  if (!items.length) return null
  const s = stamp?.(d)
  return (
    <div className="readout">
      <div className="readout-q">
        <span>{label ? `${label.slice(4)} ${label.slice(0, 4)}` : ''}</span>
        {s && <Stamp kind={s.kind}>{s.label}</Stamp>}
      </div>
      {items.map(([k, v]) => (
        <div className="readout-row" key={k}>
          <span>{k}</span>
          <b>{v}</b>
        </div>
      ))}
    </div>
  )
}
