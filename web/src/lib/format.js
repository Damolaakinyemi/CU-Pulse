const nf = (digits) => new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

/** 0.1165 → "11.65%" */
export function pct(v, digits = 2) {
  return isNum(v) ? `${nf(digits).format(v * 100)}%` : '—'
}

/** Change in a ratio, in percentage points: 0.0029 → "+0.29 pts" */
export function pts(v, digits = 2) {
  if (!isNum(v)) return '—'
  const s = nf(digits).format(Math.abs(v * 100))
  return `${v > 0 ? '+' : v < 0 ? '−' : '±'}${s} pts`
}

/** Change in a ratio, in basis points: 0.0029 → "+29 bp" */
export function bp(v) {
  if (!isNum(v)) return '—'
  const n = Math.round(v * 10000)
  return `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n)} bp`
}

/** Dollars, compact: 204364276193 → "$204.4B" */
export function usd(v, digits) {
  if (!isNum(v)) return '—'
  const a = Math.abs(v)
  const sign = v < 0 ? '−' : ''
  const [div, unit] = a >= 1e12 ? [1e12, 'T'] : a >= 1e9 ? [1e9, 'B'] : a >= 1e6 ? [1e6, 'M'] : a >= 1e3 ? [1e3, 'K'] : [1, '']
  const d = digits ?? (div === 1 ? 0 : a / div >= 10 ? 1 : 2)
  return `${sign}$${nf(d).format(a / div)}${unit}`
}

export function count(v) {
  return isNum(v) ? new Intl.NumberFormat('en-US').format(Math.round(v)) : '—'
}

export function compactCount(v) {
  if (!isNum(v)) return '—'
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}

export function ordinal(n) {
  if (!isNum(n)) return '—'
  const r = Math.round(n)
  const s = ['th', 'st', 'nd', 'rd']
  const v = r % 100
  return `${r}${s[(v - 20) % 10] || s[v] || s[0]}`
}

/** "2026Q2" → "Q2 2026" */
export function quarter(q) {
  return q ? `${q.slice(4)} ${q.slice(0, 4)}` : '—'
}

/** Axis tick: "2026Q2" → "’26" on Q1 only, else "" (sparse ticks) */
export function quarterTick(q) {
  return q && q.endsWith('Q1') ? `’${q.slice(2, 4)}` : ''
}

/** Formatter for a metric key: ratios as %, balances as $. */
export function forMetric(key) {
  return key.startsWith('total_') || key === 'net_worth' ? (v) => usd(v) : (v) => pct(v)
}

export const fmt = { pct: (v) => pct(v), pct1: (v) => pct(v, 1), usd: (v) => usd(v) }
