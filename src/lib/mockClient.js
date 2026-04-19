// ── Mock Supabase Client ────────────────────────────────────────────────────
// Mimics the @supabase/supabase-js client API using in-memory mock data.
// Used automatically when no real Supabase credentials are configured.

import * as seed from './mockData'

// ── Deep-clone seed data so mutations don't pollute the originals ────────────
const store = {
  categories:              structuredClone(seed.categories),
  profiles:                structuredClone(seed.profiles),
  articles:                structuredClone(seed.articles),
  tags:                    structuredClone(seed.tags),
  article_tags:            structuredClone(seed.article_tags),
  comments:                structuredClone(seed.comments),
  podcasts:                structuredClone(seed.podcasts),
  reader_states:           [],
  newsletter_subscribers:  structuredClone(seed.newsletter_subscribers),
}

// ── Tiny ID generator (no crypto needed for demo) ───────────────────────────
let _seq = 100
const mockId = () => `mock-${++_seq}`

// ── QueryBuilder ────────────────────────────────────────────────────────────
class MockQueryBuilder {
  constructor(table) {
    this._table = table
    this._filters = []
    this._orderCol = null
    this._orderAsc = true
    this._limitN = null
    this._rangeFrom = null
    this._rangeTo = null
    this._single = false
    this._countMode = false
    this._insertData = null
    this._updateData = null
    this._deleteMode = false
    this._upsertData = null
    this._upsertConflict = null
    this._hasSelect = false
  }

  select(cols, opts) {
    this._hasSelect = true
    if (opts?.count === 'exact') this._countMode = true
    return this
  }

  eq(col, val) {  this._filters.push({ t: 'eq', col, val }); return this }
  neq(col, val) { this._filters.push({ t: 'neq', col, val }); return this }
  in(col, values) { this._filters.push({ t: 'in', col, values }); return this }

  or(filter) {
    this._filters.push({ t: 'or', filter })
    return this
  }

  order(col, opts) {
    this._orderCol = col
    this._orderAsc = opts?.ascending ?? true
    return this
  }

  limit(n)        { this._limitN = n; return this }
  range(from, to) { this._rangeFrom = from; this._rangeTo = to; return this }
  single()        { this._single = true; return this }

  insert(rows) {
    this._insertData = Array.isArray(rows) ? rows : [rows]
    return this
  }

  update(data) {
    this._updateData = data
    return this
  }

  delete() {
    this._deleteMode = true
    return this
  }

  upsert(rows, opts) {
    this._upsertData = Array.isArray(rows) ? rows : [rows]
    this._upsertConflict = opts?.onConflict || 'id'
    return this
  }

  // Make the builder thenable so `await supabase.from(...).select(...)` works
  then(resolve, reject) {
    try {
      resolve(this._execute())
    } catch (err) {
      ;(reject || resolve)({ data: null, error: { message: err.message } })
    }
  }

  // ── Internal execution ──────────────────────────────────────────────────
  _execute() {
    const table = this._table

    // INSERT
    if (this._insertData) {
      const newRows = this._insertData.map(r => ({
        id: mockId(),
        created_at: new Date().toISOString(),
        ...r,
      }))
      if (!store[table]) store[table] = []
      store[table].push(...newRows)
      if (this._single) return { data: newRows[0], error: null }
      if (this._hasSelect) return { data: newRows, error: null }
      return { data: null, error: null }
    }

    // UPDATE
    if (this._updateData) {
      let rows = this._applyFilters([...(store[table] || [])])
      rows.forEach(row => {
        const src = store[table].find(r => r.id === row.id)
        if (src) Object.assign(src, this._updateData, { updated_at: new Date().toISOString() })
      })
      const updated = rows.map(r => store[table].find(s => s.id === r.id))
      if (this._single) return { data: updated[0] || null, error: updated[0] ? null : { message: 'Not found' } }
      return { data: updated, error: null }
    }

    // DELETE
    if (this._deleteMode) {
      const toRemove = new Set(this._applyFilters([...(store[table] || [])]).map(r => r.id ?? r.article_id + r.tag_id))
      store[table] = (store[table] || []).filter(r => {
        const key = r.id ?? (r.article_id + r.tag_id)
        return !toRemove.has(key)
      })
      return { data: null, error: null }
    }

    // UPSERT
    if (this._upsertData) {
      if (!store[table]) store[table] = []
      const key = this._upsertConflict
      this._upsertData.forEach(row => {
        const idx = store[table].findIndex(r => r[key] === row[key])
        if (idx >= 0) {
          Object.assign(store[table][idx], row)
        } else {
          store[table].push({ id: mockId(), created_at: new Date().toISOString(), ...row })
        }
      })
      if (this._hasSelect) {
        const results = this._upsertData.map(row =>
          store[table].find(r => r[key] === row[key]) || row
        )
        return { data: results, error: null }
      }
      return { data: null, error: null }
    }

    // SELECT
    let data = [...(store[table] || [])]
    data = this._applyFilters(data)

    if (this._orderCol) {
      data.sort((a, b) => {
        const va = a[this._orderCol] ?? ''
        const vb = b[this._orderCol] ?? ''
        if (va < vb) return this._orderAsc ? -1 : 1
        if (va > vb) return this._orderAsc ? 1 : -1
        return 0
      })
    }

    if (this._rangeFrom !== null) {
      data = data.slice(this._rangeFrom, (this._rangeTo ?? data.length) + 1)
    }

    if (this._limitN !== null) {
      data = data.slice(0, this._limitN)
    }

    if (this._single) {
      return {
        data: data[0] || null,
        error: data[0] ? null : { message: 'Not found', code: 'PGRST116' },
      }
    }

    const result = { data, error: null }
    if (this._countMode) result.count = data.length
    return result
  }

