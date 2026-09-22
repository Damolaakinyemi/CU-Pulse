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
    expect(severe.nco).toBeCloseTo(base.nco + 0.025)
    expect(severe.roaShift).toBeCloseTo(-0.005)
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
