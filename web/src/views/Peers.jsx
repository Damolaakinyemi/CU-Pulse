import { ArrowDown, ArrowUp } from 'lucide-react'
import { Exhibit } from '../components/Chrome.jsx'
import { latest } from '../lib/analysis.js'
import { isNum, ordinal, pct, usd } from '../lib/format.js'
import { href, useHashParam } from '../lib/router.js'
import { C } from '../lib/theme.js'

const COLS = [
  ['total_assets', 'Assets', (v) => usd(v)],
  ['net_worth_ratio', 'Net worth', (v) => pct(v)],
  ['loan_growth_yoy', 'Loan gr.', (v) => pct(v, 1)],
  ['deposit_growth_yoy', 'Share gr.', (v) => pct(v, 1)],
  ['delinquency_rate', 'Delinq.', (v) => pct(v)],
  ['net_charge_off_rate', 'NCO', (v) => pct(v)],
  ['roa', 'ROA', (v) => pct(v)],
  ['loan_to_share', 'Loan/share', (v) => pct(v, 1)],
]

// Year-over-year growth this large is almost always an acquisition, not organic growth.
const MERGER_FLAG = 0.4
const flagged = (k, v) => k.includes('growth') && isNum(v) && Math.abs(v) >= MERGER_FLAG

function Cell({ k, v, f }) {
  return (
    <td>
      {f(v)}
      {flagged(k, v) && <sup title="Likely merger">†</sup>}
    </td>
  )
}

const median = (xs) => {
  const s = xs.filter(isNum).sort((a, b) => a - b)
  if (!s.length) return null
  const m = s.length / 2
  return s.length % 2 ? s[Math.floor(m)] : (s[m - 1] + s[m]) / 2
}

/** One metric's peer distribution as ticks on a rule, the subject as a mark. */
function Strip({ label, values, subject, format, better }) {
  const xs = values.filter(isNum)
  if (!xs.length || !isNum(subject)) return null
  const all = [...xs, subject].sort((a, b) => a - b)
  // Trim to the 4th–96th spread so one outlier does not flatten the strip.
  const lo = all[Math.floor(all.length * 0.04)]
  const hi = all[Math.ceil(all.length * 0.96) - 1]
  const W = 1000
  const x = (v) => 8 + ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo || 1)) * (W - 16)
  const rank = (xs.filter((v) => v < subject).length / xs.length) * 100
  const med = median(xs)
  return (
    <div>
      <div className="multiple-sub" style={{ paddingTop: 0 }}>
        <span style={{ color: C.ink, fontWeight: 650 }}>{label}</span>
        <span>
          {format(subject)} · {ordinal(rank)} pctl{better ? ` · ${better} is stronger` : ''}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} 30`} width="100%" height="30" preserveAspectRatio="none" role="img" aria-label={`${label}: ${format(subject)}, ${ordinal(rank)} percentile of peers`}>
        <line x1="0" x2={W} y1="15" y2="15" stroke={C.rule} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1={x(med)} x2={x(med)} y1="3" y2="27" stroke={C.peer} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {xs.map((v, i) => (
          <line key={i} x1={x(v)} x2={x(v)} y1="8" y2="22" stroke={C.ink3} strokeOpacity="0.55" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        ))}
        <line x1={x(subject)} x2={x(subject)} y1="0" y2="30" stroke={C.fan} strokeWidth="4" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="pctl-caption">
        <span>{format(lo)}</span>
        <span>{format(hi)}</span>
      </div>
    </div>
  )
}

export default function Peers({ inst, peers, meta }) {
  const [sortParam, setSortParam] = useHashParam('sort', 'total_assets.desc')
  const [rawKey, rawDir] = sortParam.split('.')
  const sortKey = COLS.some(([k]) => k === rawKey) ? rawKey : 'total_assets'
  const sortDir = rawDir === 'asc' ? 1 : -1
  const sort = { key: sortKey, dir: sortDir }
  const setSort = (next) => {
    const n = typeof next === 'function' ? next(sort) : next
    setSortParam(`${n.key}.${n.dir === 1 ? 'asc' : 'desc'}`)
  }
  const now = latest(inst)

  // 25 rows: sorting on every render is cheaper than memoizing it.
  const rows = (() => {
    const list = [...peers.members]
    list.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (!isNum(av)) return 1
      if (!isNum(bv)) return -1
      return (av - bv) * sortDir
    })
    return list
  })()

  const toggle = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : -1 }))

  if (!peers.members.length) {
    return (
      <div className="notice">
        <h2>No peer set for this credit union</h2>
        <p>
          Peers are drawn from credit unions that filed for {peers.as_of}. This institution did not, so there is nothing
          current to compare it against.
        </p>
      </div>
    )
  }

  return (
    <div className="grid">
      <Exhibit
        className="span-8"
        id="peer-board"
        title="Peer board"
        sub={`${inst.name} and ${peers.peer_count} nearest by assets`}
        source={`Source: NCUA 5300 Call Report, ${peers.as_of}. Peer set: ${peers.method}; asset range ${usd(peers.asset_range[0])} – ${usd(peers.asset_range[1])}. † Growth of 40% or more year over year, which usually reflects a merger rather than organic growth. Select a column heading to sort; the subject row stays pinned.`}
      >
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Credit union</th>
                {COLS.map(([k, label]) => (
                  <th scope="col" key={k} aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" onClick={() => toggle(k)}>
                      {label}
                      {sort.key === k && (sort.dir === 1 ? <ArrowUp size={11} strokeWidth={2.5} /> : <ArrowDown size={11} strokeWidth={2.5} />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="subject">
                <td className="name">{inst.name}</td>
                {COLS.map(([k, , f]) => (
                  <Cell key={k} k={k} v={now[k]} f={f} />
                ))}
              </tr>
              {rows.map((r) => (
                <tr key={r.cu_number}>
                  <td className="name">
                    <a href={href(r.cu_number, 'peers')} title={`${r.name}, ${r.state}`}>
                      {r.name} <span className="muted">{r.state}</span>
                    </a>
                  </td>
                  {COLS.map(([k, , f]) => (
                    <Cell key={k} k={k} v={r[k]} f={f} />
                  ))}
                </tr>
              ))}
              <tr className="summary">
                <td>Peer median</td>
                {COLS.map(([k, , f]) => (
                  <td key={k}>{f(median(peers.members.map((m) => m[k])))}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Exhibit>

      <Exhibit
        className="span-4"
        id="peer-dist"
        title="Where it sits"
        sub="each tick a peer"
        source="Ticks: peers. Grey line: peer median. Blue bar: this credit union. Scales are trimmed to the 4th–96th percentile of the group so one outlier cannot flatten a strip."
      >
        <div style={{ display: 'grid', gap: 18 }}>
          {COLS.slice(1).map(([k, label, f]) => (
            <Strip
              key={k}
              label={meta.definitions[k]?.label ?? label}
              values={peers.members.map((m) => m[k])}
              subject={now[k]}
              format={f}
              better={meta.definitions[k]?.better}
            />
          ))}
        </div>
      </Exhibit>
    </div>
  )
}
