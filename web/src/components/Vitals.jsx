import { latest, latestPeer, prior } from '../lib/analysis.js'
import { bp, isNum, pct, pts } from '../lib/format.js'
import { PercentileRule, Skeleton } from './Chrome.jsx'

const CHANGE = {
  net_worth_ratio: (a, b) => `${pts(a - b)} q/q`,
  loan_growth_yoy: (a, b) => `${pts(a - b, 1)} vs prior qtr`,
  deposit_growth_yoy: (a, b) => `${pts(a - b, 1)} vs prior qtr`,
  delinquency_rate: (a, b) => `${bp(a - b)} q/q`,
  roa: (a, b) => `${bp(a - b)} q/q`,
}

export default function Vitals({ inst, peers, meta }) {
  const now = latest(inst)
  const prev = prior(inst)
  return (
    <div className="vitals" role="list" aria-label="Headline metrics">
      {meta.headline.map((key) => {
        const def = meta.definitions[key]
        const v = now[key]
        const p = prev?.[key]
        return (
          <div className="vital" role="listitem" key={key}>
            <div className="vital-label">
              <span>{def.label}</span>
              <span className="prov" title={key === 'net_worth_ratio' ? 'As reported to NCUA (ACCT_998)' : `Derived: ${def.formula}`}>
                {key === 'net_worth_ratio' && inst.net_worth_ratio_source === 'reported' ? 'As filed' : 'Derived'}
              </span>
            </div>
            <div className="vital-value">{pct(v, key.includes('growth') ? 1 : 2)}</div>
            <div className="vital-change">
              {isNum(v) && isNum(p) ? <b>{CHANGE[key](v, p)}</b> : 'No prior quarter'}
            </div>
            {peers ? (
              <PercentileRule value={v} peer={latestPeer(peers, key)} better={def.better} />
            ) : (
              <Skeleton height={28} style={{ marginTop: 10 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
