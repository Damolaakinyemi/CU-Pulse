import { FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, retry, useResource } from './api.js'
import { ErrorNotice, Skeleton } from './components/Chrome.jsx'
import Search from './components/Search.jsx'
import Vitals from './components/Vitals.jsx'
import { latest } from './lib/analysis.js'
import { count, isNum, quarter, usd } from './lib/format.js'
import { SECTIONS, href, useRoute } from './lib/router.js'
import Forecast from './views/Forecast.jsx'
import Home from './views/Home.jsx'
import Method from './views/Method.jsx'
import Overview from './views/Overview.jsx'
import Peers from './views/Peers.jsx'
import Report from './views/Report.jsx'
import Stress from './views/Stress.jsx'
import Trends from './views/Trends.jsx'

function Wordmark() {
  return (
    <a className="wordmark" href="#/" aria-label="CU Pulse home">
      <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden="true">
        <path d="M1 12.5 L9 9 L21 2 L21 16 Z" fill="#2833c8" fillOpacity="0.35" />
        <path d="M9 9 L21 5.5 L21 12.5 Z" fill="#8f97ff" />
        <path d="M1 12.5 L9 9" stroke="#eef1f6" strokeWidth="2" strokeLinecap="round" />
      </svg>
      CU Pulse
    </a>
  )
}

function Masthead({ inst, section }) {
  const now = latest(inst)
  return (
    <div className="masthead">
      <div>
        <h1>{inst.name}</h1>
        <ul className="facts">
          <li>Charter <strong>{inst.cu_number}</strong></li>
          <li>{inst.city}, {inst.state}</li>
          <li>{inst.charter_type}</li>
          <li><strong>{usd(now.total_assets)}</strong> assets{isNum(inst.asset_rank) && `, #${count(inst.asset_rank)} of ${count(inst.active_count)}`}</li>
          <li><strong>{count(now.members)}</strong> members</li>
          <li>{inst.pca_tier}</li>
        </ul>
        {!inst.active && (
          <p className="inline-note warn" style={{ marginTop: 12 }}>
            Last filing {quarter(inst.latest_quarter)}. This credit union has not filed since, most often because it merged or
            liquidated; figures are historical.
          </p>
        )}
      </div>
      <div className="actions">
        <a className="button" href={href(inst.cu_number, 'report')}>
          <FileText size={14} strokeWidth={2} /> One-page report
        </a>
      </div>
      <nav className="tabs" aria-label="Sections" style={{ gridColumn: '1 / -1' }}>
        {SECTIONS.map((s) => (
          <a key={s.id} href={href(inst.cu_number, s.id)} aria-current={s.id === section ? 'page' : undefined}>
            {s.label}
          </a>
        ))}
      </nav>
    </div>
  )
}

function sinceText(iso) {
  if (!iso) return 'not yet'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 90) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  return hrs < 36 ? `${hrs} h ago` : `${Math.round(hrs / 24)} days ago`
}

/** Polls the API for a newer NCUA quarter than the one on screen. */
function useNewQuarter(loadedQuarter) {
  const [status, setStatus] = useState(null)
  useEffect(() => {
    if (!loadedQuarter) return undefined
    const poll = () =>
      api
        .meta()
        .then((m) => setStatus({ quarter: m.latest_quarter, updates: m.updates }))
        .catch(() => {})
    const t = setInterval(poll, 30 * 60 * 1000)
    return () => clearInterval(t)
  }, [loadedQuarter])
  return status && status.quarter !== loadedQuarter ? status : null
}

function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading credit union">
      <div className="masthead">
        <div>
          <Skeleton height={32} width={420} />
          <Skeleton height={14} width={560} style={{ marginTop: 12 }} />
        </div>
      </div>
      <Skeleton height={1} style={{ marginTop: 60 }} />
      <div className="grid">
        <div className="span-8"><Skeleton height={340} /></div>
        <div className="span-4"><Skeleton height={340} /></div>
      </div>
    </div>
  )
}

