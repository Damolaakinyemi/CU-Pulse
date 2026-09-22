import { Exhibit, Skeleton, Stamp } from '../components/Chrome.jsx'
import { FanChart, FanLegend, PeerLegend, TrendChart } from '../components/Charts.jsx'
import { fanSeries, metricSeries, reading } from '../lib/analysis.js'
import { count, fmt, pct, quarter, usd } from '../lib/format.js'

export function Reading({ inst, peers, fc }) {
  const items = reading(inst, peers, fc)
  return (
    <dl className="reading">
      {items.map((it) => (
        <div className="reading-item" key={it.k}>
          <dt>{it.k}</dt>
          <dd>
            {it.parts.map((p, i) =>
              typeof p === 'string' ? p : p.b ? <b key={i}>{p.b}</b> : <span key={i} className="proj">{p.p}</span>,
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

const HISTORY_FROM = (inst, years) => {
  const last = inst.quarters[inst.quarters.length - 1].quarter
  return `${Number(last.slice(0, 4)) - years}${last.slice(4)}`
}

export function BalanceTable({ inst, quarters = 5 }) {
  const rows = inst.quarters.slice(-quarters)
  const lines = [
    ['Total assets', 'ACCT_010', 'total_assets', usd],
    ['Total loans and leases', 'ACCT_025B', 'total_loans', usd],
    ['Total shares and deposits', 'ACCT_018', 'total_shares_deposits', usd],
    ['Total net worth', 'ACCT_997', 'net_worth', usd],
    ['Delinquent loans, 60+ days', 'ACCT_041B', 'delinquent_loans', usd],
    ['Net income, year to date', 'ACCT_661A', 'net_income_ytd', usd],
    ['Members', 'ACCT_083', 'members', count],
    ['Net worth ratio', '997 ÷ 010', 'net_worth_ratio', (v) => pct(v)],
    ['Loan-to-share ratio', '025B ÷ 018', 'loan_to_share', (v) => pct(v, 1)],
  ]
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th scope="col">Line item</th>
            <th scope="col" className="muted">Account</th>
            {rows.map((r) => (
              <th scope="col" key={r.quarter}>{quarter(r.quarter)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map(([label, acct, key, f]) => (
            <tr key={key}>
              <th scope="row" style={{ fontWeight: 500 }}>{label}</th>
              <td className="muted">{acct}</td>
              {rows.map((r) => (
                <td key={r.quarter}>{f(r[key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Overview({ inst, peers, fc, fcState, meta }) {
  const from = HISTORY_FROM(inst, 5)
  const nw = fanSeries(inst, fc?.series?.net_worth_ratio, 'net_worth_ratio', from)
  const trend = (key) => (peers ? metricSeries(inst, peers, key, from) : null)
  const peerNote = peers ? `Peers: ${peers.method}.` : ''

  return (
    <div className="grid">
      <Exhibit
        className="span-8"
        id="ex-nw"
        title="Net worth ratio"
        sub="reported and projected four quarters"
        tools={<FanLegend zones />}
        source={`Source: NCUA 5300 Call Report, ACCT_997 ÷ ACCT_010, ${quarter(meta.first_quarter)}–${quarter(inst.latest_quarter)}. Projection: ${fc?.series?.net_worth_ratio?.model_label ?? 'pending'}; shaded bands are 50, 80 and 95% ranges. Zones: NCUA prompt corrective action, 12 CFR 702.102.`}
      >
        {fc || fcState.error ? (
          <FanChart rows={nw} format={fmt.pct} zones height={430} label="Net worth ratio" />
        ) : (
          <Skeleton height={430} />
        )}
        {fcState.error && <p className="inline-note warn">Forecast unavailable: {fcState.error.message}</p>}
      </Exhibit>

      <Exhibit
        className="span-4"
        id="ex-reading"
        title="Reading"
        sub={quarter(inst.latest_quarter)}
        tools={<Stamp kind="reported">Computed from filings</Stamp>}
        source="Every clause is generated from the figures on this page; nothing is written by hand."
      >
        {peers && (fc || fcState.error) ? <Reading inst={inst} peers={peers} fc={fc} /> : <Skeleton height={300} />}
      </Exhibit>

      {[
        ['loan_growth_yoy', 'Loan growth', 'year over year', fmt.pct1],
        ['delinquency_rate', 'Delinquency rate', '60+ days', fmt.pct],
        ['roa', 'Return on assets', 'annualized', fmt.pct],
      ].map(([key, title, sub, f]) => (
        <Exhibit
          key={key}
          className="span-4"
          id={`ex-${key}`}
          title={title}
          sub={sub}
          source={`${meta.definitions[key].formula}. ${peerNote}`}
        >
          {trend(key) ? <TrendChart rows={trend(key)} format={f} label={title} /> : <Skeleton height={190} />}
        </Exhibit>
      ))}
      <div className="span-12" style={{ marginTop: -24 }}>
        <PeerLegend />
      </div>

      <Exhibit
        className="span-12"
        id="ex-balance"
        title="Selected balances"
        sub="last five filings"
        source="Source: NCUA 5300 Call Report quarterly data files, as filed. Dollar amounts in U.S. dollars."
      >
        <BalanceTable inst={inst} />
      </Exhibit>
    </div>
  )
}
