import { useState } from 'react'
import { Exhibit, Segmented, Skeleton, Stamp } from '../components/Chrome.jsx'
import { FanChart, FanLegend } from '../components/Charts.jsx'
import { fanSeries } from '../lib/analysis.js'
import { pct, quarter, usd } from '../lib/format.js'

const ORDER = ['total_assets', 'total_loans', 'total_shares_deposits', 'net_worth_ratio']

const fmtFor = (key) => (key === 'net_worth_ratio' ? (v) => pct(v) : (v) => usd(v))
const errFor = (key) => (key === 'net_worth_ratio' ? (v) => `${(v * 100).toFixed(2)} pts` : (v) => pct(v, 2))

function coverageNote(cov, nominal) {
  const gap = cov - nominal
  if (Math.abs(gap) <= 0.08) return 'well calibrated'
  return gap < 0 ? 'too narrow' : 'conservative'
}

export default function Forecast({ inst, fc, fcState }) {
  const [focus, setFocus] = useState('total_loans')

  if (fcState.loading) {
    return (
      <div className="grid">
        <div className="span-12">
          <p className="inline-note">Fitting three models and backtesting each from eight historical origins…</p>
        </div>
        {ORDER.map((k) => (
          <div className="span-6" key={k}>
            <Skeleton height={300} />
          </div>
        ))}
      </div>
    )
  }
  if (!fc) return null

  const available = ORDER.filter((k) => fc.series[k])
  const s = fc.series[focus] ?? fc.series[available[0]]
  const key = fc.series[focus] ? focus : available[0]
  const from = `${Number(inst.latest_quarter.slice(0, 4)) - 4}${inst.latest_quarter.slice(4)}`

  if (!available.length) {
    return (
      <div className="notice">
        <h2>Not enough history to forecast</h2>
        <p>
          A forecast needs at least 14 consecutive quarterly filings so each model can be backtested from eight origins.
          This credit union has fewer, so CU Pulse shows reported history only.
        </p>
      </div>
    )
  }

  return (
    <div className="grid">
      <p className="span-12 figure-notes">
        <b>Model output, not NCUA data.</b> These are statistical extrapolations of each credit union’s own filings. They
        know nothing about rates, management plans or pending mergers, and an acquisition inside the history reads as
        growth. The backtest below shows how far off they have been.
      </p>
      {available.map((k) => {
        const series = fc.series[k]
        const end = series.path[series.path.length - 1]
        const f = fmtFor(k)
        return (
          <Exhibit
            key={k}
            className="span-6"
            id={`fc-${k}`}
            title={series.label}
            sub={`to ${quarter(end.quarter)}`}
            tools={<Stamp kind="projected">{`${f(end.lo80)} – ${f(end.hi80)} at 80%`}</Stamp>}
            source={`${series.accounts.join(' ÷ ')} · Selected: ${series.model_label}${
              series.skill_vs_drift != null ? `, ${Math.round(series.skill_vs_drift * 100)}% lower backtest error than drift` : ''
            }.`}
          >
            <FanChart rows={fanSeries(inst, series, k, from)} format={f} zones={k === 'net_worth_ratio'} ratio={k === 'net_worth_ratio'} compact height={260} label={series.label} />
          </Exhibit>
        )
      })}
      <div className="span-12" style={{ marginTop: -20 }}>
        <FanLegend zones rows={fc.series.net_worth_ratio ? fanSeries(inst, fc.series.net_worth_ratio, 'net_worth_ratio', from) : null} />
      </div>

      <Exhibit
        className="span-12"
        id="fc-table"
        title="Projection"
        sub="point and ranges by quarter"
        source="Intervals are Gaussian in log space for balances (levels for the ratio), widening with the square root of the horizon from each model's one-step residual spread."
      >
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Series</th>
                <th scope="col">Last filed</th>
                {s.path.map((p) => (
                  <th scope="col" key={p.quarter}>
                    {quarter(p.quarter)}
                  </th>
                ))}
                <th scope="col">80% range at {quarter(s.path[s.path.length - 1].quarter)}</th>
                <th scope="col">95% range</th>
              </tr>
            </thead>
            <tbody>
              {available.map((k) => {
                const series = fc.series[k]
                const f = fmtFor(k)
                const end = series.path[series.path.length - 1]
                const lastFiled = inst.quarters[inst.quarters.length - 1][k]
                return (
                  <tr key={k}>
                    <th scope="row" style={{ fontWeight: 600 }}>{series.label}</th>
                    <td>{f(lastFiled)}</td>
                    {series.path.map((p) => (
                      <td key={p.quarter} className="proj">{f(p.point)}</td>
                    ))}
                    <td className="proj">{f(end.lo80)} – {f(end.hi80)}</td>
                    <td className="muted">{f(end.lo95)} – {f(end.hi95)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Exhibit>

      <Exhibit
        className="span-12"
        id="fc-backtest"
        title="Backtest"
        sub={`rolling origin, ${fc.origins} origins × ${fc.horizon} quarters ahead`}
        tools={
          <Segmented
            label="Series"
            options={available.map((k) => ({ value: k, label: fc.series[k].label.replace('Total ', '').replace(' and leases', '').replace(/^./, (c) => c.toUpperCase()) }))}
            value={key}
            onChange={setFocus}
          />
        }
        source={`Each model re-fit at every origin using only data available then, and scored on the ${fc.horizon} quarters that followed. Error is ${s.error_metric}. Coverage is the share of realized values that fell inside each nominal range; the lowest-error model is selected.`}
      >
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">{s.error_metric}</th>
                {[1, 2, 3, 4].map((h) => (
                  <th scope="col" key={h}>{h}Q ahead</th>
                ))}
                <th scope="col">50% cover</th>
                <th scope="col">80% cover</th>
                <th scope="col">95% cover</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(s.backtest).map(([m, b]) => {
                const e = errFor(key)
                return (
                  <tr key={m} className={m === s.model ? 'subject' : ''}>
                    <th scope="row" style={{ fontWeight: m === s.model ? 700 : 500 }}>{b.label}</th>
                    <td>{e(b.error)}</td>
                    {[1, 2, 3, 4].map((h) => (
                      <td key={h} className="muted">{e(b.error_by_horizon[h])}</td>
                    ))}
                    <td>{pct(b.coverage50, 0)}</td>
                    <td>
                      {pct(b.coverage80, 0)} <span className="muted">· {coverageNote(b.coverage80, 0.8)}</span>
                    </td>
                    <td>{pct(b.coverage95, 0)}</td>
                    <td>
                      {m === s.model ? <Stamp kind="selected">Selected</Stamp> : m === 'drift' ? <Stamp kind="reported">Benchmark</Stamp> : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <h3 style={{ fontSize: 13.5, margin: '26px 0 6px' }}>
          Selected model, predicted versus reported
        </h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Origin</th>
                <th scope="col">Target</th>
                <th scope="col">Horizon</th>
                <th scope="col">Predicted</th>
                <th scope="col">Reported</th>
                <th scope="col">Error</th>
                <th scope="col">80% range</th>
                <th scope="col">Inside 80%</th>
              </tr>
            </thead>
            <tbody>
              {s.trail
                .filter((t) => t.h === 1 || t.h === 4)
                .slice()
                .reverse()
                .map((t) => {
                  const f = fmtFor(key)
                  const inside = t.actual >= t.lo80 && t.actual <= t.hi80
                  const err = key === 'net_worth_ratio' ? `${((t.predicted - t.actual) * 100).toFixed(2)} pts` : pct(t.predicted / t.actual - 1, 2)
                  return (
                    <tr key={`${t.origin}-${t.h}`}>
                      <td>{quarter(t.origin)}</td>
                      <td>{quarter(t.quarter)}</td>
                      <td className="muted">{t.h}Q</td>
                      <td className="proj">{f(t.predicted)}</td>
                      <td>{f(t.actual)}</td>
                      <td>{err}</td>
                      <td className="muted">{f(t.lo80)} – {f(t.hi80)}</td>
                      <td>{inside ? <span className="muted">Inside</span> : <Stamp kind="reported">Outside</Stamp>}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </Exhibit>
    </div>
  )
}