export default function App() {
  const route = useRoute()
  const meta = useResource('meta', (s) => api.meta(s))
  const cu = route.cu
  const inst = useResource(cu && `inst:${cu}`, (s) => api.institution(cu, s))
  const peers = useResource(cu && `peers:${cu}`, (s) => api.peers(cu, s))
  const fc = useResource(cu && `fc:${cu}`, (s) => api.forecast(cu, s))

  useEffect(() => {
    document.title = cu && inst.data ? `${inst.data.name} · CU Pulse` : 'CU Pulse · Credit union financial health'
  }, [cu, inst.data])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [cu, route.section])

  const fresh = useNewQuarter(meta.data?.latest_quarter)
  const updates = meta.data?.updates

  const reload = (keys) => () => {
    keys.forEach(retry)
    window.location.reload()
  }

  const section = route.section
  const shared = { inst: inst.data, peers: peers.data, fc: fc.data, fcState: fc, meta: meta.data }

  let body
  if (meta.error) {
    body = <ErrorNotice title="CU Pulse could not reach its data" error={meta.error} onRetry={reload(['meta'])} />
  } else if (!cu) {
    body = meta.data ? <Home meta={meta.data} /> : <Loading />
  } else if (inst.error) {
    body = <ErrorNotice title={inst.error.status === 404 ? 'Credit union not found' : 'This credit union could not load'} error={inst.error} onRetry={inst.error.status === 404 ? undefined : reload([`inst:${cu}`])} />
  } else if (!meta.data || !inst.data) {
    body = <Loading />
  } else if (section === 'report') {
    body = <Report {...shared} />
  } else {
    const needsPeers = ['overview', 'trends', 'peers'].includes(section)
    let view
    if (needsPeers && peers.error) view = <ErrorNotice error={peers.error} onRetry={reload([`peers:${cu}`])} />
    else if (section === 'forecast' && fc.error) view = <ErrorNotice title="The forecast could not be produced" error={fc.error} onRetry={reload([`fc:${cu}`])} />
    else if (section === 'overview') view = <Overview {...shared} />
    else if (!peers.data && needsPeers) view = <div className="grid"><div className="span-12"><Skeleton height={420} /></div></div>
    else if (section === 'trends') view = <Trends {...shared} />
    else if (section === 'forecast') view = <Forecast {...shared} />
    else if (section === 'peers') view = <Peers {...shared} />
    else if (section === 'stress') view = fc.data || fc.error ? <Stress {...shared} /> : <div className="grid"><div className="span-12"><Skeleton height={420} /></div></div>
    else view = <Method {...shared} />
    body = (
      <>
        <Masthead inst={inst.data} section={section} />
        {section === 'overview' && <Vitals inst={inst.data} peers={peers.data} meta={meta.data} />}
        <main>{view}</main>
      </>
    )
  }

  return (
    <>
      <header className="bar">
        <div className="bar-inner">
          <Wordmark />
          {cu ? <Search section={section} /> : <span className="bar-spacer" />}
          {meta.data && (
            <div className="bar-meta">
              <span title={updates?.enabled ? `CU Pulse checks ncua.gov every ${updates.interval_hours} h for new and amended quarters.${updates.error ? ` Last check failed: ${updates.error}` : ''}` : 'Automatic NCUA checks are off.'}>
                Latest filing <strong>{quarter(meta.data.latest_quarter)}</strong>
                {updates?.enabled && ` · NCUA checked ${sinceText(updates.checked_at)}`}
              </span>
              <span className="optional"><strong>{count(meta.data.active_count)}</strong> credit unions · {usd(meta.data.industry_assets)}</span>
              <span className="optional">Source <strong>NCUA 5300</strong></span>
            </div>
          )}
        </div>
      </header>
      {fresh && (
        <div className="update-banner no-print" role="status">
          <div className="inner">
            <span>NCUA has published {quarter(fresh.quarter)} Call Report data. The figures on screen are from {quarter(meta.data.latest_quarter)}.</span>
            <button type="button" onClick={() => window.location.reload()}>Load {quarter(fresh.quarter)}</button>
          </div>
        </div>
      )}
      <div className="page">{body}</div>
      {section !== 'report' && (
        <footer className="footer">
          <span>CU Pulse · analysis of public NCUA Call Report data. Not affiliated with NCUA or any credit union.</span>
          {meta.data && <span>Data {quarter(meta.data.first_quarter)}–{quarter(meta.data.latest_quarter)}</span>}
        </footer>
      )}
    </>
  )
}
