import { bp, isNum, ordinal, pct, pts, quarter, usd } from './format.js'

export const WELL_CAPITALIZED = 0.07

/** Join an institution's quarters with peer quartiles for one metric. */
export function metricSeries(inst, peers, key, from) {
  const peerByQ = new Map((peers?.series?.[key] ?? []).map((p) => [p.quarter, p]))
  return inst.quarters
    .filter((q) => !from || q.quarter >= from)
    .map((q) => {
      const p = peerByQ.get(q.quarter)
      return {
        quarter: q.quarter,
        value: q[key],
        median: p?.median ?? null,
        iqr: p ? [p.p25, p.p75] : null,
        percentile: p?.percentile ?? null,
      }
    })
}

/**
 * History plus fan for a forecast series. The fan starts at the last reported
 * value (zero width) so it visibly opens from the forecast origin.
 */
export function fanSeries(inst, fc, key, from) {
  const hist = inst.quarters.filter((q) => (!from || q.quarter >= from) && isNum(q[key]))
  const rows = hist.map((q) => ({ quarter: q.quarter, actual: q[key] }))
  if (!fc) return rows
  const last = rows[rows.length - 1]
  if (last) {
    const v = last.actual
    Object.assign(last, { point: v, b95: [v, v], b80: [v, v], b50: [v, v], origin: true })
  }
  for (const p of fc.path) {
    rows.push({ quarter: p.quarter, point: p.point, b95: [p.lo95, p.hi95], b80: [p.lo80, p.hi80], b50: [p.lo50, p.hi50] })
  }
  return rows
}

export function latest(inst) {
  return inst.quarters[inst.quarters.length - 1]
}

export function prior(inst, lag = 1) {
  return inst.quarters[inst.quarters.length - 1 - lag]
}

export function latestPeer(peers, key) {
  const s = peers?.series?.[key]
  return s && s.length ? s[s.length - 1] : null
}

/** "above 80% of peers" phrasing that stays neutral about direction. */
export function standing(p) {
  if (!p || !isNum(p.percentile)) return null
  return `${ordinal(p.percentile)} percentile`
}

/**
 * A projection too wide to act on: an 80% range wider than 4 points of net worth
 * ratio, or wider than 25% of the level for a balance.
 */
export function lowConfidence(series, key) {
  const path = series?.path
  if (!path?.length) return false
  const wide = path.some((p) => (key === 'net_worth_ratio' ? p.hi80 - p.lo80 > 0.04 : p.lo80 > 0 && p.hi80 / p.lo80 - 1 > 0.25))
  if (wide || key === 'net_worth_ratio') return wide
  // A balance projection that swings by more than 25% between quarters is not a forecast anyone should plan on.
  return path.some((p, i) => i > 0 && Math.abs(p.point / path[i - 1].point - 1) > 0.25)
}

/** A computed analyst reading: every clause is derived from the data shown. */
export function reading(inst, peers, fc) {
  const now = latest(inst)
  const prev = prior(inst)
  const items = []
  const tier = inst.pca_tier
  const nwPeer = latestPeer(peers, 'net_worth_ratio')

  if (isNum(now.net_worth_ratio)) {
    const cushion = (now.net_worth_ratio - WELL_CAPITALIZED) * now.total_assets
    items.push({
      k: 'Capital',
      parts: [
        'Net worth ratio of ', { b: pct(now.net_worth_ratio) }, ` (${tier?.toLowerCase() ?? 'tier unknown'})`,
        prev && isNum(prev.net_worth_ratio) ? `, ${pts(now.net_worth_ratio - prev.net_worth_ratio)} on the quarter` : '',
        nwPeer ? `; ${standing(nwPeer)} of ${peers.peer_count} size peers (median ${pct(nwPeer.median)})` : '',
        isNum(cushion) ? `. About ${usd(cushion)} of net worth above the 7% well-capitalized line.` : '.',
      ],
    })
  }

  if (isNum(now.loan_growth_yoy) || isNum(now.deposit_growth_yoy)) {
    const gap = isNum(now.loan_growth_yoy) && isNum(now.deposit_growth_yoy) ? now.loan_growth_yoy - now.deposit_growth_yoy : null
    items.push({
      k: 'Balance sheet',
      parts: [
        'Loans ', { b: pct(now.loan_growth_yoy, 1) }, ' and shares & deposits ', { b: pct(now.deposit_growth_yoy, 1) }, ' year over year',
        isNum(now.loan_to_share) && now.loan_to_share < 0.2
          ? `; loans are a small part of this balance sheet (loan-to-share ${pct(now.loan_to_share, 1)}).`
          : [
              isNum(gap) ? (gap < 0 ? '; funding is outpacing lending' : '; lending is outpacing funding') : '',
              isNum(now.loan_to_share) ? `, loan-to-share at ${pct(now.loan_to_share, 1)}.` : '.',
            ].join(''),
      ],
    })
  }

  if (isNum(now.delinquency_rate)) {
    const dq = latestPeer(peers, 'delinquency_rate')
    const yr = prior(inst, 4)
    items.push({
      k: 'Credit',
      parts: [
        'Delinquency (60+ days) ', { b: pct(now.delinquency_rate) },
        yr && isNum(yr.delinquency_rate) ? `, ${bp(now.delinquency_rate - yr.delinquency_rate)} year over year` : '',
        dq ? `; peer median ${pct(dq.median)}` : '',
        isNum(now.net_charge_off_rate) ? `. Net charge-offs ${pct(now.net_charge_off_rate)} annualized.` : '.',
      ],
    })
  }

  if (isNum(now.roa)) {
    const r = latestPeer(peers, 'roa')
    items.push({
      k: 'Earnings',
      parts: ['ROA ', { b: pct(now.roa) }, ' annualized year to date', r ? `, ${standing(r)} among peers (median ${pct(r.median)}).` : '.'],
    })
  }

  const a = fc?.series?.total_assets
  const n = fc?.series?.net_worth_ratio
  const volatile = (n && lowConfidence(n, 'net_worth_ratio')) || (a && lowConfidence(a, 'total_assets'))
  if (volatile) {
    const s = n && lowConfidence(n, 'net_worth_ratio') ? n : a
    const e = s.path[s.path.length - 1]
    const f = s === n ? (v) => pct(v) : (v) => usd(v)
    items.push({
      k: 'Outlook',
      parts: [
        { b: 'Too volatile to project usefully.' },
        ` The 80% range for ${s === n ? 'the net worth ratio' : 'total assets'} at ${quarter(e.quarter)} spans ${f(e.lo80)} to ${f(e.hi80)}; read the history, not the projection.`,
      ],
    })
  } else if (a || n) {
    const end = (s) => s.path[s.path.length - 1]
    const parts = []
    if (a) parts.push('Total assets projected at ', { p: usd(end(a).point) }, ` by ${quarter(end(a).quarter)} (80%: ${usd(end(a).lo80)}–${usd(end(a).hi80)})`)
    if (n) parts.push(a ? '; net worth ratio ' : 'Net worth ratio ', { p: pct(end(n).point) }, ` (80%: ${pct(end(n).lo80)}–${pct(end(n).hi80)})`)
    parts.push('.')
    items.push({ k: 'Outlook', parts })
  }

  const l = fc?.series?.total_loans
  if (l && volatile) {
    items.push({
      k: 'Model check',
      parts: [`On a history this volatile, backtest scores from ${fc.origins} origins say little about the next four quarters, so CU Pulse does not quote them here. They are on the Forecast tab.`],
    })
  } else if (l) {
    const chosen = l.backtest[l.model]
    const skill = l.skill_vs_drift != null
      ? ['with ', { b: `${Math.round(l.skill_vs_drift * 100)}% lower error` }, ' than the drift benchmark']
      : ['the drift benchmark itself, which no candidate beat']
    items.push({
      k: 'Model check',
      parts: [
        l.skill_vs_drift != null ? `Loans forecast by ${l.model_label.toLowerCase()}, ` : 'Loans forecast by ',
        ...skill,
        ` over ${fc.origins} out-of-sample origins (MAPE ${pct(chosen.error, 1)}); 80% intervals held ${pct(chosen.coverage80, 0)} of outcomes.`,
      ],
    })
  }
  return items
}

