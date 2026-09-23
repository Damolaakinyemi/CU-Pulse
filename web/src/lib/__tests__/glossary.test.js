import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GLOSSARY, GLOSSARY_ORDER } from '../glossary.js'

const SRC = join(__dirname, '..', '..')
const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? (d.name === '__tests__' ? [] : files(join(dir, d.name))) : [join(dir, d.name)]))

describe('glossary', () => {
  it('lists every entry exactly once on the glossary page', () => {
    expect([...GLOSSARY_ORDER].sort()).toEqual(Object.keys(GLOSSARY).sort())
  })

  it('has an entry for every <Term id> used in the app, plus the headline metrics', () => {
    const used = new Set(['net_worth_ratio', 'loan_growth_yoy', 'deposit_growth_yoy', 'delinquency_rate', 'roa'])
    for (const f of files(SRC).filter((p) => p.endsWith('.jsx'))) {
      for (const m of readFileSync(f, 'utf8').matchAll(/<Term id="([a-z0-9_]+)"/g)) used.add(m[1])
    }
    for (const id of used) expect(GLOSSARY[id], id).toBeDefined()
  })
})
