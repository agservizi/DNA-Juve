import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  Clock3,
  Eye,
  KeyRound,
  Loader2,
  Mail,
  Search,
  Shield,
  Trash2,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  deleteAdminAuthor,
  inviteAdminAuthor,
  getAdminAuthors,
  getLegacyAdminAuthors,
  resendAdminAuthorInvite,
  sendAdminAuthorReset,
  updateAdminAuthorRole,
} from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { usePersistentAdminState } from '@/hooks/usePersistentAdminState'
import { useToast } from '@/hooks/useToast'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'

const ROLE_OPTIONS = [
  { value: 'author', label: 'Author' },
  { value: 'admin', label: 'Admin' },
]

const FILTERS = [
  { id: 'all', label: 'Tutti' },
  { id: 'active', label: 'Attivi' },
  { id: 'invited', label: 'Inviti pendenti' },
  { id: 'admin', label: 'Admin' },
  { id: 'author', label: 'Author' },
]

const PAGE_SIZE = 10
const PRIMARY_ADMIN_EMAIL = 'admin@bianconerihub.com'

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatRelativeWindow(value) {
  if (!value) return 'Nessun accesso'
  const diffMs = Date.now() - new Date(value).getTime()
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  if (diffDays === 0) return 'Oggi'
  if (diffDays === 1) return 'Ieri'
  if (diffDays < 30) return `${diffDays} giorni fa`
  const diffMonths = Math.floor(diffDays / 30)
  return diffMonths <= 1 ? '1 mese fa' : `${diffMonths} mesi fa`
}

function statusBadge(status) {
  if (status === 'active') return 'bg-green-50 text-green-700 border-green-200'
  if (status === 'invited') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (status === 'suspended') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-gray-50 text-gray-600 border-gray-200'
}

function statusLabel(status) {
  if (status === 'active') return 'Attivo'
  if (status === 'invited') return 'Invito inviato'
  if (status === 'suspended') return 'Sospeso'
  return 'Non disponibile'
}

function roleBadge(role) {
  return role === 'admin'
    ? 'bg-juve-black text-white'
    : 'bg-white text-juve-black border border-gray-200'
}

function roleLabel(role) {
  return role === 'admin' ? 'Admin' : 'Author'
}

function isProtectedAdmin(author) {
  return author?.role === 'admin' && String(author?.email || '').toLowerCase() === PRIMARY_ADMIN_EMAIL
}

function accountAccessMeta(author) {
  if (author.status === 'invited') {
    return {
      title: 'Invito inviato',
      detail: `Conferma mail in attesa${author.invited_at ? ` · ${formatDate(author.invited_at)}` : ''}`,
      tone: 'text-amber-700',
    }
  }

  if (!author.email_confirmed_at) {
    return {
      title: 'Email da confermare',
      detail: 'L’account non ha ancora completato la conferma email.',
      tone: 'text-amber-700',
    }
  }

  if (!author.last_sign_in_at) {
    return {
      title: 'Mai entrato',
      detail: 'Email confermata, ma nessun login registrato.',
      tone: 'text-gray-700',
    }
  }

  return {
    title: formatRelativeWindow(author.last_sign_in_at),
    detail: `Email confermata · ${formatDate(author.last_sign_in_at)}`,
    tone: 'text-juve-black',
  }
}

