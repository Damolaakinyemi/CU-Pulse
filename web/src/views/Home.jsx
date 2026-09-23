import { ArrowRight } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, useResource } from '../api.js'
import { Exhibit, PercentileRule, Readout, Skeleton, Stamp } from '../components/Chrome.jsx'
import { FanChart, FanLegend } from '../components/Charts.jsx'
import Search from '../components/Search.jsx'
import { fanSeries, latest, latestPeer } from '../lib/analysis.js'
import { SummaryTable } from './Accuracy.jsx'
import { compactCount, count, fmt, pct, quarter, quarterTick, usd } from '../lib/format.js'
import { SECTIONS, href } from '../lib/router.js'
import { niceTicks } from '../lib/chartmath.js'
import { AXIS, C, GRID } from '../lib/theme.js'

const SECTION_HELP = {
  overview: 'Headline ratios against size peers, the capital outlook, and a reading generated from the filing.',
  trends: 'Seven ratios over up to eight years, each inside its peer corridor.',
  forecast: 'Four quarters ahead for assets, loans, shares and capital, with the backtest that chose each model.',
  peers: 'The 25 credit unions closest in size, sortable, with the subject pinned.',
  stress: 'Push charge-offs, earnings and growth and watch capital against the 7% line.',
  method: 'Where every number comes from, what is filed versus derived, and the limits.',
}

const SUGGESTIONS = [
  { label: 'Navy Federal', cu: 5536 },
  { label: 'Pentagon (PenFed)', cu: 227 },
  { label: 'SchoolsFirst', cu: 24212 },
]

function cycleToQuarter(cycle) {
  return cycle ? `${cycle.slice(0, 4)}Q${Number(cycle.slice(5)) / 3}` : null
}

