// Chart colors mirror styles.css tokens; SVG attributes need literal values.
export const C = {
  ink: '#0e1a2b',
  ink2: '#384456',
  ink3: '#5d6878',
  rule: '#d6dbe2',
  ruleSoft: '#e7eaee',
  fan: '#2833c8',
  fanInk: '#1f28a3',
  fan50: 'rgba(40, 51, 200, 0.46)',
  fan80: 'rgba(40, 51, 200, 0.24)',
  fan95: 'rgba(40, 51, 200, 0.11)',
  peer: '#7b8594',
  peerBand: 'rgba(123, 133, 148, 0.2)',
  breach: '#b3261e',
  sheet: '#ffffff',
}

export const AXIS = {
  tickLine: false,
  axisLine: false,
  tick: { fill: C.ink3, fontSize: 11 },
}

export const GRID = { stroke: C.ruleSoft, vertical: false }