  _applyFilters(data) {
    return this._filters.reduce((acc, f) => {
      switch (f.t) {
        case 'eq':
          // Support dot-notation for joined columns (e.g. "categories.slug")
          if (f.col.includes('.')) {
            const [parent, child] = f.col.split('.')
            return acc.filter(r => r[parent]?.[child] === f.val)
          }
          return acc.filter(r => r[f.col] === f.val)

        case 'neq':
          return acc.filter(r => r[f.col] !== f.val)

        case 'in':
          return acc.filter(r => f.values.includes(r[f.col]))

        case 'or': {
          const parts = f.filter.split(',')
          return acc.filter(r =>
            parts.some(part => {
              const m = part.match(/(\w+)\.ilike\.%(.+)%/)
              if (m) return r[m[1]]?.toLowerCase().includes(m[2].toLowerCase())
              return false
            })
          )
        }

        default:
          return acc
      }
    }, data)
  }
}

// ── Auth state management ───────────────────────────────────────────────────
let _authUser = null
const _authListeners = new Set()

function _notifyAuth(event) {
  const session = _authUser ? { user: _authUser } : null
  _authListeners.forEach(cb => cb(event, session))
}

// ── Mock Supabase client ────────────────────────────────────────────────────
export function createMockClient() {
  console.log(
    '%c🟡 BianconeriHub — Modalità demo attiva (nessun Supabase configurato)',
    'color: #F5A623; font-weight: bold; font-size: 13px;'
  )

  return {
    from: (table) => new MockQueryBuilder(table),

    rpc: () => Promise.resolve({ data: null, error: null }),

    auth: {
      getSession: () =>
        Promise.resolve({
          data: {
            session: _authUser ? { user: _authUser } : null,
          },
        }),

      signInWithPassword: ({ email, password }) => {
        if (email === 'demo@bianconerihub.com' && password === 'demo') {
          _authUser = seed.demoUser
          _notifyAuth('SIGNED_IN')
          return Promise.resolve({
            data: { user: _authUser, session: { user: _authUser } },
            error: null,
          })
        }
        return Promise.resolve({
          data: { user: null, session: null },
          error: { message: 'Credenziali demo: demo@bianconerihub.com / demo' },
        })
      },

      signInWithOtp: ({ email, options }) => {
        const existingProfile = store.profiles.find(profile => profile.email === email)
        const userId = existingProfile?.id || mockId()
        const username = options?.data?.display_name || email.split('@')[0]

        _authUser = {
          id: userId,
          email,
          created_at: existingProfile?.created_at || new Date().toISOString(),
          user_metadata: options?.data || {},
        }

        if (!existingProfile) {
          store.profiles.push({
            id: userId,
            email,
            username,
            avatar_url: null,
            bio: null,
            role: options?.data?.role || 'author',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }

        _notifyAuth('SIGNED_IN')

        return Promise.resolve({
          data: {
            user: _authUser,
            session: { user: _authUser },
          },
          error: null,
        })
      },

      signOut: () => {
        _authUser = null
        _notifyAuth('SIGNED_OUT')
        return Promise.resolve({ error: null })
      },

      onAuthStateChange: (callback) => {
        _authListeners.add(callback)
        return {
          data: {
            subscription: {
              unsubscribe: () => _authListeners.delete(callback),
            },
          },
        }
      },
    },

    storage: {
      from: () => ({
        upload: (_path, _file) =>
          Promise.resolve({
            data: { path: `mock/${Date.now()}.jpg` },
            error: null,
          }),
        getPublicUrl: (path) => ({
          data: {
            publicUrl: `https://placehold.co/800x450/000000/F5A623?text=${encodeURIComponent(path)}`,
          },
        }),
      }),
    },
  }
}