function normalizeLegacyEntry(profile) {
  const authored = Array.isArray(profile.articles) ? profile.articles : []
  const published = authored.filter((article) => article.status === 'published')
  const drafts = authored.filter((article) => article.status === 'draft')
  const latestArticle = [...authored].sort((a, b) => {
    const aDate = new Date(a.updated_at || a.published_at || a.created_at || 0).getTime()
    const bDate = new Date(b.updated_at || b.published_at || b.created_at || 0).getTime()
    return bDate - aDate
  })[0] || null
  const recentWindow = Date.now() - (30 * 24 * 60 * 60 * 1000)
  const publishedThisMonth = published.filter((article) => {
    const stamp = article.published_at || article.updated_at || article.created_at
    return stamp ? new Date(stamp).getTime() >= recentWindow : false
  }).length

  return {
    id: profile.id,
    email: profile.email || null,
    username: profile.username || 'Redattore',
    avatar_url: profile.avatar_url || null,
    bio: profile.bio || '',
    role: ['admin', 'author', 'editor'].includes(profile.role) ? (profile.role === 'editor' ? 'author' : profile.role) : 'author',
    status: 'active',
    invited_at: null,
    created_at: profile.created_at || null,
    updated_at: profile.updated_at || null,
    last_sign_in_at: null,
    email_confirmed_at: null,
    articles_total: authored.length,
    published_total: published.length,
    drafts_total: drafts.length,
    published_last_30_days: publishedThisMonth,
    latest_article: latestArticle
      ? {
          id: latestArticle.id,
          title: latestArticle.title,
          slug: latestArticle.slug,
          status: latestArticle.status,
          at: latestArticle.published_at || latestArticle.updated_at || latestArticle.created_at,
        }
      : null,
  }
}

