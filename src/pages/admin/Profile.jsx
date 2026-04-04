import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Camera,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Key,
  Loader2,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react'
import { supabase, uploadImage } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { formatDateShort, timeAgo } from '@/lib/utils'

async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

async function getAuthorActivity(userId) {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, slug, status, views, updated_at, published_at, created_at')
    .eq('author_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) throw error

  const articles = data || []
  const published = articles.filter(article => article.status === 'published')
  const drafts = articles.filter(article => article.status === 'draft')

  return {
    total: articles.length,
    published: published.length,
    drafts: drafts.length,
    totalViews: published.reduce((sum, article) => sum + (article.views || 0), 0),
    recent: articles.slice(0, 5),
  }
}

async function updateProfile(userId, data) {
  const { data: res, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return res
}

export default function Profile() {
  const { user } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()

  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [pwdForm, setPwdForm] = useState({ newPwd: '', confirm: '' })
  const [pwdLoading, setPwdLoading] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getProfile(user.id),
    enabled: !!user?.id,
  })

  const { data: activity, isLoading: loadingActivity } = useQuery({
    queryKey: ['author-activity', user?.id],
    queryFn: () => getAuthorActivity(user.id),
    enabled: !!user?.id,
  })

  useEffect(() => {
    if (!profile) return
    setUsername(profile.username || '')
    setBio(profile.bio || '')
    setAvatarUrl(profile.avatar_url || '')
  }, [profile])

  const updateMutation = useMutation({
    mutationFn: () => updateProfile(user.id, {
      username: username.trim() || 'Redazione',
      bio: bio.trim() || null,
      avatar_url: avatarUrl || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', user?.id] })
      toast({ title: 'Profilo aggiornato', description: 'Identita editoriale salvata.', variant: 'success' })
    },
    onError: (err) => {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' })
    },
  })

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const url = await uploadImage(file, `avatars/${user.id}-${Date.now()}`)
      setAvatarUrl(url)
      toast({ title: 'Avatar caricato', variant: 'success' })
    } catch {
      toast({ title: 'Errore upload avatar', description: 'Controlla formato e dimensione del file.', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()

    if (pwdForm.newPwd !== pwdForm.confirm) {
      toast({ title: 'Le password non coincidono', variant: 'destructive' })
      return
    }

    if (pwdForm.newPwd.length < 6) {
      toast({ title: 'Password troppo corta (min 6 caratteri)', variant: 'destructive' })
      return
    }

    setPwdLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwdForm.newPwd })
      if (error) throw error

      toast({ title: 'Password aggiornata', description: 'La nuova password e gia attiva.', variant: 'success' })
      setPwdForm({ newPwd: '', confirm: '' })
    } catch (err) {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' })
    } finally {
      setPwdLoading(false)
    }
  }

  const handleResetEmail = async () => {
    if (!user?.email) return

    setSendingReset(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/admin/login`,
      })
      if (error) throw error

      toast({
        title: 'Email inviata',
        description: `Link di reset spedito a ${user.email}.`,
        variant: 'success',
      })
    } catch (err) {
      toast({ title: 'Reset non riuscito', description: err.message, variant: 'destructive' })
    } finally {
      setSendingReset(false)
    }
  }

  const publicAuthorUrl = username ? `/autore/${encodeURIComponent(username)}` : null
  const accountCreatedAt = user?.created_at || profile?.created_at
  const emailConfirmed = Boolean(user?.email_confirmed_at || user?.confirmed_at)

  return (
    <div className="max-w-5xl space-y-6">
      <div className="mb-2">
        <h1 className="font-display text-2xl font-black">Il mio profilo</h1>
        <p className="text-sm text-gray-500 mt-1">
          Identita editoriale, sicurezza account e riepilogo attivita.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)] gap-6">
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-200 p-6"
          >
            <h2 className="font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
              <User className="h-4 w-4 text-juve-gold" />
              Identita editoriale
            </h2>

            <div className="flex flex-col gap-6 md:flex-row">
              <div className="shrink-0 relative">
                <div className="w-24 h-24 bg-juve-gold flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-11 w-11 text-black" />
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-juve-black text-white flex items-center justify-center cursor-pointer hover:bg-juve-gold transition-colors">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                </label>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Nome pubblico autore
                  </label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Il tuo nome firma"
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Questo nome viene usato come firma negli articoli e nella pagina autore.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Bio autore
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    placeholder="Racconta in breve chi sei e di cosa ti occupi in redazione."
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black resize-y"
                  />
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-500">
                    <span>Comparira nella pagina autore e aiuta a dare credibilita editoriale.</span>
                    <span>{bio.trim().length}/280</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Email account
                  </label>
                  <input
                    value={user?.email || ''}
                    disabled
                    className="w-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-gray-500">
                {publicAuthorUrl ? (
                  <Link to={publicAuthorUrl} className="inline-flex items-center gap-1.5 text-juve-gold hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Anteprima pagina autore
                  </Link>
                ) : (
                  'Imposta un nome pubblico per attivare la pagina autore.'
                )}
              </div>

              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || loadingProfile}
                className="flex items-center justify-center gap-2 px-5 py-2 bg-juve-gold text-black text-sm font-black uppercase tracking-wider hover:bg-juve-gold-dark disabled:opacity-60"
              >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Salva modifiche
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white border border-gray-200 p-6"
          >
            <h2 className="font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
              <Key className="h-4 w-4 text-juve-gold" />
              Sicurezza account
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              <div className="border border-gray-200 p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-500">Email confermata</p>
                <div className="mt-2 flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${emailConfirmed ? 'text-green-600' : 'text-amber-600'}`} />
                  <span className="text-sm font-bold">{emailConfirmed ? 'Si' : 'Da verificare'}</span>
                </div>
              </div>

              <div className="border border-gray-200 p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-500">Ultimo accesso</p>
                <p className="mt-2 text-sm font-bold">
                  {user?.last_sign_in_at ? timeAgo(user.last_sign_in_at) : 'Non disponibile'}
                </p>
                {user?.last_sign_in_at && (
                  <p className="text-xs text-gray-500 mt-1">{formatDateShort(user.last_sign_in_at)}</p>
                )}
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-3">
              {[
                { key: 'newPwd', label: 'Nuova password', placeholder: '••••••••' },
                { key: 'confirm', label: 'Conferma password', placeholder: '••••••••' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <input
                    type="password"
                    value={pwdForm[key]}
                    onChange={(e) => setPwdForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black"
                  />
                </div>
              ))}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleResetEmail}
                  disabled={sendingReset}
                  className="inline-flex items-center gap-2 text-sm text-juve-gold hover:underline disabled:opacity-60"
                >
                  {sendingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Invia email di reset password
                </button>

                <button
                  type="submit"
                  disabled={pwdLoading || !pwdForm.newPwd || !pwdForm.confirm}
                  className="flex items-center justify-center gap-2 px-5 py-2 bg-juve-black text-white text-sm font-bold hover:bg-juve-gray disabled:opacity-60"
                >
                  {pwdLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Aggiorna password
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-gray-200 p-6"
          >
            <h2 className="font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
              <FileText className="h-4 w-4 text-juve-gold" />
              Attivita editoriale
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-gray-200 p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-500">Articoli totali</p>
                <p className="mt-2 text-2xl font-black">{activity?.total ?? '—'}</p>
              </div>
              <div className="border border-gray-200 p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-500">Pubblicati</p>
                <p className="mt-2 text-2xl font-black">{activity?.published ?? '—'}</p>
              </div>
              <div className="border border-gray-200 p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-500">Bozze</p>
                <p className="mt-2 text-2xl font-black">{activity?.drafts ?? '—'}</p>
              </div>
              <div className="border border-gray-200 p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-500">Views cumulate</p>
                <p className="mt-2 text-2xl font-black">{activity?.totalViews ?? '—'}</p>
              </div>
            </div>

            {accountCreatedAt && (
              <p className="mt-4 text-xs text-gray-500">
                Account creato il {formatDateShort(accountCreatedAt)}.
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white border border-gray-200 p-6"
          >
            <h2 className="font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
              <FileText className="h-4 w-4 text-juve-gold" />
              Ultimi articoli toccati
            </h2>

            {loadingActivity ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Caricamento attivita…
              </div>
            ) : activity?.recent?.length ? (
              <div className="space-y-3">
                {activity.recent.map((article) => (
                  <Link
                    key={article.id}
                    to={`/admin/articoli/${article.id}/modifica`}
                    className="block border border-gray-200 p-4 hover:border-juve-gold hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-juve-black truncate">{article.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Aggiornato {article.updated_at ? timeAgo(article.updated_at) : 'di recente'}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 ${
                        article.status === 'published'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {article.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Non hai ancora articoli associati al tuo profilo.</p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
