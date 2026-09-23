import { NextStep } from '../components/Plain.jsx'
import { api, useResource } from '../api.js'
import { ErrorNotice, Exhibit, Skeleton } from '../components/Chrome.jsx'
import { FanChart, FanLegend, PeerLegend, TrendChart } from '../components/Charts.jsx'
import { WELL_CAPITALIZED, breakevenNco, fanSeries, latest, latestPeer, metricSeries, projectCapital, scenarioAt, stressBaseline } from '../lib/analysis.js'
import { fmt, isNum, ordinal, pct, quarter, usd } from '../lib/format.js'
import { href } from '../lib/router.js'
import { errFmt } from '../lib/backtest.js'

const CU = 5536

function times(a, b) {
  return isNum(a) && isNum(b) && b > 0 ? `${(a / b).toFixed(1)}×` : '—'
}

export default function CaseStudy({ meta }) {
  const inst = useResource(`inst:${CU}`, (s) => api.institution(CU, s))
  const peers = useResource(`peers:${CU}`, (s) => api.peers(CU, s))
  const fc = useResource(`fc:${CU}`, (s) => api.forecast(CU, s))
  const bt = useResource('backtest', (s) => api.backtest(s))

  const err = inst.error || peers.error || fc.error
  if (err) return <ErrorNotice title="The case study could not load" error={err} />
  if (!inst.data || !peers.data || !fc.data) return <div className="page-read"><Skeleton height={600} /></div>

  const i = inst.data
  const p = peers.data
  const f = fc.data
  const now = latest(i)
  const from = '2018Q1'
  const nco = latestPeer(p, 'net_charge_off_rate')
  const dq = latestPeer(p, 'delinquency_rate')
  const roa = latestPeer(p, 'roa')
  const nwr = latestPeer(p, 'net_worth_ratio')
  const ncoRank = [...p.members.map((m) => m.net_charge_off_rate), now.net_charge_off_rate].filter(isNum).sort((a, b) => b - a).indexOf(now.net_charge_off_rate) + 1
  const find = (q) => i.quarters.find((r) => r.quarter === q)
  const pre = find('2021Q4')
  const peerAt = (q) => p.series.net_charge_off_rate.find((r) => r.quarter === q)?.median
  const peakNco = i.quarters.filter((r) => r.quarter > '2021Q4').reduce((a, r) => (isNum(r.net_charge_off_rate) && r.net_charge_off_rate > (a?.net_charge_off_rate ?? -1) ? r : a), null)

  const base = stressBaseline(i, f)
  const calm = scenarioAt(base, 0)
  const severe = scenarioAt(base, 100)
  const calmEnd = projectCapital(base, calm).at(-1)
  const severeEnd = projectCapital(base, severe).at(-1)
  const calmBreak = breakevenNco(base, calm)
  const severeBreak = breakevenNco(base, severe)
  const cushion = (now.net_worth_ratio - WELL_CAPITALIZED) * now.total_assets
  // Reconcile the earnings-retention case with the statistical forecast from the history itself.
  const first = i.quarters.find((r) => isNum(r.total_assets))
  const yearsSpan = (i.quarters.indexOf(now) - i.quarters.indexOf(first)) / 4
  const histGrowth = yearsSpan > 0 ? (now.total_assets / first.total_assets) ** (1 / yearsSpan) - 1 : null
  const annualRoa = i.quarters.filter((r) => r.quarter.endsWith('Q4') && isNum(r.roa)).map((r) => r.roa)
  const histRoa = annualRoa.length ? annualRoa.reduce((x, y) => x + y, 0) / annualRoa.length : null
  const nwrHist = i.quarters.map((r) => r.net_worth_ratio).filter(isNum)
  const nwrLo = Math.min(...nwrHist)
  const nwrHi = Math.max(...nwrHist)
  // Net worth grows at ROA ÷ ratio when all earnings are retained; compare with asset growth.
  const nwrAvg = nwrHist.reduce((x, y) => x + y, 0) / nwrHist.length
  const capitalGrowth = isNum(histRoa) ? histRoa / nwrAvg : null
  const pace = !isNum(capitalGrowth) || !isNum(histGrowth) ? null
    : Math.abs(capitalGrowth - histGrowth) < 0.02 ? 'earnings roughly kept pace with growth'
    : capitalGrowth > histGrowth ? 'earnings outpaced growth' : 'growth outpaced earnings'
  const industryShare = now.total_assets / meta.industry_assets

  const loans = f.series.total_loans
  const nwFc = f.series.net_worth_ratio
  const loansEnd = loans?.path.at(-1)
  const ind = bt.data?.overall
  const highLoss = isNum(now.net_charge_off_rate) && isNum(nco?.median) && now.net_charge_off_rate > nco.median * 1.5
  const strongEarnings = isNum(roa?.percentile) && roa.percentile >= 50
  const holds = severeEnd.ratio >= WELL_CAPITALIZED
  const title = highLoss
    ? strongEarnings
      ? 'Navy Federal: losses run high, and earnings carry them'
      : 'Navy Federal: losses run high, and earnings are not keeping pace'
    : 'Navy Federal: a read-out from the filings'

  return (
    <article className="page-read case">
      <header className="read-head">
        <h1>{title}</h1>
        <p>
          A read-out of the largest U.S. credit union from its own Call Report filings, {quarter(meta.first_quarter)} to{' '}
          {quarter(i.latest_quarter)}. Every figure on this page is computed live from the data and changes when NCUA
          publishes a new quarter.
        </p>
        <p className="byline">
          By Damola Akinyemi, built with CU Pulse · <a href={href(CU)}>Open the Navy Federal dashboard</a> ·{' '}
          <a href="https://github.com/Damolaakinyemi/CU-Pulse" target="_blank" rel="noreferrer">Source on GitHub</a>
        </p>
      </header>

      <div className="grid">
        <div className="span-7 prose">
          <h2>The question</h2>
          <p>
            Navy Federal holds {usd(now.total_assets)} of assets, {pct(industryShare, 1)} of the entire credit union industry,
            and serves {(now.members / 1e6).toFixed(1)} million members. Its credit losses stand out: the net charge-off rate is{' '}
            <b>{pct(now.net_charge_off_rate)}</b> annualized, {times(now.net_charge_off_rate, nco?.median)} the median of its{' '}
            {p.peer_count} size peers ({pct(nco?.median)}) and{' '}
            {ncoRank === 1 ? 'the highest in the group' : `${ordinal(ncoRank)} highest in the group`}. Is that a capital problem?
          </p>
          <p>
            {holds
              ? `Short answer, from the filings: not at present. ${strongEarnings ? 'Earnings absorb the losses, and capital' : 'Capital'} would stay above the 7% well-capitalized line even under a severe scenario.`
              : 'Short answer, from the filings: it could become one. Under the severe scenario below, capital falls under the 7% well-capitalized line within four quarters.'}{' '}
            The rest of this page shows the working.
          </p>
        </div>
        <aside className="span-5 case-facts" aria-label="Key figures">
          <dl>
            <div><dt>Net charge-offs</dt><dd>{pct(now.net_charge_off_rate)} <span>peer median {pct(nco?.median)}</span></dd></div>
            <div><dt>Delinquency, 60+ days</dt><dd>{pct(now.delinquency_rate)} <span>peer median {pct(dq?.median)}</span></dd></div>
            <div><dt>Return on assets</dt><dd>{pct(now.roa)} <span>{ordinal(roa?.percentile)} percentile</span></dd></div>
            <div><dt>Net worth ratio</dt><dd>{pct(now.net_worth_ratio)} <span>{ordinal(nwr?.percentile)} percentile</span></dd></div>
          </dl>
        </aside>

        <Exhibit
          className="span-6"
          id="cs-nco"
          title="Net charge-off rate"
          sub="against the peer corridor"
          tools={<PeerLegend />}
          source={`Annualized year-to-date charge-offs less recoveries ÷ average loans (ACCT_550, ACCT_551, ACCT_025B). Peers: ${p.method}.`}
        >
          <TrendChart rows={metricSeries(i, p, 'net_charge_off_rate', from)} format={fmt.pct} label="Net charge-off rate" height={230} />
        </Exhibit>
        <Exhibit
          className="span-6"
          id="cs-roa"
          title="Return on assets"
          sub="against the peer corridor"
          tools={<PeerLegend />}
          source="Annualized year-to-date net income ÷ average assets (ACCT_661A, ACCT_010)."
        >
          <TrendChart rows={metricSeries(i, p, 'roa', from)} format={fmt.pct} label="Return on assets" height={230} />
        </Exhibit>

        <div className="span-7 prose">
          <h2>What the filings show</h2>
          <ul>
            {pre && peakNco && (
              <li>
                Losses went from {pct(pre.net_charge_off_rate)} at the end of 2021 to a high of{' '}
                {pct(peakNco.net_charge_off_rate)} in {quarter(peakNco.quarter)}, and sit at {pct(now.net_charge_off_rate)} now.
                {isNum(peerAt('2021Q4')) && isNum(nco?.median) &&
                  ` Over the same years the peer median went from ${pct(peerAt('2021Q4'))} to ${pct(nco.median)}.`}
              </li>
            )}
            <li>
              Delinquency tells the same story earlier in the pipeline: {pct(now.delinquency_rate)} of loans are 60+ days
              past due, against a peer median of {pct(dq?.median)} ({ordinal(dq?.percentile)} percentile).
            </li>
            <li>
              Return on assets is {pct(now.roa)}, the {ordinal(roa?.percentile)} percentile of peers.
              {strongEarnings ? ' Whatever the loan book loses, it earns enough to cover it;' : ' Earnings are not outpacing peers;'} the
              Call Report fields CU Pulse loads cannot say which products drive that, which is the obvious next question.
            </li>
            <li>
              The net worth ratio is {pct(now.net_worth_ratio)}, about {usd(cushion)} of net worth above the 7% line, at the{' '}
              {ordinal(nwr?.percentile)} percentile of peers.
            </li>
          </ul>

          <h2>How much loss it could absorb</h2>
          <p>
            CU Pulse’s stress test rolls capital forward four quarters. In the earnings-retention case (no shock, all of
            today’s {pct(now.roa)} ROA kept as net worth, assets growing {pct(base.growth, 1)}), the ratio reaches{' '}
            <b>{pct(calmEnd.ratio)}</b> by {quarter(calmEnd.quarter)}, and Navy Federal could absorb a further{' '}
            <b>{pct(calmBreak, 1)}</b> of annualized charge-offs, {pct(base.nco + calmBreak, 1)} all-in, before falling to 7%.
          </p>
          <p>
            In the severe case (charge-offs up 2.5 points, pre-loss ROA down 0.5 points and a deposit inflow that grows assets
            6 points faster), the ratio ends at <b>{pct(severeEnd.ratio)}</b>
            {holds ? `, still well capitalized, with room for a further ${pct(severeBreak, 1)} of charge-offs.` : ', below the well-capitalized line.'} The arithmetic is deliberately simple and ignores interest-rate risk; see the
            caveats.
          </p>
        </div>
        <Exhibit
          className="span-5"
          id="cs-stress"
          title="Stress outcomes"
          sub={`net worth ratio at ${quarter(calmEnd.quarter)}`}
          source={`From the reported ratio for ${quarter(base.quarter)}. Breakeven is the extra annualized charge-off rate that leaves the ratio at exactly 7% after four quarters.`}
        >
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th scope="col">Scenario</th><th scope="col">Ratio</th><th scope="col">Charge-off breakeven</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row" style={{ fontWeight: 600 }}>Reported today</th><td>{pct(now.net_worth_ratio)}</td><td className="muted">—</td></tr>
                <tr><th scope="row" style={{ fontWeight: 600 }}>Earnings retention</th><td>{pct(calmEnd.ratio)}</td><td>+{pct(calmBreak, 1)}</td></tr>
                {nwFc && <tr><th scope="row" style={{ fontWeight: 600 }}>Statistical forecast</th><td className="proj">{pct(nwFc.path.at(-1).point)}</td><td className="muted">—</td></tr>}
                <tr><th scope="row" style={{ fontWeight: 600 }}>Severe</th><td>{pct(severeEnd.ratio)}</td><td>+{pct(severeBreak, 1)}</td></tr>
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 12 }}>
            <a href={href(CU, 'stress')}>Run your own scenario</a>
          </p>
        </Exhibit>

        {nwFc && (
          <Exhibit
            className="span-7"
            id="cs-fan"
            title="Net worth ratio"
            sub="reported and projected"
            tools={<FanLegend zones rows={fanSeries(i, nwFc, 'net_worth_ratio', '2022Q1')} />}
            source={`Projection: ${nwFc.model_label}, chosen by an 8-origin backtest. Bands are 50, 80 and 95% ranges.`}
          >
            <FanChart rows={fanSeries(i, nwFc, 'net_worth_ratio', '2022Q1')} format={fmt.pct} zones height={260} reveal={false} label="Net worth ratio" />
          </Exhibit>
        )}
        <div className="span-5 prose">
          <h2>What the forecast says, and how far to trust it</h2>
          {loansEnd && (
            <p>
              Loans are projected at {usd(loansEnd.point)} by {quarter(loansEnd.quarter)} (80% range {usd(loansEnd.lo80)}–
              {usd(loansEnd.hi80)}); the net worth ratio at {pct(nwFc?.path.at(-1).point)}.
            </p>
          )}
          {nwFc && (
            <p>
              <b>Why this differs from the {pct(calmEnd.ratio)} earnings-retention case.</b> The two answer different questions.
              The retention case applies today’s {pct(now.roa)} ROA to assets growing {pct(base.growth, 1)} a year. The
              statistical forecast extrapolates the ratio’s own history instead
              {isNum(histGrowth) && isNum(histRoa)
                ? `, in which assets grew about ${pct(histGrowth, 1)} a year against an average year-end ROA of ${pct(histRoa, 2)}; ${pace}, and the ratio stayed between ${pct(nwrLo)} and ${pct(nwrHi)}`
                : ''}
              . Dividends on shares are already an expense before net income, so they are not the gap.
            </p>
          )}
          {loans && (
            <p>
              In Navy Federal’s own backtest the selected loans model’s error was {pct(loans.backtest[loans.model].error, 1)}, and
              its 80% ranges held {pct(loans.backtest[loans.model].coverage80, 0)} of outcomes: useful for direction, too
              confident on range.
            </p>
          )}
          {ind?.total_loans && (
            <p>
              Across all {bt.data.credit_unions.toLocaleString('en-US')} credit unions, scored on quarters the model choice never
              saw, the loans forecast cut median error by {pct(ind.total_loans.skill_vs_drift, 0)} against the drift benchmark
              ({errFmt('total_loans')(ind.total_loans.median_error)} vs {errFmt('total_loans')(ind.total_loans.median_drift_error)}).{' '}
              <a href="#/accuracy">Full accuracy results</a>
            </p>
          )}
        </div>

        <div className="span-7 prose">
          <h2>What I would look at next</h2>
          <ul>
            <li><b>Loan mix.</b> The Call Report breaks loans out by product (credit card, auto, real estate). Charge-offs by product would show where the losses sit.</li>
            <li><b>Reserve coverage.</b> The allowance for credit losses against delinquent loans shows how much of the coming loss is already provisioned.</li>
            <li><b>Margin and rate sensitivity.</b> The high ROA depends on loan yields; a rate path and deposit-cost scenario would test it, which this stress test does not.</li>
            <li><b>Roll rates.</b> Movement from 30 to 60 to 90+ days delinquent would give an earlier signal than charge-offs.</li>
          </ul>
          <h2>Caveats</h2>
          <p>
            Figures are as filed with NCUA; derived ratios follow Financial Performance Report conventions and can differ
            slightly from NCUA’s own. The stress test is illustrative capital arithmetic, not a supervisory stress test, and
            does not model risk-based capital. CU Pulse is not affiliated with NCUA or Navy Federal.{' '}
            <a href={href(CU, 'method')}>Method and data notes</a>
          </p>
        </div>
      </div>
      <NextStep to="#/accuracy" label="How accurate are the forecasts?">
        The same model, scored on every credit union.
      </NextStep>
    </article>
  )
}