export default function Authors() {
  const { loading: authLoading, profile: authProfile } = useAuth()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filter, setFilter] = usePersistentAdminState('authors-filter', 'all')
  const [query, setQuery] = usePersistentAdminState('authors-query', '')
  const [pendingPage, setPendingPage] = usePersistentAdminState('authors-pending-page', 1)
  const [activePage, setActivePage] = usePersistentAdminState('authors-active-page', 1)
  const [inviteForm, setInviteForm, clearInviteForm] = usePersistentAdminState('authors-invite-form', { email: '', role: 'author' })
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: payload, isLoading } = useQuery({
    queryKey: ['authors-admin'],
    enabled: !authLoading && authProfile?.role === 'admin',
    queryFn: async () => {
      const [{ data, error }, { data: legacyData, error: legacyError }] = await Promise.all([
        getAdminAuthors(),
        getLegacyAdminAuthors(),
      ])

      if (error && legacyError) throw error

      const remoteEntries = data?.entries || []
      const remoteSummary = data?.summary || null
      const legacyEntries = (legacyData || [])
        .map(normalizeLegacyEntry)
        .filter((entry) => entry.role === 'admin' || entry.role === 'author' || entry.role === 'editor' || entry.articles_total > 0)

      const mergedEntries = [...remoteEntries]
      const seenIds = new Set(remoteEntries.map((entry) => entry.id))
      for (const entry of legacyEntries) {
        if (!seenIds.has(entry.id)) {
          mergedEntries.push(entry)
          seenIds.add(entry.id)
        }
      }

      mergedEntries.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1
        if (a.role !== 'admin' && b.role === 'admin') return 1
        const aDate = new Date(a.last_sign_in_at || a.updated_at || a.created_at || 0).getTime()
        const bDate = new Date(b.last_sign_in_at || b.updated_at || b.created_at || 0).getTime()
        return bDate - aDate
      })

      return {
        entries: mergedEntries,
        summary: {
          total: mergedEntries.length,
          admins: mergedEntries.filter((entry) => entry.role === 'admin').length,
          authors: mergedEntries.filter((entry) => entry.role === 'author').length,
          invited: remoteSummary?.invited ?? mergedEntries.filter((entry) => entry.status === 'invited').length,
          active: mergedEntries.filter((entry) => entry.status === 'active').length,
          publishedLast30Days: mergedEntries.reduce((sum, entry) => sum + entry.published_last_30_days, 0),
        },
      }
    },
  })

  const authors = payload?.entries || []
  const summary = payload?.summary || {
    total: 0,
    admins: 0,
    authors: 0,
    invited: 0,
    active: 0,
    publishedLast30Days: 0,
  }

  const filteredAuthors = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return authors.filter((author) => {
      const matchesFilter = filter === 'all'
        || author.status === filter
        || author.role === filter

      if (!matchesFilter) return false
      if (!needle) return true

      return [
        author.username,
        author.email,
        author.bio,
        author.latest_article?.title,
      ].some((value) => String(value || '').toLowerCase().includes(needle))
    })
  }, [authors, filter, query])

  useEffect(() => {
    setPendingPage(1)
    setActivePage(1)
  }, [filter, query, authors.length])

  const pendingInvites = filteredAuthors.filter((author) => author.status === 'invited')
  const activeAuthors = filteredAuthors.filter((author) => author.status !== 'invited')
  const pendingTotalPages = Math.max(1, Math.ceil(pendingInvites.length / PAGE_SIZE))
  const activeTotalPages = Math.max(1, Math.ceil(activeAuthors.length / PAGE_SIZE))
  const visiblePendingInvites = pendingInvites.slice((pendingPage - 1) * PAGE_SIZE, pendingPage * PAGE_SIZE)
  const visibleActiveAuthors = activeAuthors.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE)

  const reloadAuthors = () => qc.invalidateQueries({ queryKey: ['authors-admin'] })

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { email, role } = inviteForm
      const { data, error } = await inviteAdminAuthor({ email, role })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast({
        title: 'Invito inviato',
        description: `Invito ${inviteForm.role === 'admin' ? 'admin' : 'author'} inviato a ${inviteForm.email}`,
        variant: 'success',
      })
      setInviteForm({ email: '', role: 'author' })
      clearInviteForm()
      setInviteOpen(false)
      reloadAuthors()
    },
    onError: (err) => toast({
      title: 'Errore invito',
      description: err.message || 'Impossibile inviare l’invito.',
      variant: 'destructive',
    }),
  })

  const roleMutation = useMutation({
    mutationFn: updateAdminAuthorRole,
    onSuccess: () => {
      toast({ title: 'Ruolo aggiornato', variant: 'success' })
      reloadAuthors()
    },
    onError: (err) => toast({
      title: 'Errore ruolo',
      description: err.message || 'Impossibile aggiornare il ruolo.',
      variant: 'destructive',
    }),
  })

  const resendMutation = useMutation({
    mutationFn: resendAdminAuthorInvite,
    onSuccess: (_, variables) => {
      toast({
        title: 'Invito reinviato',
        description: `Nuova email inviata a ${variables.email}`,
        variant: 'success',
      })
      reloadAuthors()
    },
    onError: (err) => toast({
      title: 'Errore reinvio',
      description: err.message || 'Impossibile reinviare l’invito.',
      variant: 'destructive',
    }),
  })

  const resetMutation = useMutation({
    mutationFn: sendAdminAuthorReset,
    onSuccess: (_, variables) => {
      toast({
        title: 'Reset password inviato',
        description: `Email di recupero spedita a ${variables.email}`,
        variant: 'success',
      })
    },
    onError: (err) => toast({
      title: 'Errore reset',
      description: err.message || 'Impossibile inviare la mail di reset.',
      variant: 'destructive',
    }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId) => {
      const { data, error } = await deleteAdminAuthor({ userId })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast({ title: 'Redattore rimosso', variant: 'success' })
      setDeleteTarget(null)
      reloadAuthors()
    },
    onError: (err) => toast({
      title: 'Errore rimozione',
      description: err.message || 'Impossibile rimuovere il redattore.',
      variant: 'destructive',
    }),
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-juve-black">Redattori</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Gestisci ruoli, inviti, ultimi accessi e produttività della redazione da un’unica vista.
          </p>
        </div>

        <button
          onClick={() => setInviteOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2 bg-juve-gold px-5 py-2.5 text-sm font-black uppercase tracking-wider text-black transition-colors hover:bg-juve-gold-dark sm:w-auto"
        >
          <UserPlus className="h-4 w-4" />
          Invita redattore
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Redazione totale', value: summary.total, sub: `${summary.admins} admin · ${summary.authors} author`, icon: Users },
          { label: 'Attivi', value: summary.active, sub: 'Hanno effettuato almeno un accesso', icon: Shield },
          { label: 'Inviti pendenti', value: summary.invited, sub: 'Da completare', icon: Mail },
          { label: 'Articoli 30 giorni', value: summary.publishedLast30Days, sub: 'Produzione recente', icon: Clock3 },
          { label: 'Ricerca attuale', value: filteredAuthors.length, sub: filter === 'all' ? 'Vista completa' : `Filtro ${filter}`, icon: Search },
        ].map((card) => (
          <div key={card.label} className="border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">{card.label}</p>
                <p className="mt-3 font-display text-3xl font-black text-juve-black">{card.value}</p>
                <p className="mt-1 text-xs text-gray-500">{card.sub}</p>
              </div>
              <card.icon className="h-5 w-5 text-juve-gold" />
            </div>
          </div>
        ))}
      </div>

      <div className="border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca per nome, mail, bio o ultimo articolo"
              className="w-full border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-juve-black focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`px-3 py-2 text-xs font-black uppercase tracking-[0.18em] transition-colors ${
                  filter === item.id
                    ? 'bg-juve-black text-white'
                    : 'border border-gray-200 text-gray-500 hover:border-juve-gold hover:text-juve-black'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-juve-gold" />
        </div>
      ) : (
        <div className="space-y-8">
          <section className="border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-juve-gold">Inviti e onboarding</p>
              <h2 className="mt-2 font-display text-xl font-black text-juve-black">Inviti in sospeso</h2>
            </div>

            {pendingInvites.length === 0 ? (
              <div className="px-4 py-10 text-sm text-gray-500 sm:px-6">
                Nessun invito pendente nella vista corrente.
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-100">
                  {visiblePendingInvites.map((author) => (
                    <div key={author.id} className="flex flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center sm:px-6">
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <AuthorAvatar author={author} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-juve-black">{author.username}</p>
                            <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusBadge(author.status)}`}>
                              {statusLabel(author.status)}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm text-gray-500">{author.email || 'Email non disponibile'}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            Invitato il {formatDate(author.invited_at || author.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                        <RoleSelect
                          value={author.role}
                          disabled={roleMutation.isPending}
                          onChange={(role) => roleMutation.mutate({ userId: author.id, role })}
                        />
                        <button
                          onClick={() => resendMutation.mutate({ email: author.email, role: author.role })}
                          disabled={resendMutation.isPending || !author.email}
                          className="inline-flex items-center gap-2 border border-gray-300 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 transition-colors hover:border-juve-gold hover:text-juve-black disabled:opacity-50"
                        >
                          {resendMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                          Reinvia invito
                        </button>
                        <button
                          onClick={() => setDetailTarget(author)}
                          className="inline-flex items-center gap-2 border border-gray-300 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 transition-colors hover:border-juve-gold hover:text-juve-black"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Dettaglio
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <PaginationFooter
                  page={pendingPage}
                  totalPages={pendingTotalPages}
                  totalItems={pendingInvites.length}
                  onPageChange={setPendingPage}
                />
              </>
            )}
          </section>

          <section className="border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-juve-gold">Team attivo</p>
              <h2 className="mt-2 font-display text-xl font-black text-juve-black">Redazione operativa</h2>
            </div>

            {activeAuthors.length === 0 ? (
              <div className="px-4 py-14 text-center text-gray-400 sm:px-6">
                <Users className="mx-auto mb-3 h-10 w-10 opacity-30" />
                <p className="font-display text-lg">Nessun redattore in questa vista</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 px-4 py-4 lg:hidden sm:px-6">
                  {visibleActiveAuthors.map((author, index) => {
                    const access = accountAccessMeta(author)

                    return (
                      <motion.div
                        key={author.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="flex items-start gap-4">
                          <AuthorAvatar author={author} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-bold text-juve-black">{author.username}</p>
                              <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${roleBadge(author.role)}`}>
                                {roleLabel(author.role)}
                              </span>
                              <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusBadge(author.status)}`}>
                                {statusLabel(author.status)}
                              </span>
                            </div>
                            <p className="mt-1 break-all text-sm text-gray-500">{author.email || 'Email non disponibile'}</p>
                            <p className="mt-2 text-xs text-gray-500">{author.bio || 'Nessuna bio redazionale impostata.'}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="border border-gray-200 bg-white p-3">
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Pubblicati</p>
                            <p className="mt-2 font-display text-2xl font-black text-juve-black">{author.published_total}</p>
                            <p className="mt-1 text-xs text-gray-400">{author.drafts_total} bozze</p>
                          </div>
                          <div className="border border-gray-200 bg-white p-3">
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Accesso</p>
                            <p className={`mt-2 text-sm font-semibold ${access.tone}`}>{access.title}</p>
                            <p className="mt-1 text-xs text-gray-400">{access.detail}</p>
                          </div>
                        </div>

                        {author.latest_article && (
                          <a
                            href={`/articolo/${author.latest_article.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-juve-black transition-colors hover:text-juve-gold"
                          >
                            Ultimo pezzo: {author.latest_article.title}
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        )}

                        <div className="mt-4 space-y-3">
                          <RoleSelect
                            value={author.role}
                            disabled={roleMutation.isPending || isProtectedAdmin(author)}
                            onChange={(role) => roleMutation.mutate({ userId: author.id, role })}
                          />

                          {isProtectedAdmin(author) && (
                            <p className="text-[11px] text-gray-400">Ruolo protetto per l’account admin principale.</p>
                          )}

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <button
                              onClick={() => setDetailTarget(author)}
                              className="inline-flex items-center justify-center gap-2 border border-gray-300 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 transition-colors hover:border-juve-gold hover:text-juve-black"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Profilo
                            </button>
                            <button
                              onClick={() => resetMutation.mutate({ email: author.email })}
                              disabled={resetMutation.isPending || !author.email}
                              className="inline-flex items-center justify-center gap-2 border border-gray-300 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 transition-colors hover:border-juve-gold hover:text-juve-black disabled:opacity-50"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                              Reset password
                            </button>
                            <button
                              onClick={() => setDeleteTarget(author)}
                              disabled={isProtectedAdmin(author)}
                              className="inline-flex items-center justify-center gap-2 border border-red-200 px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Rimuovi
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                <div className="hidden overflow-x-auto lg:block">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-[1.9fr_0.9fr_1fr_0.8fr_0.9fr_1.4fr] gap-4 border-b border-gray-100 px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
                      <span>Profilo</span>
                      <span>Ruolo</span>
                      <span>Stato</span>
                      <span>Produzione</span>
                      <span>Accesso account</span>
                      <span>Azioni</span>
                    </div>

                    <AnimatePresence initial={false}>
                      {visibleActiveAuthors.map((author, index) => (
                        <motion.div
                          key={author.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="grid grid-cols-[1.9fr_0.9fr_1fr_0.8fr_0.9fr_1.4fr] gap-4 border-b border-gray-100 px-6 py-5 last:border-b-0 hover:bg-gray-50"
                        >
                          <div className="min-w-0">
                            <div className="flex items-start gap-4">
                              <AuthorAvatar author={author} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="truncate font-bold text-juve-black">{author.username}</p>
                                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${roleBadge(author.role)}`}>
                                    {roleLabel(author.role)}
                                  </span>
                                </div>
                                <p className="mt-1 truncate text-sm text-gray-500">{author.email || 'Email non disponibile'}</p>
                                <p className="mt-2 line-clamp-2 text-xs text-gray-500">
                                  {author.bio || 'Nessuna bio redazionale impostata.'}
                                </p>
                                {author.latest_article && (
                                  <a
                                    href={`/articolo/${author.latest_article.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-juve-black transition-colors hover:text-juve-gold"
                                  >
                                    Ultimo pezzo: {author.latest_article.title}
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <RoleSelect
                              value={author.role}
                              disabled={roleMutation.isPending || isProtectedAdmin(author)}
                              onChange={(role) => roleMutation.mutate({ userId: author.id, role })}
                            />
                            {isProtectedAdmin(author) && (
                              <p className="mt-2 text-[11px] text-gray-400">Ruolo protetto per l’account admin principale.</p>
                            )}
                          </div>

                          <div>
                            <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusBadge(author.status)}`}>
                              {statusLabel(author.status)}
                            </span>
                            <p className="mt-2 text-xs text-gray-500">
                              Creato il {formatDate(author.created_at)}
                            </p>
                          </div>

                          <div>
                            <p className="font-display text-2xl font-black text-juve-black">{author.published_total}</p>
                            <p className="text-xs text-gray-500">pubblicati</p>
                            <p className="mt-2 text-xs text-gray-400">{author.drafts_total} bozze · {author.published_last_30_days} negli ultimi 30 giorni</p>
                          </div>

                          <div>
                            {(() => {
                              const access = accountAccessMeta(author)
                              return (
                                <>
                                  <p className={`text-sm font-semibold ${access.tone}`}>{access.title}</p>
                                  <p className="mt-1 text-xs text-gray-500">{access.detail}</p>
                                </>
                              )
                            })()}
                          </div>

                          <div className="flex flex-wrap items-start gap-2">
                            <button
                              onClick={() => setDetailTarget(author)}
                              className="inline-flex items-center gap-2 border border-gray-300 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 transition-colors hover:border-juve-gold hover:text-juve-black"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Profilo
                            </button>
                            <button
                              onClick={() => resetMutation.mutate({ email: author.email })}
                              disabled={resetMutation.isPending || !author.email}
                              className="inline-flex items-center gap-2 border border-gray-300 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 transition-colors hover:border-juve-gold hover:text-juve-black disabled:opacity-50"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                              Reset password
                            </button>
                            <button
                              onClick={() => setDeleteTarget(author)}
                              disabled={isProtectedAdmin(author)}
                              className="inline-flex items-center gap-2 border border-red-200 px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Rimuovi
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                <PaginationFooter
                  page={activePage}
                  totalPages={activeTotalPages}
                  totalItems={activeAuthors.length}
                  onPageChange={setActivePage}
                />
              </>
            )}
          </section>
        </div>
      )}

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)}>
        <DialogHeader onClose={() => setInviteOpen(false)}>
          <DialogTitle>Invita un nuovo membro della redazione</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={inviteForm.email}
                onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="redazione@bianconerihub.com"
                className="w-full border border-gray-300 py-2 pl-9 pr-4 text-sm focus:border-juve-black focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Ruolo iniziale</label>
            <RoleSelect
              value={inviteForm.role}
              disabled={inviteMutation.isPending}
              onChange={(role) => setInviteForm((prev) => ({ ...prev, role }))}
            />
          </div>

          <div className="border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
            L’invito crea l’utente in Supabase Auth e prepara il profilo editoriale con il ruolo scelto.
          </div>
        </DialogContent>
        <DialogFooter>
          <button onClick={() => setInviteOpen(false)} className="border border-gray-300 px-4 py-2 text-sm">
            Annulla
          </button>
          <button
            onClick={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending || !inviteForm.email.trim()}
            className="inline-flex items-center gap-2 bg-juve-gold px-5 py-2 text-sm font-black text-black disabled:opacity-60"
          >
            {inviteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Invia invito
          </button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!detailTarget} onClose={() => setDetailTarget(null)}>
        <DialogHeader onClose={() => setDetailTarget(null)}>
          <DialogTitle>Scheda redattore</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-5">
          {detailTarget && (
            <>
              <div className="flex items-start gap-4">
                <AuthorAvatar author={detailTarget} large />
                <div className="min-w-0">
                  <p className="font-display text-2xl font-black text-juve-black">{detailTarget.username}</p>
                  <p className="mt-1 text-sm text-gray-500">{detailTarget.email || 'Email non disponibile'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${roleBadge(detailTarget.role)}`}>
                      {roleLabel(detailTarget.role)}
                    </span>
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusBadge(detailTarget.status)}`}>
                      {statusLabel(detailTarget.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="Articoli totali" value={detailTarget.articles_total} />
                <StatCard label="Pubblicati" value={detailTarget.published_total} />
                <StatCard label="Bozze" value={detailTarget.drafts_total} />
                <StatCard label="Ultimi 30 giorni" value={detailTarget.published_last_30_days} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InfoBlock label="Accesso account" value={detailTarget.last_sign_in_at ? `Ultimo login ${formatDate(detailTarget.last_sign_in_at)}` : 'Mai entrato'} />
                <InfoBlock label="Email" value={detailTarget.email_confirmed_at ? 'Confermata' : 'Da confermare'} />
                <InfoBlock label="Invito / creazione" value={formatDate(detailTarget.invited_at || detailTarget.created_at)} />
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">Bio redazionale</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {detailTarget.bio || 'Questo profilo non ha ancora una bio redazionale.'}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">Ultimo contenuto</p>
                {detailTarget.latest_article ? (
                  <a
                    href={`/articolo/${detailTarget.latest_article.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-juve-black transition-colors hover:text-juve-gold"
                  >
                    {detailTarget.latest_article.title}
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">Nessun articolo ancora associato a questo profilo.</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
        <DialogFooter>
          <button onClick={() => setDetailTarget(null)} className="border border-gray-300 px-4 py-2 text-sm">
            Chiudi
          </button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogHeader onClose={() => setDeleteTarget(null)}>
          <DialogTitle>Rimuovi redattore</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm leading-relaxed text-gray-600">
            Stai per rimuovere <strong>{deleteTarget?.username}</strong> dalla redazione. Gli articoli già pubblicati
            resteranno visibili sul magazine, ma l’account verrà eliminato da autenticazione e profilo.
          </p>
        </DialogContent>
        <DialogFooter>
          <button onClick={() => setDeleteTarget(null)} className="border border-gray-300 px-4 py-2 text-sm">
            Annulla
          </button>
          <button
            onClick={() => deleteMutation.mutate(deleteTarget.id)}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-2 bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Rimuovi
          </button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

function AuthorAvatar({ author, large = false }) {
  const size = large ? 'h-16 w-16' : 'h-12 w-12'

  return (
    <div className={`${size} shrink-0 overflow-hidden bg-juve-gold`}>
      {author.avatar_url ? (
        <img src={author.avatar_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-bold text-black">
          {author.username?.[0]?.toUpperCase() || 'R'}
        </span>
      )}
    </div>
  )
}

function RoleSelect({ value, onChange, disabled }) {
  return (
    <label className="inline-flex items-center gap-2 border border-gray-300 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-600">
      <UserCog className="h-3.5 w-3.5 text-gray-400" />
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-xs font-bold uppercase tracking-wider text-gray-700 focus:outline-none disabled:opacity-50"
      >
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="border border-gray-200 bg-gray-50 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">{label}</p>
      <p className="mt-2 font-display text-2xl font-black text-juve-black">{value}</p>
    </div>
  )
}

function InfoBlock({ label, value }) {
  return (
    <div className="border border-gray-200 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-juve-black">{value}</p>
    </div>
  )
}

function PaginationFooter({ page, totalPages, totalItems, onPageChange }) {
  if (totalItems <= PAGE_SIZE) return null

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
      <p>
        Pagina <span className="font-semibold text-juve-black">{page}</span> di{' '}
        <span className="font-semibold text-juve-black">{totalPages}</span> · {totalItems} elementi
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="border border-gray-300 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 transition-colors hover:border-juve-gold hover:text-juve-black disabled:opacity-40"
        >
          Precedente
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="border border-gray-300 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 transition-colors hover:border-juve-gold hover:text-juve-black disabled:opacity-40"
        >
          Successiva
        </button>
      </div>
    </div>
  )
}
