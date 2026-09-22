import { useMemo, useState } from 'react'
import { Exhibit, Stamp } from '../components/Chrome.jsx'
import { StressChart } from '../components/Charts.jsx'
import { SEVERE, WELL_CAPITALIZED, breakevenNco, projectCapital, scenarioAt, stressBaseline } from '../lib/analysis.js'
import { bp, isNum, pct, quarter, usd } from '../lib/format.js'

function Lever({ id, label, value, min, max, step, onChange, format, note }) {
  const fill = `${((value - min) / (max - min)) * 100}%`
  return (
    <div className="lever">
      <div className="lever-head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{format(value)}</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} style={{ '--fill': fill }} onChange={(e) => onChange(Number(e.target.value))} />
      {note && <p className="lever-note">{note}</p>}
    </div>
  )
}

const PRESETS = [
  { label: 'Baseline', severity: 0 },
  { label: 'Moderate', severity: 40 },
  { label: 'Severe', severity: 100 },
]

export default function Stress({ inst, fc }) {
  const base = useMemo(() => stressBaseline(inst, fc), [inst, fc])
  const [severity, setSeverity] = useState(60)
  const [override, setOverride] = useState(null)

  const levers = override ?? scenarioAt(base, severity)
  const path = projectCapital(base, levers)
  const end = path[path.length - 1]
  const breakeven = breakevenNco(base, levers)
  const firstBreach = path.find((p, i) => i > 0 && p.ratio < WELL_CAPITALIZED)
  const cushion = end.netWorth - WELL_CAPITALIZED * end.assets
  const nwFc = fc?.series?.net_worth_ratio

  // The scenario carries the statistical model's own uncertainty: its 50/80% half-widths
  // at each horizon are laid around the scenario path, so the fan moves with the levers.
  const rows = path.map((p, i) => {
    const f = i > 0 ? nwFc?.path[i - 1] : null
    const band = (lo, hi) => (f ? [p.ratio - (f[hi] - f[lo]) / 2, p.ratio + (f[hi] - f[lo]) / 2] : null)
    return {
      quarter: p.quarter,
      stress: p.ratio,
      netWorth: p.netWorth,
      baseline: i === 0 ? p.ratio : f?.point ?? null,
      s80: i === 0 ? [p.ratio, p.ratio] : band('lo80', 'hi80'),
      s50: i === 0 ? [p.ratio, p.ratio] : band('lo50', 'hi50'),
      origin: i === 0,
    }
  })

  const setLever = (k) => (v) => setOverride({ ...levers, [k]: v })

  return (
    <div className="grid">
      <Exhibit
        className="span-4"
        id="stress-controls"
        title="Scenario"
        sub={`from ${quarter(base.quarter)}`}
        source={`Severity scales three levers together, linearly, up to: net charge-offs +${(SEVERE.nco * 100).toFixed(1)} pts, pre-loss ROA ${(SEVERE.roa * 100).toFixed(2)} pts, asset growth +${(SEVERE.growth * 100).toFixed(0)} pts (a deposit inflow that dilutes capital). Fine-tune any lever to break the link. Illustrative capital arithmetic, not NCUA stress-testing methodology.`}
      >
        <div className="severity">
          <div className="lever-head">
            <label htmlFor="sev">Severity</label>
            <output htmlFor="sev">{override ? 'Custom' : `${severity} / 100`}</output>
          </div>
          <input
            id="sev"
            type="range"
            min={0}
            max={100}
            step={1}
            value={severity}
            style={{ '--fill': `${severity}%` }}
            onChange={(e) => {
              setSeverity(Number(e.target.value))
              setOverride(null)
            }}
          />
          <div className="severity-scale">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                aria-pressed={severity === p.severity && !override}
                onClick={() => {
                  setSeverity(p.severity)
                  setOverride(null)
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Lever
          id="nco"
          label="Net charge-off rate"
          value={levers.nco}
          min={0}
          max={0.08}
          step={0.0005}
          onChange={setLever('nco')}
          format={(v) => `${pct(v)} · ${bp(v - base.nco)}`}
          note={`Reported ${pct(base.nco)} annualized. Increases above it hit net income directly.`}
        />
        <Lever
          id="roa"
          label="Pre-loss ROA shift"
          value={levers.roaShift}
          min={-0.015}
          max={0.005}
          step={0.0005}
          onChange={setLever('roaShift')}
          format={(v) => bp(v)}
          note={`Reported ROA ${pct(base.roa)}. Margin compression or expense growth.`}
        />
        <Lever
          id="growth"
          label="Asset growth, annualized"
          value={levers.growth}
          min={-0.1}
          max={0.25}
          step={0.0025}
          onChange={setLever('growth')}
          format={(v) => pct(v, 1)}
          note={`Model baseline ${pct(base.growth, 1)}. Faster growth dilutes the ratio.`}
        />
        {override && (
          <button type="button" className="button" style={{ marginTop: 14 }} onClick={() => setOverride(null)}>
            Relink levers to severity
          </button>
        )}
      </Exhibit>

      <Exhibit
        className="span-8"
        id="stress-out"
        title="Net worth ratio under the scenario"
        sub="four quarters"
        tools={firstBreach ? <Stamp kind="breach">Below 7% in {quarter(firstBreach.quarter)}</Stamp> : <Stamp kind="projected">Stays well capitalized</Stamp>}
        source="Scenario path: quarterly net worth rolls forward by pre-loss earnings less incremental charge-offs on a loan book held at today's share of assets; assets compound at the chosen growth rate. The shaded fan around it is the statistical model's own 50% and 80% spread at each horizon. Dashed line: the model's baseline projection."
      >
        <div className="outcomes">
          <div className="outcome">
            <span className="k">Ratio at {quarter(end.quarter)}</span>
            <span className={`v ${end.ratio < WELL_CAPITALIZED ? 'breach' : ''}`}>{pct(end.ratio)}</span>
            <span className="d">{bp(end.ratio - base.netWorth / base.assets)} vs {quarter(base.quarter)}</span>
          </div>
          <div className="outcome">
            <span className="k">Cushion over 7% at {quarter(end.quarter)}</span>
            <span className={`v ${cushion < 0 ? 'breach' : ''}`}>{usd(cushion)}</span>
            <span className="d">net worth above the well-capitalized line</span>
          </div>
          <div className="outcome">
            <span className="k">Charge-off breakeven</span>
            <span className="v">{isNum(breakeven) ? `+${pct(Math.max(breakeven, 0))}` : '—'}</span>
            <span className="d">
              {breakeven > 0
                ? `extra annualized charge-offs before 7%, ${pct(base.nco + breakeven)} all-in`
                : 'already below 7% before any extra losses'}
            </span>
          </div>
        </div>
        <StressChart rows={rows} />
        <div className="legend" style={{ marginTop: 8 }}>
          <span><i className="swatch line" /> Scenario</span>
          <span><i className="swatch dash" /> Model baseline</span>
          <span><i className="swatch fan" /> Scenario 50 · 80% ranges</span>
          <span><i className="swatch hatch" /> Below well capitalized</span>
        </div>
      </Exhibit>
    </div>
  )
}
