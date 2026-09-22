import { useEffect, useState } from 'react'

async function get(path, params, signal) {
  const query = params ? `?${new URLSearchParams(params)}` : ''
  let res
  try {
    res = await fetch(`/api${path}${query}`, { signal })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    const error = new Error('The CU Pulse API is not reachable. Start it with: cd api && .venv/bin/uvicorn app.main:app')
    error.status = 0
    throw error
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const error = new Error(body.detail || `The API returned an error (${res.status}).`)
    error.status = res.status
    throw error
  }
  return res.json()
}

export const api = {
  meta: (signal) => get('/meta', undefined, signal),
  search: (q, signal) => get('/credit-unions', q ? { q, limit: 12 } : { limit: 12 }, signal),
  institution: (n, signal) => get(`/credit-unions/${n}`, undefined, signal),
  peers: (n, signal) => get(`/credit-unions/${n}/peers`, undefined, signal),
  forecast: (n, signal) => get(`/credit-unions/${n}/forecast`, undefined, signal),
}

const cache = new Map()

/** Fetch with a per-key cache; returns { data, error, loading }. */
export function useResource(key, loader) {
  const [state, setState] = useState(() => (cache.has(key) ? { data: cache.get(key), error: null, loading: false } : { data: null, error: null, loading: true }))

  useEffect(() => {
    if (key == null) return undefined
    if (cache.has(key)) {
      setState({ data: cache.get(key), error: null, loading: false })
      return undefined
    }
    const ctrl = new AbortController()
    setState({ data: null, error: null, loading: true })
    loader(ctrl.signal)
      .then((data) => {
        cache.set(key, data)
        setState({ data, error: null, loading: false })
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, error, loading: false })
      })
    return () => ctrl.abort()
    // loader is derived from key by callers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}

export function retry(key) {
  cache.delete(key)
}
