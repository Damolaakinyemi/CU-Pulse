import { Check, Link as LinkIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Exhibit, Stamp } from '../components/Chrome.jsx'
import { StressChart } from '../components/Charts.jsx'
import { LEVER_LIMITS, SEVERE, WELL_CAPITALIZED, breakevenNco, projectCapital, scenarioAt, stressBaseline } from '../lib/analysis.js'
import { bp, isNum, pct, quarter, usd } from '../lib/format.js'
import { extent } from '../lib/chartmath.js'
import { useTween } from '../lib/motion.js'
import { useHashParam } from '../lib/router.js'

function Lever({ id, label, value, min, max, step, onChange, format, note }) {
  const fill = `${((value - min) / (max - min)) * 100}%`
  return (
    <div className="lever">
      <div className="lever-head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{format(value)}</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} aria-valuetext={format(value)} style={{ '--fill': fill }} onChange={(e) => onChange(Number(e.target.value))} />
      {note && <p className="lever-note">{note}</p>}
    </div>
  )
}

const PRESETS = [
  { label: 'Earnings retention', severity: 0 },
  { label: 'Moderate', severity: 40 },
  { label: 'Severe', severity: 100 },
]

export default function Stress({ inst, fc }) {
  const base = useMemo(() => stressBaseline(inst, fc), [inst, fc])
  // Scenario lives in the link (?severity=80 or ?levers=nco,roa,growth) so it can be shared.
  const [sevParam, setSevParam] = useHashParam('severity', '60')
  const [leverParam, setLeverParam] = useHashParam('levers', null)
  const severity = Math.min(100, Math.max(0, Number(sevParam) || 0))
  const setSeverity = (v) => setSevParam(String(v))
  const parsed = leverParam?.split(',').map(Number)
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
  const override = parsed?.length === 3 && parsed.every(Number.isFinite)
    ? {
        nco: clamp(parsed[0], 0, base.nco + LEVER_LIMITS.ncoAbove),
        roaShift: clamp(parsed[1], LEVER_LIMITS.roaMin, LEVER_LIMITS.roaMax),
        growth: clamp(parsed[2], LEVER_LIMITS.growthMin, LEVER_LIMITS.growthMax),
      }
    : null
  const setOverride = (o) => setLeverParam(o ? [o.nco, o.roaShift, o.growth].map((x) => +x.toFixed(4)).join(',') : null)

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

  // Axis bounds cover calm through severe (and any custom path), so the ruler holds still.
  const bandRows = (p) => p.map((q, i) => {
    const f = i > 0 ? nwFc?.path[i - 1] : null
    const hw = f ? (f.hi80 - f.lo80) / 2 : 0
    return { stress: q.ratio, s80: [q.ratio - hw, q.ratio + hw] }
  })
  const [calmLo, calmHi] = extent(bandRows(projectCapital(base, scenarioAt(base, 0))), ['stress', 's80'])
  const [sevLo, sevHi] = extent(bandRows(projectCapital(base, scenarioAt(base, 100))), ['stress', 's80'])
  const [curLo, curHi] = extent(rows, ['stress', 'baseline', 's80'])
  const bounds = [Math.min(calmLo, sevLo, curLo), Math.max(calmHi, sevHi, curHi)]
  const breached = end.ratio < WELL_CAPITALIZED

  // Outcomes glide to their new values, so each change reads as a consequence.
  const shownRatio = useTween(end.ratio)
  const shownCushion = useTween(cushion)
  const shownBreakeven = useTween(Math.max(breakeven, 0))
  const [copied, setCopied] = useState(false)
  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      () => {},
    )
  }

  return (
    <div className="grid">
      <p className="span-12 figure-notes">
        <b>Illustrative, not a supervisory stress test.</b> The scenario is transparent capital arithmetic starting from
        the net worth ratio reported to NCUA for {quarter(base.quarter)}. It is not NCUA or credit-union stress-testing
        methodology and does not model risk-based capital.
      </p>
      <Exhibit
        className="span-4"
        id="stress-controls"
        title="Scenario"
        sub={`from ${quarter(base.quarter)}`}
        tools={
          <button type="button" className="button" onClick={copyLink} aria-live="polite">
            {copied ? <Check size={14} strokeWidth={2} /> : <LinkIcon size={14} strokeWidth={2} />}
            {copied ? 'Link copied' : 'Copy link to this scenario'}
          </button>
        }
        source={`Severity scales three levers together, linearly, up to a severe case calibrated to 2018–2026 history: net charge-offs +${(SEVERE.nco * 100).toFixed(1)} pts (the 95th-percentile rise among credit unions over $1B), pre-loss ROA ${(SEVERE.roa * 100).toFixed(1)} pts, asset growth +${(SEVERE.growth * 100).toFixed(0)} pts (a deposit inflow like 2020's, which dilutes capital). Manual charge-offs are capped at today's rate + 3 pts. Fine-tune any lever to break the link. At severity 0 (earnings retention) all of today's ROA is kept as net worth, while the dashed model baseline extrapolates the ratio's own history, so the two can differ. Illustrative capital arithmetic, not NCUA stress-testing methodology.`}
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
            aria-valuetext={override ? 'Custom levers' : `${severity} out of 100`}
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
          value={Math.min(levers.nco, base.nco + LEVER_LIMITS.ncoAbove)}
          min={0}
          max={+(base.nco + LEVER_LIMITS.ncoAbove).toFixed(4)}
          step={0.0005}
          onChange={setLever('nco')}
          format={(v) => `${pct(v)} · ${bp(v - base.nco)}`}
          note={`Reported ${pct(base.nco)} annualized. Increases above it hit net income directly.`}
        />
        <Lever
          id="roa"
          label="Pre-loss ROA shift"
          value={Math.max(levers.roaShift, LEVER_LIMITS.roaMin)}
          min={LEVER_LIMITS.roaMin}
          max={LEVER_LIMITS.roaMax}
          step={0.0005}
          onChange={setLever('roaShift')}
          format={(v) => bp(v)}
          note={`Reported ROA ${pct(base.roa)}. Margin compression or expense growth.`}
        />
        <Lever
          id="growth"
          label="Asset growth, annualized"
          value={levers.growth}
          min={LEVER_LIMITS.growthMin}
          max={LEVER_LIMITS.growthMax}
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
        tools={
          <span key={firstBreach ? 'breach' : 'safe'} className="stamp-in">
            {firstBreach ? <Stamp kind="breach">Below 7% in {quarter(firstBreach.quarter)}</Stamp> : <Stamp kind="projected">Stays well capitalized</Stamp>}
          </span>
        }
        source="Scenario path: quarterly net worth rolls forward by pre-loss earnings less incremental charge-offs on a loan book held at today's share of assets; assets compound at the chosen growth rate. The shaded fan around it is the statistical model's own 50% and 80% spread at each horizon. Dashed line: the model's baseline projection."
      >
        <div className="outcomes">
          <div className="outcome">
            <span className="k">Ratio at {quarter(end.quarter)}</span>
            <span className={`v ${breached ? 'breach' : ''}`}>{pct(shownRatio)}</span>
            <span className="d">{bp(end.ratio - base.netWorth / base.assets)} vs {quarter(base.quarter)}</span>
          </div>
          <div className="outcome">
            <span className="k">Cushion over 7% at {quarter(end.quarter)}</span>
            <span className={`v ${cushion < 0 ? 'breach' : ''}`}>{usd(shownCushion)}</span>
            <span className="d">net worth above the well-capitalized line</span>
          </div>
          <div className="outcome">
            <span className="k">Charge-off breakeven</span>
            <span className="v">{isNum(breakeven) ? `+${pct(shownBreakeven)}` : '—'}</span>
            <span className="d">
              {breakeven > 0
                ? `extra annualized charge-offs before 7%, ${pct(base.nco + breakeven)} all-in`
                : 'already below 7% before any extra losses'}
            </span>
          </div>
        </div>
        <StressChart rows={rows} bounds={bounds} breach={breached} />
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
