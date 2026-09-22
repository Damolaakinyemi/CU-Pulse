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

/** True when the net worth fan's axis reaches the 7% line. */
export function zonesInView(rows) {
  const [lo] = extent(rows, ['actual', 'b95'])
  return lo - 0.07 < 0.03
}
