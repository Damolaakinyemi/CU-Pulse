import { ArrowDown } from 'lucide-react'
import { useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { isNum, ordinal, pct, quarter, quarterTick, usd } from '../lib/format.js'
import { extent, niceStep, niceTicks, zonesInView } from '../lib/chartmath.js'
import { AXIS, C, GRID } from '../lib/theme.js'
import { Readout } from './Chrome.jsx'

const SYNC = 'cu-quarter'

/** Round tick positions (1, 2, 2.5, 5 × 10ⁿ steps) covering the domain. */
/** Percent axis labels carry only the decimals the tick step needs. */
function pctAxis(domain, target) {
  const step = niceStep(domain, target) * 100
  const digits = step >= 1 ? 0 : step >= 0.1 ? 1 : 2
  return (v) => pct(v, digits)
}


function niceDomain([lo, hi], { floor, pad = 0.12 } = {}) {
  if (!isNum(lo)) return [0, 1]
  const span = hi - lo || Math.abs(hi) * 0.1 || 0.01
  let a = lo - span * pad
  const b = hi + span * pad
  if (floor != null) a = Math.max(a, floor)
  return [a, b]
}

const TIERS = [
  { y1: 0.06, y2: 0.07, fill: 'url(#hatch-light)', label: 'Adequately capitalized' },
  { y1: 0.04, y2: 0.06, fill: 'url(#hatch)', label: 'Undercapitalized' },
  { y1: -1, y2: 0.04, fill: 'url(#hatch-dense)', label: 'Significantly under' },
]

/**
 * Net worth ratio tiers (12 CFR 702.102) as graded, ruled depth bands. When the
 * axis stops above 7%, the line is drawn at the plot floor and says how far off-scale it is.
 */
function PcaZones({ domain }) {
  const [lo, hi] = domain
  const label = { position: 'insideBottomLeft', fill: C.breach, fontSize: 10.5, fontWeight: 600, dy: -3 }
  if (lo >= 0.07) return null // FanChart annotates an off-scale line below the plot instead
  return (
    <>
      {TIERS.filter((t) => lo < t.y2).map((t) => (
        <ReferenceArea
          key={t.label}
          y1={Math.max(lo, t.y1)}
          y2={t.y2}
          fill={t.fill}
          fillOpacity={1}
          ifOverflow="hidden"
          label={t.y2 - Math.max(lo, t.y1) > (hi - lo) * 0.06 ? { value: t.label, position: 'insideRight', fill: C.breach, fontSize: 10, fontWeight: 600, fillOpacity: 0.8 } : undefined}
        />
      ))}
      {lo < 0.04 && <ReferenceLine y={0.04} stroke={C.breach} strokeOpacity={0.5} strokeWidth={0.75} />}
      {lo < 0.06 && <ReferenceLine y={0.06} stroke={C.breach} strokeOpacity={0.6} strokeWidth={0.75} />}
      <ReferenceLine y={0.07} stroke={C.breach} strokeWidth={1.25} label={{ ...label, value: 'Well capitalized 7%' }} />
    </>
  )
}

function Hatches() {
  return (
    <defs>
      <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        <rect width="5" height="5" fill="rgba(179,38,30,0.05)" />
        <line x1="0" y1="0" x2="0" y2="5" stroke={C.breach} strokeWidth="1" strokeOpacity="0.45" />
      </pattern>
      <pattern id="hatch-light" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        <line x1="0" y1="0" x2="0" y2="7" stroke={C.breach} strokeWidth="0.75" strokeOpacity="0.28" />
      </pattern>
      <pattern id="hatch-dense" width="3.5" height="3.5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        <rect width="3.5" height="3.5" fill="rgba(179,38,30,0.09)" />
        <line x1="0" y1="0" x2="0" y2="3.5" stroke={C.breach} strokeWidth="1" strokeOpacity="0.55" />
      </pattern>
    </defs>
  )
}

/**
 * Reported history in ink and the four-quarter projection as a graded fan.
 * rows: [{ quarter, actual?, point?, b50?, b80?, b95? }]
 */
export function FanChart({ rows, format, height = 300, zones = false, ratio = zones, reveal = true, label = 'Value' }) {
  const [showTiers, setShowTiers] = useState(false)
  const [lo, hi] = extent(rows, ['actual', 'b95'])
  let domain = niceDomain([lo, hi])
  // Bring the capital tiers into view when capital is within 3 points of 7%, or on request.
  if (zones && (zonesInView(rows) || showTiers)) domain = [Math.min(domain[0], showTiers ? 0.035 : 0.064), domain[1]]
  // A ratio cannot fall below zero; do not draw a fan into impossible territory.
  if (ratio) domain = [Math.max(domain[0], 0), domain[1]]
  const current = [...rows].reverse().find((r) => isNum(r.actual))
  const axisFormat = ratio ? pctAxis(domain, 5) : format
  const origin = rows.find((r) => r.origin)?.quarter
  const last = rows[rows.length - 1]
  const offScale = zones && domain[0] >= 0.07
  const summary = [
    current && `${label} ${format(current.actual)} reported for ${quarter(current.quarter)}`,
    last && isNum(last.point) && !last.origin && `projected ${format(last.point)} by ${quarter(last.quarter)}, 80% range ${format(last.b80[0])} to ${format(last.b80[1])}`,
  ].filter(Boolean).join('; ')

  return (
    <figure className="chart-figure" aria-label={summary}>
    <div className={`chart ${reveal ? 'fan-reveal' : ''}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} syncId={SYNC} accessibilityLayer title={`${label}, reported and projected. Use the arrow keys to step through quarters.`} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
          <Hatches />
          <CartesianGrid {...GRID} />
          {origin && <ReferenceArea x1={origin} x2={last?.quarter} fill={C.fan} fillOpacity={0.035} ifOverflow="hidden" />}
          {zones && <PcaZones domain={domain} />}
          <XAxis dataKey="quarter" {...AXIS} tickFormatter={quarterTick} interval={0} minTickGap={0} height={22} />
          <YAxis {...AXIS} domain={domain} ticks={niceTicks(domain, 5)} tickFormatter={(v) => axisFormat(v)} width={62} allowDataOverflow />
          <Area className="fan-area" dataKey="b95" stroke="none" fill={C.fan95} fillOpacity={1} isAnimationActive={false} activeDot={false} connectNulls />
          <Area className="fan-area" dataKey="b80" stroke="none" fill={C.fan80} fillOpacity={1} isAnimationActive={false} activeDot={false} connectNulls />
          <Area className="fan-area" dataKey="b50" stroke="none" fill={C.fan50} fillOpacity={1} isAnimationActive={false} activeDot={false} connectNulls />
          <Line className="fan-area" dataKey="point" stroke={C.fanInk} strokeWidth={1.75} strokeDasharray="4 3" dot={false} isAnimationActive={false} connectNulls activeDot={{ r: 3.5, fill: C.fanInk, stroke: C.sheet }} />
          <Line dataKey="actual" stroke={C.ink} strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 4, fill: C.ink, stroke: C.sheet, strokeWidth: 2 }} />
          {origin && <ReferenceLine x={origin} stroke={C.ink3} strokeDasharray="2 3" label={{ value: 'Last filing', position: 'insideTopRight', fill: C.ink3, fontSize: 10.5, dx: -2 }} />}
          <Tooltip
            cursor={{ stroke: C.ink, strokeWidth: 1 }}
            isAnimationActive={false}
            content={
              <Readout
                stamp={(d) => (isNum(d.actual) ? { kind: 'reported', label: 'Reported' } : { kind: 'projected', label: 'Projected' })}
                rows={(d) =>
                  isNum(d.actual)
                    ? [[label, format(d.actual)]]
                    : [
                        ['Point', format(d.point)],
                        d.b80 && ['80% range', `${format(d.b80[0])} – ${format(d.b80[1])}`],
                        d.b95 && ['95% range', `${format(d.b95[0])} – ${format(d.b95[1])}`],
                      ]
                }
              />
            }
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    {zones && (offScale || showTiers) && isNum(current?.actual) && (
      <figcaption className="offscale">
        {offScale && (
          <span>
            <ArrowDown size={12} strokeWidth={2.5} aria-hidden="true" /> 7% well capitalized is{' '}
            {((current.actual - 0.07) * 100).toFixed(2)} pts below the latest ratio, off the bottom of this axis
          </span>
        )}
        <button type="button" onClick={() => setShowTiers((v) => !v)} aria-pressed={showTiers}>
          {showTiers ? 'Hide capital tiers' : 'Show capital tiers'}
        </button>
      </figcaption>
    )}
    </figure>
  )
}

/** A metric against its peer corridor: median line inside the middle-50% band. */
export function TrendChart({ rows, format = (v) => pct(v), height = 190, label }) {
  const domain = niceDomain(extent(rows, ['value', 'iqr', 'median']), { pad: 0.1 })
  const now = [...rows].reverse().find((r) => isNum(r.value))
  const summary = now
    ? `${label} ${format(now.value)} in ${quarter(now.quarter)}${isNum(now.median) ? `; peer median ${format(now.median)}` : ''}${isNum(now.percentile) ? `; ${ordinal(now.percentile)} percentile of peers` : ''}`
    : label
  return (
    <figure className="chart-figure" aria-label={summary}>
    <table className="visually-hidden">
      <caption>{label} by quarter</caption>
      <thead><tr><th scope="col">Quarter</th><th scope="col">{label}</th><th scope="col">Peer median</th></tr></thead>
      <tbody>
        {rows.filter((r) => isNum(r.value)).map((r) => (
          <tr key={r.quarter}><th scope="row">{quarter(r.quarter)}</th><td>{format(r.value)}</td><td>{isNum(r.median) ? format(r.median) : 'n/a'}</td></tr>
        ))}
      </tbody>
    </table>
    <div className="chart" style={{ height }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} syncId={SYNC} accessibilityLayer={false} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="quarter" {...AXIS} tickFormatter={quarterTick} interval={0} height={20} />
          <YAxis {...AXIS} domain={domain} ticks={niceTicks(domain, 4)} tickFormatter={pctAxis(domain, 4)} width={48} />
          {domain[0] < 0 && domain[1] > 0 && <ReferenceLine y={0} stroke={C.ink3} strokeWidth={1} />}
          <Area dataKey="iqr" stroke={C.peer} strokeWidth={0.75} strokeOpacity={0.6} fill={C.peerBand} fillOpacity={1} isAnimationActive={false} activeDot={false} connectNulls />
          <Line dataKey="median" stroke={C.peer} strokeWidth={1.25} dot={false} isAnimationActive={false} activeDot={false} connectNulls />
          <Line dataKey="value" stroke={C.ink} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls activeDot={{ r: 3.5, fill: C.ink, stroke: C.sheet, strokeWidth: 2 }} />
          <Tooltip
            cursor={{ stroke: C.ink, strokeWidth: 1 }}
            isAnimationActive={false}
            content={
              <Readout
                rows={(d) => [
                  [label, format(d.value)],
                  isNum(d.median) && ['Peer median', format(d.median)],
                  d.iqr && ['Peer middle 50%', `${format(d.iqr[0])} – ${format(d.iqr[1])}`],
                  isNum(d.percentile) && ['Percentile', `${Math.round(d.percentile)}`],
                ]}
              />
            }
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    </figure>
  )
}

/** Stress path versus baseline projection, over the PCA zones. */
export function StressChart({ rows, height = 340 }) {
  const [lo, hi] = extent(rows, ['stress', 'baseline', 's80'])
  const domain = [Math.min(lo - 0.004, 0.058), hi + (hi - Math.min(lo, 0.06)) * 0.1]
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} accessibilityLayer title="Net worth ratio under the scenario. Use the arrow keys to step through quarters." margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
          <Hatches />
          <CartesianGrid {...GRID} />
          <PcaZones domain={domain} />
          <XAxis dataKey="quarter" {...AXIS} tickFormatter={(q) => `${q.slice(4)} ’${q.slice(2, 4)}`} height={22} />
          <YAxis {...AXIS} domain={domain} ticks={niceTicks(domain, 6)} tickFormatter={pctAxis(domain, 6)} width={52} allowDataOverflow />
          <Area dataKey="s80" stroke="none" fill={C.fan80} fillOpacity={1} isAnimationActive={false} activeDot={false} connectNulls />
          <Area dataKey="s50" stroke="none" fill={C.fan50} fillOpacity={1} isAnimationActive={false} activeDot={false} connectNulls />
          <Line dataKey="baseline" stroke={C.fanInk} strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} connectNulls />
          <Line
            dataKey="stress"
            stroke={C.ink}
            strokeWidth={2.25}
            isAnimationActive={false}
            dot={(p) => {
              const breach = isNum(p.value) && p.value < 0.07
              return <circle key={p.index} cx={p.cx} cy={p.cy} r={3.5} fill={breach ? C.breach : C.ink} stroke={C.sheet} strokeWidth={1.5} />
            }}
          />
          <Tooltip
            cursor={{ stroke: C.ink, strokeWidth: 1 }}
            isAnimationActive={false}
            content={
              <Readout
                stamp={(d) => (d.origin ? { kind: 'reported', label: 'Reported' } : { kind: 'projected', label: 'Scenario' })}
                rows={(d) => [
                  ['Scenario', pct(d.stress)],
                  d.s80 && !d.origin && ['Scenario 80% range', `${pct(d.s80[0])} – ${pct(d.s80[1])}`],
                  isNum(d.baseline) && ['Model baseline', pct(d.baseline)],
                  isNum(d.netWorth) && ['Net worth', usd(d.netWorth)],
                ]}
              />
            }
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function FanLegend({ zones, rows }) {
  const tiers = zones && rows && zonesInView(rows)
  return (
    <div className="legend">
      <span><i className="swatch line" /> Reported</span>
      <span><i className="swatch dash" /> Projected</span>
      <span><i className="swatch fan" /> 50 · 80 · 95% ranges</span>
      {zones && tiers && <span><i className="swatch rule-breach" /> 7% well capitalized</span>}
      {tiers && <span><i className="swatch hatch" /> Below well capitalized</span>}
    </div>
  )
}

export function PeerLegend() {
  return (
    <div className="legend">
      <span><i className="swatch line" /> Institution</span>
      <span><i className="swatch peer" /> Peer median & middle 50%</span>
    </div>
  )
}

