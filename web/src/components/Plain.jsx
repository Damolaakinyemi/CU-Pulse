import { X } from 'lucide-react'
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
export function Guide({ cu }) {
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
        <h2>New to credit union analysis? How to read this page in a minute</h2>
        <button type="button" className="guide-close" onClick={dismiss} aria-label="Hide this guide">
          <X size={16} strokeWidth={2} />
        </button>
      </div>
      <ol>
        <li>
          <b>Start with “In plain terms”</b> below: the whole picture in four sentences.
        </li>
        <li>
          <b>The five figures</b> are the credit union’s vital signs. The dot on each line shows where it ranks among{' '}
          <Term id="peers">similar credit unions</Term>; the caption says whether higher or lower is stronger.
        </li>
        <li>
          <b>The big chart</b> is capital over time. Solid ink is what was reported; the shaded{' '}
          <Term id="forecast_fan">fan</Term> is the projection.
        </li>
        <li>
          <b>Any dotted-underlined word</b> can be tapped for a definition. The tabs go deeper, and the{' '}
          <a href="#/glossary">glossary</a> explains every term. The <a href={href(cu, 'stress')}>Stress test</a> is the most
          hands-on place to start.
        </li>
      </ol>
      <button type="button" className="button" onClick={dismiss}>
        Got it, hide this
      </button>
    </aside>
  )
}
