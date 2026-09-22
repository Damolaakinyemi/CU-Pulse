import { describe, expect, it } from 'vitest'
import { niceTicks } from '../chartmath.js'
import { bp, ordinal, pct, pts, quarter, usd } from '../format.js'

describe('formatters', () => {
  it('formats money compactly', () => {
    expect(usd(204364276193)).toBe('$204.4B')
    expect(usd(9379047)).toBe('$9.38M')
    expect(usd(-2.5e9)).toBe('−$2.50B')
    expect(usd(null)).toBe('—')
  })
  it('formats ratios, points and basis points with signs', () => {
    expect(pct(0.1165)).toBe('11.65%')
    expect(pts(0.0029)).toBe('+0.29 pts')
    expect(bp(-0.0009)).toBe('−9 bp')
    expect(bp(0)).toBe('±0 bp')
  })
  it('handles ordinals and quarters', () => {
    expect([1, 2, 3, 11, 12, 13, 22, 101].map(ordinal)).toEqual(['1st', '2nd', '3rd', '11th', '12th', '13th', '22nd', '101st'])
    expect(quarter('2026Q2')).toBe('Q2 2026')
  })
})

describe('axis ticks', () => {
  it('uses round steps inside the domain', () => {
    expect(niceTicks([0.1014, 0.1304], 5)).toEqual([0.11, 0.12, 0.13])
    expect(niceTicks([4097, 5848], 6)).toEqual([4500, 5000, 5500])
    const t = niceTicks([-0.042, 0.304], 4)
    expect(t[0]).toBeGreaterThanOrEqual(-0.042)
    expect(t[t.length - 1]).toBeLessThanOrEqual(0.304)
  })
})
