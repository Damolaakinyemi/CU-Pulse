import { Exhibit, Segmented } from '../components/Chrome.jsx'
import { PeerLegend, TrendChart } from '../components/Charts.jsx'
import { metricSeries } from '../lib/analysis.js'
import { isNum, ordinal, pct, quarter } from '../lib/format.js'
import { useHashParam } from '../lib/router.js'

const RANGES = [
  { value: 3, label: '3Y' },
  { value: 5, label: '5Y' },
  { value: 99, label: 'All' },
]

export default function Trends({ inst, peers, meta }) {
  const [rangeParam, setRange] = useHashParam('range', '5')
  const years = { 3: 3, 5: 5, all: 99 }[rangeParam] ?? 5
  const setYears = (y) => setRange(y === 99 ? 'all' : String(y))
  const last = inst.latest_quarter
  const from = years === 99 ? null : `${Number(last.slice(0, 4)) - years}${last.slice(4)}`
  const keys = Object.keys(meta.definitions)

  return (
    <div className="grid">
      <Exhibit
        className="span-12"
        id="ex-trends"
        title="Trends against size peers"
        sub={`${quarter(from ?? meta.first_quarter)} – ${quarter(last)}`}
        tools={
          <>
            <PeerLegend />
            <Segmented label="History range" options={RANGES} value={years} onChange={setYears} />
          </>
        }
        source={`Source: NCUA 5300 Call Report. ${peers.method}; the peer set is fixed at the latest quarter and traced back through history. Hover any chart to read the same quarter across all of them.`}
      >
        <div className="multiples">
          {keys.map((key) => {
            const def = meta.definitions[key]
            const rows = metricSeries(inst, peers, key, from)
            const now = rows[rows.length - 1]
            const f = key.includes('growth') ? (v) => pct(v, 1) : (v) => pct(v)
            return (
              <div key={key}>
                <div className="multiple-head">
                  <h3>{def.label}</h3>
                  <span className="now">{f(now?.value)}</span>
                </div>
                <div className="multiple-sub">
                  <span>{def.formula}</span>
                  <span>
                    {isNum(now?.percentile) ? `${ordinal(now.percentile)} pctl` : ''}
                    {isNum(now?.median) ? ` · median ${f(now.median)}` : ''}
                  </span>
                </div>
                <TrendChart rows={rows} format={f} label={def.label} height={200} />
              </div>
            )
          })}
        </div>
      </Exhibit>
    </div>
  )
}