/* ───────────── Stress test ───────────── */

export const SEVERE = { nco: 0.025, roa: -0.005, growth: 0.06 }

export function stressBaseline(inst, fc) {
  const now = latest(inst)
  const a = fc?.series?.total_assets
  const growth = a ? a.path[a.path.length - 1].point / now.total_assets - 1 : now.asset_growth_yoy ?? now.deposit_growth_yoy ?? 0.04
  // Start from NCUA's reported ratio: net worth as PCA measures it, which can differ from
  // the balance-sheet figure (average-asset measurement, CECL transition relief).
  const ratio = isNum(now.net_worth_ratio) ? now.net_worth_ratio : now.net_worth / now.total_assets
  return {
    assets: now.total_assets,
    netWorth: ratio * now.total_assets,
    loanShare: now.total_loans / now.total_assets,
    roa: isNum(now.roa) ? now.roa : 0,
    nco: isNum(now.net_charge_off_rate) ? now.net_charge_off_rate : 0,
    growth: isNum(growth) ? growth : 0.04,
    quarter: now.quarter,
  }
}

/**
 * Four-quarter capital projection. Extra charge-offs above the reported rate
 * flow straight through earnings (credit unions pay no income tax).
 */
export function projectCapital(base, { growth, nco, roaShift }) {
  const extraNco = nco - base.nco
  let assets = base.assets
  let nw = base.netWorth
  const q0 = base.quarter
  const path = [{ quarter: q0, ratio: nw / assets, netWorth: nw, assets }]
  let y = Number(q0.slice(0, 4))
  let q = Number(q0.slice(5))
  for (let h = 1; h <= 4; h++) {
    const loans = assets * base.loanShare
    const income = (assets * (base.roa + roaShift)) / 4 - (loans * extraNco) / 4
    nw += income
    assets *= 1 + growth / 4
    q += 1
    if (q > 4) {
      q = 1
      y += 1
    }
    path.push({ quarter: `${y}Q${q}`, ratio: nw / assets, netWorth: nw, assets, income })
  }
  return path
}

/** Additional annualized charge-off rate that would take the ratio to 7% at quarter 4. */
export function breakevenNco(base, { growth, roaShift }) {
  let assets = base.assets
  let earn = 0
  let loanSum = 0
  for (let h = 1; h <= 4; h++) {
    earn += (assets * (base.roa + roaShift)) / 4
    loanSum += (assets * base.loanShare) / 4
    assets *= 1 + growth / 4
  }
  const x = (base.netWorth + earn - WELL_CAPITALIZED * assets) / loanSum
  return x
}

export function scenarioAt(base, severity) {
  const s = severity / 100
  return {
    growth: base.growth + SEVERE.growth * s,
    nco: base.nco + SEVERE.nco * s,
    roaShift: SEVERE.roa * s,
  }
}

/** Reported and simple-quotient net worth ratios differ by more than 5 bp. */
export function nwrGap(q) {
  return isNum(q?.net_worth_ratio) && isNum(q?.net_worth_ratio_computed) && Math.abs(q.net_worth_ratio - q.net_worth_ratio_computed) > 0.0005
}
