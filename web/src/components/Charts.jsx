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
import { isNum, pct, quarterTick, usd } from '../lib/format.js'
import { AXIS, C, GRID } from '../lib/theme.js'
import { Readout } from './Chrome.jsx'

const SYNC = 'cu-quarter'

/** Round tick positions (1, 2, 2.5, 5 × 10ⁿ steps) covering the domain. */
function niceTicks([lo, hi], target = 5) {
  const raw = (hi - lo) / Math.max(target - 1, 1)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag
  const ticks = []
  for (let t = Math.ceil(lo / step) * step; t <= hi + step * 1e-9; t += step) ticks.push(Number(t.toPrecision(12)))
  return ticks
}

function extent(rows, keys) {
  let lo = Infinity
  let hi = -Infinity
  for (const r of rows) {
    for (const k of keys) {
      const v = r[k]
      for (const x of Array.isArray(v) ? v : [v]) {
        if (isNum(x)) {
          lo = Math.min(lo, x)
          hi = Math.max(hi, x)
        }
      }
    }
  }
  return [lo, hi]
}

function niceDomain([lo, hi], { floor, pad = 0.12 } = {}) {
  if (!isNum(lo)) return [0, 1]
  const span = hi - lo || Math.abs(hi) * 0.1 || 0.01
  let a = lo - span * pad
  const b = hi + span * pad
  if (floor != null) a = Math.max(a, floor)
  return [a, b]
}

/** Net worth ratio zones (12 CFR 702.102), drawn as ruled depth bands. */
function PcaZones({ domain }) {
  const [lo] = domain
  return (
    <>
      {lo < 0.07 && (
        <ReferenceArea y1={Math.max(lo, 0.06)} y2={0.07} fill="url(#hatch-light)" fillOpacity={1} ifOverflow="hidden" />
      )}
      {lo < 0.06 && <ReferenceArea y1={lo} y2={0.06} fill="url(#hatch)" fillOpacity={1} ifOverflow="hidden" />}
      {lo < 0.07 && (
        <ReferenceLine
          y={0.07}
          stroke={C.breach}
          strokeWidth={1}
          label={{ value: 'Well capitalized 7%', position: 'insideBottomLeft', fill: C.breach, fontSize: 10.5, fontWeight: 600, dy: -3 }}
        />
      )}
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
    </defs>
  )
}

/**
 * Reported history in ink and the four-quarter projection as a graded fan.
 * rows: [{ quarter, actual?, point?, b50?, b80?, b95? }]
 */
export function FanChart({ rows, format, height = 300, zones = false, reveal = true, label = 'Value' }) {
  const [lo, hi] = extent(rows, ['actual', 'b95'])
  let domain = niceDomain([lo, hi])
  // Keep the well-capitalized line in view when capital is within 3 points of it.
  if (zones && lo - 0.07 < 0.03) domain = [Math.min(domain[0], 0.064), domain[1]]
  const origin = rows.find((r) => r.origin)?.quarter
  const last = rows[rows.length - 1]?.quarter

  return (
    <div className={`chart ${reveal ? 'fan-reveal' : ''}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} syncId={SYNC} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
          <Hatches />
          <CartesianGrid {...GRID} />
          {origin && <ReferenceArea x1={origin} x2={last} fill={C.fan} fillOpacity={0.035} ifOverflow="hidden" />}
          {zones && <PcaZones domain={domain} />}
          <XAxis dataKey="quarter" {...AXIS} tickFormatter={quarterTick} interval={0} minTickGap={0} height={22} />
          <YAxis {...AXIS} domain={domain} ticks={niceTicks(domain, 5)} tickFormatter={(v) => format(v)} width={62} allowDataOverflow />
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
  )
}

/** A metric against its peer corridor: median line inside the middle-50% band. */
export function TrendChart({ rows, format = (v) => pct(v), height = 190, label }) {
  const domain = niceDomain(extent(rows, ['value', 'iqr', 'median']), { pad: 0.1 })
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} syncId={SYNC} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="quarter" {...AXIS} tickFormatter={quarterTick} interval={0} height={20} />
          <YAxis {...AXIS} domain={domain} ticks={niceTicks(domain, 4)} tickFormatter={(v) => format(v)} width={56} />
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
  )
}

/** Stress path versus baseline projection, over the PCA zones. */
export function StressChart({ rows, height = 340 }) {
  const [lo, hi] = extent(rows, ['stress', 'baseline', 'b80'])
  const domain = [Math.min(lo - 0.004, 0.058), hi + (hi - Math.min(lo, 0.06)) * 0.1]
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
          <Hatches />
          <CartesianGrid {...GRID} />
          <PcaZones domain={domain} />
          <XAxis dataKey="quarter" {...AXIS} tickFormatter={(q) => `${q.slice(4)} ’${q.slice(2, 4)}`} height={22} />
          <YAxis {...AXIS} domain={domain} ticks={niceTicks(domain, 6)} tickFormatter={(v) => pct(v, 1)} width={52} allowDataOverflow />
          <Area dataKey="b80" stroke="none" fill={C.fan80} fillOpacity={1} isAnimationActive={false} activeDot={false} connectNulls />
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

export function FanLegend({ zones }) {
  return (
    <div className="legend">
      <span><i className="swatch line" /> Reported</span>
      <span><i className="swatch dash" /> Projected</span>
      <span><i className="swatch fan" /> 50 · 80 · 95% ranges</span>
      {zones && <span><i className="swatch hatch" /> Below well capitalized</span>}
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