function checkedText(iso) {
  if (!iso) return 'pending'
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function IndustryChart({ rows, dataKey, format, label }) {
  const vals = rows.map((r) => r[dataKey])
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const pad = (hi - lo) * 0.15 || hi * 0.05
  return (
    <div className="chart" style={{ height: 170 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="quarter" {...AXIS} tickFormatter={quarterTick} interval={0} height={20} />
          <YAxis {...AXIS} domain={[lo - pad, hi + pad]} ticks={niceTicks([lo - pad, hi + pad], 6)} tickFormatter={format} width={54} />
          <Line dataKey={dataKey} stroke={C.ink} strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 3.5, fill: C.ink, stroke: C.sheet, strokeWidth: 2 }} />
          <Tooltip cursor={{ stroke: C.ink, strokeWidth: 1 }} isAnimationActive={false} content={<Readout rows={(d) => [[label, format(d[dataKey])]]} />} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** A live, working slice of one credit union's dashboard: what the app does, shown rather than described. */
function Specimen({ cu, meta }) {
  const inst = useResource(`inst:${cu}`, (s) => api.institution(cu, s))
  const peers = useResource(`peers:${cu}`, (s) => api.peers(cu, s))
  const fc = useResource(`fc:${cu}`, (s) => api.forecast(cu, s))
  if (inst.error) return null
  if (!inst.data || !peers.data || !fc.data) return <Skeleton height={420} />
  const i = inst.data
  const now = latest(i)
  const rows = fanSeries(i, fc.data.series.net_worth_ratio, 'net_worth_ratio', '2023Q1')
  const figures = [
    ['net_worth_ratio', 'Net worth ratio'],
    ['net_charge_off_rate', 'Net charge-offs'],
    ['roa', 'Return on assets'],
  ]
  return (
    <a className="specimen" href={href(cu)} aria-label={`Open the ${i.name} dashboard`}>
      <div className="specimen-head">
        <span className="specimen-name">{i.name}</span>
        <span className="specimen-meta">{usd(now.total_assets)} · {quarter(i.latest_quarter)}</span>
      </div>
      <div className="specimen-figs">
        {figures.map(([k, label]) => (
          <div key={k}>
            <span className="k">{label}</span>
            <span className="v">{pct(now[k])}</span>
            <PercentileRule value={now[k]} peer={latestPeer(peers.data, k)} better={meta.definitions[k]?.better} compact />
          </div>
        ))}
      </div>
      <div className="specimen-chart">
        <FanChart rows={rows} format={fmt.pct} zones height={170} label="Net worth ratio" />
        <FanLegend zones rows={rows} />
      </div>
      <span className="specimen-cta">
        Open the full read-out <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
      </span>
    </a>
  )
}

export default function Home({ meta }) {
  const top = useResource('home:top', (s) => api.search('', s))
  const bt = useResource('backtest', (s) => api.backtest(s))
  const featured = meta.default_cu
  const industry = meta.industry
  const first = industry[0]
  const last = industry[industry.length - 1]
  const u = meta.updates
  const awaiting = cycleToQuarter(u?.awaiting)

  return (
    <div className="home">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-lead">
          <h1 id="home-title">Look up any credit union’s financial health.</h1>
          <p>
            Capital, growth, credit quality and earnings for all {count(meta.active_count)} federally insured credit unions,
            straight from their NCUA Call Reports, with a four-quarter forecast and a comparison against credit unions of the
            same size.
          </p>
          <Search variant="hero" section="overview" />
          <p className="home-try">
            Try{' '}
            {SUGGESTIONS.map((s, i) => (
              <span key={s.cu}>
                <a href={href(s.cu)}>{s.label}</a>
                {i < SUGGESTIONS.length - 1 ? ', ' : ''}
              </span>
            ))}
            , a state such as <b>VA</b>, or a charter number. New to credit union analysis? Start with the{' '}
            <a href="#/glossary">glossary</a>; every dashboard also opens with a plain-language summary.
          </p>
          <p className="home-builder">
            Built by <b>Damola Akinyemi</b> as a portfolio project for financial forecasting & reporting roles ·{' '}
            <a href="https://github.com/Damolaakinyemi/CU-Pulse" target="_blank" rel="noreferrer">GitHub</a>
          </p>
        </div>

        <Specimen cu={featured} meta={meta} />
      </section>

        <dl className="home-status" aria-label="Data status">
        <div>
          <dt>Latest filing</dt>
          <dd>
            {quarter(meta.latest_quarter)} <Stamp kind="reported">As filed</Stamp>
          </dd>
        </div>
        <div>
          <dt>Coverage</dt>
          <dd>{quarter(meta.first_quarter)} – {quarter(meta.latest_quarter)}</dd>
        </div>
        <div>
          <dt>NCUA last checked</dt>
          <dd>{u?.enabled ? checkedText(u.checked_at) : 'Automatic checks off'}</dd>
        </div>
        {u?.enabled && awaiting && (
          <div>
            <dt>Next quarter</dt>
            <dd>{quarter(awaiting)}, usually about two months after quarter end</dd>
          </div>
        )}
        <div>
          <dt>Source</dt>
          <dd>
            <a href={meta.source_url} target="_blank" rel="noreferrer">NCUA 5300 Call Report</a>
          </dd>
        </div>
      </dl>

      <div className="grid">
        <Exhibit
          className="span-12"
          id="home-top"
          title="Largest credit unions"
          sub={`${quarter(meta.latest_quarter)} · select one to open it`}
          tools={
            <a className="button" href={href(featured)}>
              Open Navy Federal <ArrowRight size={14} strokeWidth={2} />
            </a>
          }
          source="Source: NCUA 5300 Call Report. Assets ACCT_010, members ACCT_083, net worth ratio as reported (ACCT_998). Capital tier per 12 CFR 702.102."
        >
          {top.data ? (
            <div className="table-wrap">
              <table className="data pin-first home-table">
                <thead>
                  <tr>
                    <th scope="col">Credit union</th>
                    <th scope="col">Rank</th>
                    <th scope="col" className="acct loc">Location</th>
                    <th scope="col">Total assets</th>
                    <th scope="col">Members</th>
                    <th scope="col">Net worth ratio</th>
                    <th scope="col" className="acct loc">Capital tier</th>
                  </tr>
                </thead>
                <tbody>
                  {top.data.results.slice(0, 10).map((r, i) => (
                    <tr key={r.cu_number} className={r.cu_number === featured ? 'featured' : ''}>
                      <td className="name">
                        <a href={href(r.cu_number)}>{r.name}</a>
                      </td>
                      <td className="muted">{i + 1}</td>
                      <td className="muted acct loc">{r.city}, {r.state}</td>
                      <td>{usd(r.total_assets)}</td>
                      <td>{compactCount(r.members)}</td>
                      <td>{pct(r.net_worth_ratio)}</td>
                      <td className="acct loc">{r.pca_tier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Skeleton height={380} />
          )}
        </Exhibit>

        <Exhibit
          className="span-7"
          id="home-accuracy"
          title="How accurate are the forecasts?"
          sub="every credit union, scored out of sample"
          tools={<a href="#/accuracy">Full results</a>}
          source={bt.data ? bt.data.method : 'Each forecast re-run from earlier quarters and checked against what was later reported.'}
        >
          {bt.data ? <SummaryTable data={bt.data} compact /> : bt.error ? <p className="inline-note">The industry backtest has not been run on this server yet.</p> : <Skeleton height={180} />}
        </Exhibit>

        <section className="span-5 teaser" aria-labelledby="home-case">
          <h2 id="home-case">Case study: Navy Federal</h2>
          <p>
            The largest credit union’s losses run well above its peers’. Does that threaten its capital? A read-out built
            entirely from its filings, with a stress test and the forecast’s own track record.
          </p>
          <a className="button primary" href="#/case-study">
            Read the case study <ArrowRight size={14} strokeWidth={2} />
          </a>
        </section>

        <Exhibit
          className="span-7"
          id="home-industry"
          title="The industry"
          sub={`${quarter(first.quarter)} – ${quarter(last.quarter)}`}
          source="All federally insured credit unions filing each quarter. Aggregate net worth ratio is total net worth ÷ total assets across the industry (ACCT_997 ÷ ACCT_010)."
        >
          <div className="multiples">
            <div>
              <div className="multiple-head">
                <h3>Credit unions filing</h3>
                <span className="now">{count(last.count)}</span>
              </div>
              <p className="multiple-sub">
                <span>{count(first.count - last.count)} fewer than {quarter(first.quarter)}, mostly through mergers</span>
              </p>
              <IndustryChart rows={industry} dataKey="count" format={(v) => count(v)} label="Credit unions" />
            </div>
            <div>
              <div className="multiple-head">
                <h3>Aggregate net worth ratio</h3>
                <span className="now">{pct(last.net_worth_ratio)}</span>
              </div>
              <p className="multiple-sub">
                <span>{usd(last.total_assets)} in total assets</span>
              </p>
              <IndustryChart rows={industry} dataKey="net_worth_ratio" format={(v) => pct(v, 1)} label="Net worth ratio" />
            </div>
          </div>
        </Exhibit>

        <Exhibit
          className="span-5"
          id="home-guide"
          title="What you can do"
          sub="for any credit union"
          source="Every section shows its source accounts and quarters. Forecasts and stress results are CU Pulse model output, not NCUA data."
        >
          <ul className="guide">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={href(featured, s.id)}>
                  <span className="guide-name">{s.label}</span>
                  <span className="guide-text">{SECTION_HELP[s.id]}</span>
                  <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                </a>
              </li>
            ))}
            <li>
              <a href={href(featured, 'report')}>
                <span className="guide-name">One-page report</span>
                <span className="guide-text">A printable read-out of any credit union, ready to save as PDF.</span>
                <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
              </a>
            </li>
          </ul>
        </Exhibit>
      </div>
    </div>
  )
}
