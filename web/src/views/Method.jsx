import { pct, quarter, usd } from '../lib/format.js'

export default function Method({ meta, peers, fc }) {
  const models = meta.forecast.models
  return (
    <div className="grid">
      <nav className="span-3 toc" aria-label="On this page">
        <a href="#m-data">Data</a>
        <a href="#m-notes">Data notes</a>
        <a href="#m-updates">Updates</a>
        <a href="#m-defs">Definitions</a>
        <a href="#m-peers">Peers</a>
        <a href="#m-forecast">Forecast</a>
        <a href="#m-stress">Stress test</a>
        <a href="#m-limits">Limitations</a>
      </nav>
      <article className="span-8 prose">
        <h2 id="m-data">Data</h2>
        <p>
          Every figure comes from NCUA’s 5300 Call Report quarterly public data files, which each federally insured credit
          union files every quarter. CU Pulse loads {quarter(meta.first_quarter)} through {quarter(meta.latest_quarter)}:{' '}
          {meta.active_count.toLocaleString('en-US')} credit unions filed in the latest quarter, holding {usd(meta.industry_assets)} in
          total assets.
        </p>
        <p>
          The pipeline downloads each quarterly zip, reads the <code>FOICU</code> profile table and the <code>FS220</code> and{' '}
          <code>FS220A</code> schedules, and keeps one row per credit union per quarter. Rebuild it with{' '}
          <code>python -m pipeline.ncua --download</code>. Source:{' '}
          <a href={meta.source_url} target="_blank" rel="noreferrer">NCUA quarterly Call Report data</a>.
        </p>

        <h2 id="m-notes">Data notes</h2>
        <p>Every figure in CU Pulse is one of three kinds, and the app labels which:</p>
        <ul>
          <li>
            <b>As filed.</b> Balances (assets, loans, shares, net worth, delinquent loans, members) and the net worth ratio
            are exactly what each credit union reported on its Call Report.
          </li>
          <li>
            <b>Derived.</b> Growth rates, delinquency rate, ROA, net charge-off rate and loan-to-share are calculated here
            from filed balances using Financial Performance Report conventions. They can differ slightly from NCUA’s own
            FPR, which uses additional averaging.
          </li>
          <li>
            <b>Model output.</b> Projections, the computed reading, peer percentiles and stress results are produced by CU
            Pulse. They are not NCUA data or NCUA assessments.
          </li>
        </ul>
        <p>
          <b>Net worth ratio.</b> CU Pulse shows the ratio each credit union reported to NCUA (<code>ACCT_998</code>),
          which is the figure prompt corrective action uses. It can differ from total net worth ÷ quarter-end assets
          because NCUA lets credit unions measure total assets as an average (daily, monthly or quarter-end), and because
          CECL transition relief adds to net worth for this purpose. For most credit unions the two agree to within 0.01
          point; where they differ by more than 0.05 point, the Overview shows both.
        </p>
        <p>
          <b>Names.</b> Credit unions appear under NCUA’s short listing names, which can drop “Federal Credit Union” or
          use a nickname (for example, “Pentagon” for PenFed). The charter number is the reliable identifier.
        </p>
        <p>
          <b>Extreme values.</b> Very small, new or liquidating credit unions can report ratios that look impossible,
          such as a negative net worth ratio or ROA above 100%. CU Pulse shows them as filed rather than hiding them.
        </p>
        <p>
          <b>Mergers.</b> When one credit union absorbs another, its balances jump. Year-over-year growth of 40% or more
          is flagged in the peer table, but forecasts do not adjust for mergers.
        </p>

        <h2 id="m-updates">Updates</h2>
        {meta.updates?.enabled ? (
          <p>
            CU Pulse checks ncua.gov every {meta.updates.interval_hours} hours for the next quarter’s file and re-checks the
            two most recent quarters for amendments, which NCUA re-posts when credit unions refile. New data is loaded
            without a restart. NCUA usually publishes a quarter about two months after it ends. Last check:{' '}
            {meta.updates.checked_at ? new Date(meta.updates.checked_at).toLocaleString('en-US') : 'pending'}
            {meta.updates.awaiting ? `; waiting for ${quarter(`${meta.updates.awaiting.slice(0, 4)}Q${Number(meta.updates.awaiting.slice(5)) / 3}`)}` : ''}
            {meta.updates.error ? `. The last check could not reach NCUA (${meta.updates.error}); the next one will retry.` : '.'}
          </p>
        ) : (
          <p>Automatic checks are turned off on this server. Run <code>python -m pipeline.ncua --update</code> to pull new quarters.</p>
        )}

        <h2 id="m-defs">Definitions</h2>
        <p>
          Flows reported year to date (net income, charge-offs) are annualized by 4 ÷ quarter number and divided by the average
          of the current and prior year-end balance, following NCUA’s Financial Performance Report convention.
        </p>
      </article>
      <div className="span-3" aria-hidden="true" />
      <div className="span-8 table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col" style={{ textAlign: 'left' }}>Formula</th>
              <th scope="col">Accounts</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(meta.definitions).map(([k, d]) => (
              <tr key={k}>
                <th scope="row" style={{ fontWeight: 600 }}>{d.label}</th>
                <td style={{ textAlign: 'left', whiteSpace: 'normal' }}>{d.formula}</td>
                <td className="muted">{d.accounts.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="span-3" aria-hidden="true" />
      <article className="span-8 prose">
        <h2 id="m-peers">Peers</h2>
        <p>
          NCUA’s own peer groups stop at “over $500 million”, which would put a $200 billion institution beside $600 million
          ones. CU Pulse instead takes the {peers?.peer_count ?? 25} active credit unions nearest the subject in log total assets
          for the latest quarter, then holds that set fixed through history so trends compare like with like. Percentiles are
          the share of peers strictly below the subject.
        </p>

        <h2 id="m-forecast">Forecast</h2>
        <p>
          Total assets, loans, and shares & deposits are modeled in logs; the net worth ratio is modeled in levels. Three
          candidates compete for each series:
        </p>
        <ul>
          {Object.entries(models).map(([k, label]) => (
            <li key={k}>
              <b>{label}</b>
              {k === 'drift' ? ': the benchmark every other model must beat.' : '.'}
            </li>
          ))}
        </ul>
        <p>
          Each candidate is re-fit at eight historical origins using only the data available at the time and forecasts the next
          four quarters. The model with the lowest average error across those 32 out-of-sample forecasts is selected and re-fit
          on the full history. Intervals widen with the square root of the horizon from the model’s one-step residual spread;
          the backtest reports how often the realized values actually landed inside them, so a too-narrow interval shows up as
          low coverage rather than hiding.
        </p>
        {fc?.series?.total_loans && (
          <p>
            For this credit union’s loans, the selected model’s 80% ranges held{' '}
            {pct(fc.series.total_loans.backtest[fc.series.total_loans.model].coverage80, 0)} of outcomes in the backtest.
          </p>
        )}

        <h2 id="m-stress">Stress test</h2>
        <p>
          The scenario rolls net worth forward one quarter at a time: pre-loss earnings (reported ROA plus the chosen shift)
          less incremental charge-offs on a loan book held at today’s share of assets, while assets compound at the chosen
          growth rate. Credit unions pay no income tax, so losses pass through to net worth in full. The breakeven figure solves
          for the additional charge-off rate that would leave the ratio at exactly 7% after four quarters.
        </p>
        <p>
          Capital tiers follow NCUA’s prompt corrective action rule (12 CFR 702.102): well capitalized at 7% or more, adequately
          capitalized 6–7%, undercapitalized 4–6%, significantly undercapitalized 2–4%, critically undercapitalized below 2%.
          Complex credit unions (over $500 million) also face risk-based capital requirements, which this ratio does not
          capture.
        </p>

        <h2 id="m-limits">Limitations</h2>
        <ul>
          <li>Call Report data is self-reported and occasionally amended after release; CU Pulse shows the file as published.</li>
          <li>Mergers change balance sheets discontinuously. The forecast uses the longest unbroken run of filings, but an acquisition inside that run still looks like growth.</li>
          <li>Statistical models extrapolate the past. They know nothing about rate policy, management plans, or the economy.</li>
          <li>The stress test is transparent arithmetic for discussion, not a supervisory stress test.</li>
        </ul>
      </article>
    </div>
  )
}
