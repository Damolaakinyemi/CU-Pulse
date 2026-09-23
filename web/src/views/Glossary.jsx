import { NextStep } from '../components/Plain.jsx'
import { GLOSSARY, GLOSSARY_ORDER } from '../lib/glossary.js'
import { href } from '../lib/router.js'

export default function Glossary() {
  return (
    <article className="page-read">
      <header className="read-head">
        <h1>Glossary</h1>
        <p>
          Every term CU Pulse uses, in plain language: what it is, and why an analyst cares. You can also tap any
          dotted-underlined word in the app for the same explanation.
        </p>
      </header>
      <div className="grid">
        <dl className="span-8 glossary">
          {GLOSSARY_ORDER.map((k) => {
            const g = GLOSSARY[k]
            return (
              <div key={k} id={`g-${k}`}>
                <dt>{g.term}</dt>
                <dd>
                  <p>{g.what}</p>
                  <p className="term-why">{g.why}</p>
                </dd>
              </div>
            )
          })}
        </dl>
        <aside className="span-4 prose">
          <h2>Where to start</h2>
          <p>
            Open <a href={href(5536)}>Navy Federal</a>, read “In plain terms” at the top, then try the{' '}
            <a href={href(5536, 'stress')}>Stress test</a>: drag the severity slider and watch capital move against the 7%
            line.
          </p>
          <p>
            For how each number is calculated, see the <a href={href(5536, 'method')}>Method</a> tab.
          </p>
        </aside>
      </div>
      <NextStep to="#/cu/5536" label="Put the terms to work on Navy Federal">
        Its dashboard opens with a plain-language summary.
      </NextStep>
    </article>
  )
}
