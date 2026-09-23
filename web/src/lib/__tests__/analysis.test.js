import { describe, expect, it } from 'vitest'
import { breakevenNco, fanSeries, projectCapital, reading, scenarioAt, stressBaseline, WELL_CAPITALIZED } from '../analysis.js'

const base = { assets: 1000, netWorth: 100, loanShare: 0.6, roa: 0.01, nco: 0.005, growth: 0.04, quarter: '2026Q2' }

describe('stress test', () => {
  it('rolls quarters forward across a year end', () => {
    const path = projectCapital(base, { growth: 0, nco: base.nco, roaShift: 0 })
    expect(path.map((p) => p.quarter)).toEqual(['2026Q2', '2026Q3', '2026Q4', '2027Q1', '2027Q2'])
  })

  it('adds a quarter of ROA each quarter when nothing is shocked', () => {
    const path = projectCapital(base, { growth: 0, nco: base.nco, roaShift: 0 })
    expect(path[4].netWorth).toBeCloseTo(100 + 4 * (1000 * 0.01) / 4)
    expect(path[4].ratio).toBeCloseTo(0.11)
  })

  it('charges only the charge-offs above the reported rate', () => {
    const path = projectCapital(base, { growth: 0, nco: base.nco + 0.02, roaShift: 0 })
    const extra = (600 * 0.02) / 4
    expect(path[1].income).toBeCloseTo((1000 * 0.01) / 4 - extra)
  })

  it('breakeven charge-off rate lands the ratio exactly on 7%', () => {
    const levers = { growth: 0.08, roaShift: -0.002 }
    const x = breakevenNco(base, levers)
    const path = projectCapital(base, { ...levers, nco: base.nco + x })
    expect(path[4].ratio).toBeCloseTo(WELL_CAPITALIZED, 10)
  })

  it('severity 0 is the baseline and 100 is the full severe case', () => {
    const calm = scenarioAt(base, 0)
    expect(calm.growth).toBe(base.growth)
    expect(calm.nco).toBe(base.nco)
    expect(calm.roaShift + 0).toBe(0)
    const severe = scenarioAt(base, 100)
    expect(severe.nco).toBeCloseTo(base.nco + 0.012)
    expect(severe.roaShift).toBeCloseTo(-0.003)
  })

  it('starts from the reported net worth ratio, not the balance-sheet quotient', () => {
    const inst = { quarters: [{ quarter: '2026Q2', total_assets: 1000, total_loans: 600, net_worth: 66, net_worth_ratio: 0.1086, roa: 0.01, net_charge_off_rate: 0.004 }] }
    const b = stressBaseline(inst, null)
    expect(b.netWorth / b.assets).toBeCloseTo(0.1086)
  })
})

describe('fan series', () => {
  it('opens the fan at the last reported value with zero width', () => {
    const inst = { quarters: [{ quarter: '2026Q1', x: 1 }, { quarter: '2026Q2', x: 2 }] }
    const fc = { path: [{ quarter: '2026Q3', point: 2.1, lo50: 2, hi50: 2.2, lo80: 1.9, hi80: 2.3, lo95: 1.8, hi95: 2.4 }] }
    const rows = fanSeries(inst, fc, 'x')
    expect(rows[1]).toMatchObject({ actual: 2, point: 2, b80: [2, 2], origin: true })
    expect(rows[2]).toMatchObject({ point: 2.1, b95: [1.8, 2.4] })
  })
})

describe('reading', () => {
  it('only states what the data supports', () => {
    const inst = { pca_tier: 'Well capitalized', quarters: [{ quarter: '2026Q2', net_worth_ratio: 0.1, total_assets: 1000, net_worth: 100 }] }
    const items = reading(inst, null, null)
    expect(items.map((i) => i.k)).toEqual(['Capital'])
    const text = items[0].parts.map((p) => (typeof p === 'string' ? p : p.b)).join('')
    expect(text).toContain('10.00%')
    expect(text).toContain('$30 of net worth')
  })
})

describe('honest readings on volatile forecasts', () => {
  const path = (lo80, hi80) => [{ quarter: '2027Q2', point: (lo80 + hi80) / 2, lo80, hi80, lo50: lo80, hi50: hi80, lo95: lo80, hi95: hi80 }]
  const inst = { pca_tier: 'Well capitalized', quarters: [{ quarter: '2026Q2', net_worth_ratio: 0.1086, total_assets: 9.4e6, net_worth: 1e6, loan_growth_yoy: 0.04, deposit_growth_yoy: 0.05, loan_to_share: 0.048 }] }

  it('flags a wide net worth ratio range as low confidence', async () => {
    const { lowConfidence } = await import('../analysis.js')
    expect(lowConfidence({ path: path(0.0149, 0.1836) }, 'net_worth_ratio')).toBe(true)
    expect(lowConfidence({ path: path(0.108, 0.1236) }, 'net_worth_ratio')).toBe(false)
    expect(lowConfidence({ path: path(9e6, 1.2e7) }, 'total_assets')).toBe(true)
  })

  it('replaces the outlook and model check instead of quoting noisy numbers', () => {
    const fc = { origins: 8, series: {
      net_worth_ratio: { path: path(0.0149, 0.1836) },
      total_loans: { model: 'ets', model_label: 'ETS', skill_vs_drift: 0.73, backtest: { ets: { error: 0.05, coverage80: 1 } }, path: path(1e5, 2e5) },
    } }
    const items = reading(inst, null, fc)
    const text = (k) => items.find((i) => i.k === k).parts.map((p) => (typeof p === 'string' ? p : p.b ?? p.p)).join('')
    expect(text('Outlook')).toContain('Too volatile to project usefully')
    expect(text('Model check')).not.toContain('73%')
    expect(text('Balance sheet')).toContain('loans are a small part of this balance sheet')
    expect(text('Balance sheet')).not.toContain('funding is outpacing')
  })
})
