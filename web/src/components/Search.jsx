import { Search as SearchIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { api } from '../api.js'
import { usd } from '../lib/format.js'
import { go } from '../lib/router.js'

function Highlight({ text, needle }) {
  const i = needle ? text.toLowerCase().indexOf(needle.toLowerCase()) : -1
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + needle.length)}</mark>
      {text.slice(i + needle.length)}
    </>
  )
}

/** Institution combobox. ⌘K or / focuses it from anywhere. */
export default function Search({ section, variant }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [active, setActive] = useState(0)
  const [error, setError] = useState(null)
  const input = useRef(null)
  const listId = useId()

  useEffect(() => {
    const onKey = (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        input.current?.focus()
        input.current?.select()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      api
        .search(q.trim(), ctrl.signal)
        .then((r) => {
          setResults(r.results)
          setTotal(r.total)
          setActive(0)
          setError(null)
        })
        .catch((e) => e.name !== 'AbortError' && setError(e))
    }, 120)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [q, open])

  const choose = (r) => {
    if (!r) return
    go(r.cu_number, section === 'report' ? 'overview' : section)
    setQ('')
    setOpen(false)
    input.current?.blur()
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
      input.current?.blur()
    }
  }

  const expanded = open && (results.length > 0 || error || q.trim())

  return (
    <div className={`search ${variant ?? ''}`}>
      <label className="search-field">
        <SearchIcon size={variant === 'hero' ? 19 : 15} strokeWidth={2} aria-hidden="true" />
        <span className="visually-hidden">Find a credit union</span>
        <input
          ref={input}
          role="combobox"
          aria-expanded={Boolean(expanded)}
          aria-controls={listId}
          aria-activedescendant={expanded && results[active] ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          placeholder={variant === 'hero' ? 'Search by credit union name, city, state or charter number' : 'Credit union, city, state or charter'}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
        />
        <span className="kbd" aria-hidden="true">⌘K</span>
      </label>
      {expanded && (
        <ul className="search-list" id={listId} role="listbox" aria-label="Credit unions">
          {error && <li className="empty">{error.message}</li>}
          {!error && results.length === 0 && (
            <li className="empty">No active credit union matches “{q.trim()}”. Try a charter number or a shorter name.</li>
          )}
          {results.map((r, i) => (
            <li
              key={r.cu_number}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(r)
              }}
            >
              <span className="name">
                <Highlight text={r.name} needle={q.trim()} />
              </span>
              <span className="assets">{usd(r.total_assets)}</span>
              <span className="sub">
                {r.city}, {r.state} · Charter {r.cu_number}
              </span>
            </li>
          ))}
          {!error && total > results.length && (
            <li className="empty" aria-hidden="true">
              {total - results.length} more — keep typing to narrow
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
