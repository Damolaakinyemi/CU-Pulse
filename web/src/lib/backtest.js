import { pct } from './format.js'

/** Error formatter per series: MAPE for balances, ratio points for the net worth ratio. */
export const errFmt = (key) => (key === 'net_worth_ratio' ? (v) => `${(v * 100).toFixed(2)} pts` : (v) => pct(v, 2))

/** The headline finding for one series, stated only as strongly as the numbers allow. */
export function finding(key, s, label) {
  if (!s) return null
  const skill = Math.round(s.skill_vs_drift * 100)
  const beat = Math.round(s.beats_drift_share * 100)
  const cov = Math.round(s.coverage80_mean * 100)
  const vs = skill > 0 ? `${skill}% lower median error than the drift benchmark` : skill < 0 ? `${-skill}% higher median error than the drift benchmark` : 'the same median error as the drift benchmark'
  return `${label}: ${vs}, better for ${beat}% of credit unions; 80% ranges held ${cov}% of outcomes.`
}
