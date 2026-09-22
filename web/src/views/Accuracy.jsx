import { api, useResource } from '../api.js'
import { ErrorNotice, Exhibit, Skeleton, Stamp } from '../components/Chrome.jsx'
import { errFmt, finding } from '../lib/backtest.js'
import { count, pct, quarter } from '../lib/format.js'

const ORDER = ['total_assets', 'total_loans', 'total_shares_deposits', 'net_worth_ratio']

function calibration(c) {
  if (c == null) return '—'
  const gap = c - 0.8
  return Math.abs(gap) <= 0.05 ? 'calibrated' : gap < 0 ? 'too narrow' : 'conservative'
}

export function SummaryTable({ data, rows = ORDER, compact = false }) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th scope="col">Series</th>
            <th scope="col">Credit unions</th>
            <th scope="col">Median error</th>
            <th scope="col">Drift benchmark</th>
            <th scope="col">Error reduction</th>
            <th scope="col">Beats benchmark</th>
            <th scope="col">80% range held</th>
            {!compact && <th scope="col" className="acct">Calibration</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((k) => {
            const s = data.overall[k]
            if (!s) return null
            const e = errFmt(k)
            return (
              <tr key={k}>
                <th scope="row" style={{ fontWeight: 600 }}>{data.labels[k]}</th>
                <td className="muted">{count(s.n)}</td>
                <td className="proj">{e(s.median_error)}</td>
                <td>{e(s.median_drift_error)}</td>
                <td><b>{pct(s.skill_vs_drift, 0)}</b></td>
                <td>{pct(s.beats_drift_share, 0)}</td>
                <td>{pct(s.coverage80_mean, 0)}</td>
                {!compact && <td className="acct"><Stamp kind="reported">{calibration(s.coverage80_mean)}</Stamp></td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function Accuracy() {
  const bt = useResource('backtest', (s) => api.backtest(s))
  if (bt.error) return <ErrorNotice title="The industry backtest is not available" error={bt.error} />
  if (!bt.data) return <div className="grid"><div className="span-12"><Skeleton height={500} /></div></div>
  const d = bt.data
  const bands = Object.keys(d.by_band)

  return (
    <div className="page-read">
      <header className="read-head">
        <h1>How accurate are the forecasts?</h1>
        <p>
          Every active credit union’s forecast was re-run as if it were earlier in time, then checked against what it
          actually reported later. {count(d.credit_unions)} credit unions, data through {quarter(d.as_of)}.
        </p>
      </header>

      <div className="grid">
        <Exhibit
          className="span-12"
          id="acc-overall"
          title="Out-of-sample accuracy"
          sub="all credit unions"
          source={`${d.method} Error is MAPE for balances and mean absolute error in ratio points for the net worth ratio. Error reduction compares medians across credit unions.`}
        >
          <SummaryTable data={d} />
        </Exhibit>

        <article className="span-7 prose">
          <h2>What this shows</h2>
          <ul>
            {ORDER.map((k) => {
              const f = finding(k, d.overall[k], d.labels[k])
              return f && <li key={k}>{f}</li>
            })}
          </ul>
          <h2>Why the test is built this way</h2>
          <p>
            If the same backtest both picks the model and grades it, the grade flatters the winner: with three candidates,
            one will look good by luck. Here the model is chosen using only the first four historical starting points and
            graded on the last four, which played no part in the choice. The benchmark is a random walk with drift, the
            forecast any analyst could make in a spreadsheet; a model that cannot beat it has not earned its complexity.
          </p>
          <p>
            Coverage is reported rather than assumed. Where 80% ranges hold fewer than 80% of outcomes, the ranges are too
            narrow, usually because the history is short relative to the shocks it contains, and should be read as a floor
            on uncertainty rather than a promise.
          </p>
        </article>

        <Exhibit
          className="span-5"
          id="acc-models"
          title="Which model wins"
          sub="share of credit unions"
          source="Chosen on the first four origins only. Drift wins where a series is close to a straight line or too noisy for more structure to help."
        >
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Series</th>
                  {Object.keys(d.models).map((m) => (
                    <th scope="col" key={m}>{m === 'drift' ? 'Drift' : m === 'ets' ? 'ETS' : 'ARIMA'}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ORDER.map((k) => d.overall[k] && (
                  <tr key={k}>
                    <th scope="row" style={{ fontWeight: 600 }}>{d.labels[k].replace('Total ', '').replace(/^./, (c) => c.toUpperCase())}</th>
                    {Object.keys(d.models).map((m) => (
                      <td key={m}>{pct(d.overall[k].chosen_share[m], 0)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Exhibit>

        <Exhibit
          className="span-12"
          id="acc-bands"
          title="By size"
          sub="error reduction against drift · 80% range held"
          source="Asset size at the latest quarter. Smaller credit unions have noisier balance sheets, so every model does worse in absolute terms."
        >
          <div className="table-wrap">
            <table className="data pin-first">
              <thead>
                <tr>
                  <th scope="col">Asset size</th>
                  <th scope="col">Credit unions</th>
                  {ORDER.map((k) => (
                    <th scope="col" key={k}>{d.labels[k].replace('Total ', '').replace(' and leases', '').replace(/^./, (c) => c.toUpperCase())}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bands.map((b) => (
                  <tr key={b}>
                    <th scope="row" style={{ fontWeight: 600 }}>{b}</th>
                    <td className="muted">{count(d.by_band[b].total_assets?.n)}</td>
                    {ORDER.map((k) => {
                      const s = d.by_band[b][k]
                      return <td key={k}>{s ? <><b>{pct(s.skill_vs_drift, 0)}</b> <span className="muted">· {pct(s.coverage80_mean, 0)}</span></> : '—'}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Exhibit>
      </div>
    </div>
  )
}
