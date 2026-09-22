import { FileText } from 'lucide-react'
import { useEffect } from 'react'
import { api, retry, useResource } from './api.js'
import { ErrorNotice, Skeleton } from './components/Chrome.jsx'
import Search from './components/Search.jsx'
import Vitals from './components/Vitals.jsx'
import { latest } from './lib/analysis.js'
import { count, isNum, quarter, usd } from './lib/format.js'
import { SECTIONS, go, href, useRoute } from './lib/router.js'
import Forecast from './views/Forecast.jsx'
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
  const cu = route.cu ?? meta.data?.default_cu ?? null
  const inst = useResource(cu && `inst:${cu}`, (s) => api.institution(cu, s))
  const peers = useResource(cu && `peers:${cu}`, (s) => api.peers(cu, s))
  const fc = useResource(cu && `fc:${cu}`, (s) => api.forecast(cu, s))

  useEffect(() => {
    if (!route.cu && meta.data) go(meta.data.default_cu)
  }, [route.cu, meta.data])

  useEffect(() => {
    if (inst.data) document.title = `${inst.data.name} · CU Pulse`
  }, [inst.data])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [cu, route.section])

  const reload = (keys) => () => {
    keys.forEach(retry)
    window.location.reload()
  }

  const section = route.section
  const shared = { inst: inst.data, peers: peers.data, fc: fc.data, fcState: fc, meta: meta.data }

  let body
  if (meta.error) {
    body = <ErrorNotice title="CU Pulse could not reach its data" error={meta.error} onRetry={reload(['meta'])} />
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
          <Search section={section} />
          {meta.data && (
            <div className="bar-meta">
              <span>Latest filing <strong>{quarter(meta.data.latest_quarter)}</strong></span>
              <span className="optional"><strong>{count(meta.data.active_count)}</strong> credit unions · {usd(meta.data.industry_assets)}</span>
              <span className="optional">Source <strong>NCUA 5300</strong></span>
            </div>
          )}
        </div>
      </header>
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
