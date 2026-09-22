import { isNum } from './format.js'

export function extent(rows, keys) {
  let lo = Infinity
  let hi = -Infinity
  for (const r of rows) {
    for (const k of keys) {
      const v = r[k]
      for (const x of Array.isArray(v) ? v : [v]) {
        if (isNum(x)) {
          lo = Math.min(lo, x)
          hi = Math.max(hi, x)
        }
      }
    }
  }
  return [lo, hi]
}

/** Round axis steps (1, 2, 2.5, 5 × 10ⁿ) and the ticks that cover a domain. */
export function niceStep([lo, hi], target) {
  const raw = (hi - lo) / Math.max(target - 1, 1)
  const mag = 10 ** Math.floor(Math.log10(raw))
  return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag
}

export function niceTicks(domain, target = 5) {
  const step = niceStep(domain, target)
  const ticks = []
  for (let t = Math.ceil(domain[0] / step) * step; t <= domain[1] + step * 1e-9; t += step) ticks.push(Number(t.toPrecision(12)))
  return ticks
}

/** True when the net worth fan's axis reaches the 7% line. */
export function zonesInView(rows) {
  const [lo] = extent(rows, ['actual', 'b95'])
  return lo - 0.07 < 0.03
}
