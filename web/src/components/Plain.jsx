import { ArrowRight, X } from 'lucide-react'
import { useState } from 'react'
import { WELL_CAPITALIZED, latest, latestPeer, lowConfidence } from '../lib/analysis.js'
import { isNum, pct, quarter } from '../lib/format.js'
import { href } from '../lib/router.js'
import Term from './Term.jsx'

function compare(value, median) {
  if (!isNum(value) || !isNum(median) || median === 0) return null
  const r = value / median
  return r > 1.25 ? 'more than' : r < 0.8 ? 'less than' : 'about the same as'
}

/** Three or four sentences a newcomer can read in fifteen seconds, all computed from the data. */
export function PlainSummary({ inst, peers, fc }) {
  const now = latest(inst)
  const nco = latestPeer(peers, 'net_charge_off_rate')
  const roa = latestPeer(peers, 'roa')
  const dq = latestPeer(peers, 'delinquency_rate')
  const nwr = now.net_worth_ratio
  const lines = []

  if (isNum(nwr)) {
    const gap = (nwr - WELL_CAPITALIZED) * 100
    lines.push(
      <>
        <b>Capital:</b> it keeps {pct(nwr)} of its assets as its own capital. Regulators call 7% or more{' '}
        <Term id="well_capitalized">well capitalized</Term>, so it is{' '}
        {gap >= 0 ? <b>{gap.toFixed(1)} points above that line</b> : <b className="warn-text">{Math.abs(gap).toFixed(1)} points below it</b>}.
      </>,
    )
  }
  const lossCmp = compare(now.net_charge_off_rate, nco?.median)
  if (lossCmp) {
    lines.push(
      <>
        <b>Losses:</b> it writes off {pct(now.net_charge_off_rate)} of its loans a year as{' '}
        <Term id="net_charge_off_rate">unrecoverable</Term>, {lossCmp} similar-sized credit unions (typically {pct(nco.median)})
        {compare(now.delinquency_rate, dq?.median) === 'more than' ? ', and more of its loans are behind on payments' : ''}.
      </>,
    )
  }
  const earnCmp = compare(now.roa, roa?.median)
  if (earnCmp) {
    lines.push(
      <>
        <b>Earnings:</b> it earns {pct(now.roa)} a year on its assets (<Term id="roa">ROA</Term>),{' '}
        {earnCmp === 'more than' ? 'more than' : earnCmp === 'less than' ? 'less than' : 'about the same as'} its peers (typically {pct(roa.median)}).
      </>,
    )
  }
  const n = fc?.series?.net_worth_ratio
  if (n) {
    const end = n.path[n.path.length - 1]
    lines.push(
      lowConfidence(n, 'net_worth_ratio') ? (
        <>
          <b>Next year:</b> its history is too volatile for a useful <Term id="forecast_fan">forecast</Term>.
        </>
      ) : (
        <>
          <b>Next year:</b> the model expects capital near {pct(end.point)} by {quarter(end.quarter)}, most likely between{' '}
          {pct(end.lo80)} and {pct(end.hi80)} (<Term id="range80">80% range</Term>).
        </>
      ),
    )
  }
  if (!lines.length) return null
  return (
    <section className="plain" aria-labelledby="plain-title">
      <h2 id="plain-title">In plain terms</h2>
      <ul>
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      <p className="plain-foot">
        Capital is as reported to NCUA; other ratios are derived from the filings; projections are CU Pulse model output.{' '}
        <a href={`${href(inst.cu_number, 'method')}?at=m-notes`}>Data notes</a>
      </p>
    </section>
  )
}

const GUIDE_KEY = 'cu-pulse:guide-dismissed'

function readDismissed() {
  try {
    return window.localStorage.getItem(GUIDE_KEY) === '1'
  } catch {
    return false
  }
}

/** A dismissible, first-visit strip explaining how to read the dashboard. Never a modal. */
export function Guide() {
  const [hidden, setHidden] = useState(readDismissed)
  if (hidden) return null
  const dismiss = () => {
    setHidden(true)
    try {
      window.localStorage.setItem(GUIDE_KEY, '1')
    } catch {
      // storage can be unavailable; the guide simply returns next visit
    }
  }
  return (
    <aside className="guide-strip" aria-label="How to read this page">
      <div className="guide-strip-head">
        <h2>New to credit union analysis?</h2>
        <button type="button" className="guide-close" onClick={dismiss} aria-label="Hide this guide">
          <X size={16} strokeWidth={2} />
        </button>
      </div>
      <p className="guide-text">
        Read <b>In plain terms</b> first, then the five vital signs: the dot shows where each ranks among{' '}
        <Term id="peers">similar credit unions</Term>. Tap any dotted word for a definition, or open the{' '}
        <a href="#/glossary">glossary</a>. Each page ends with a link to the next step.
      </p>
    </aside>
  )
}

/** One clear way forward at the end of every page, so the app reads as a path, not a pile of tabs. */
export function NextStep({ to, label, children }) {
  return (
    <nav className="next-step" aria-label="Next step">
      <a href={to}>
        <span className="next-step-kicker">Next</span>
        <span className="next-step-label">{label}</span>
        {children && <span className="next-step-text">{children}</span>}
        <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
      </a>
    </nav>
  )
}
