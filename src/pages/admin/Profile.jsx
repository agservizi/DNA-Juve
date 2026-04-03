import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { User, Camera, Key, Loader2, Check } from 'lucide-react'
import { supabase, uploadImage } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'

async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data
}

async function updateProfile(userId, data) {
  const { data: res, error } = await supabase.from('profiles').update(data).eq('id', userId).select().single()
  if (error) throw error
  return res
}

export default function Profile() {
  const { user } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [pwdForm, setPwdForm] = useState({ current: '', newPwd: '', confirm: '' })
  const [pwdLoading, setPwdLoading] = useState(false)

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getProfile(user.id),
    enabled: !!user?.id,
  })

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '')
      setAvatarUrl(profile.avatar_url || '')
    }
  }, [profile])

  const updateMutation = useMutation({
    mutationFn: () => updateProfile(user.id, { username, avatar_url: avatarUrl }),
    onSuccess: () => {
      qc.invalidateQueries(['profile', user?.id])
      toast({ title: 'Profilo aggiornato', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Errore', description: err.message, variant: 'destructive' }),
  })

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file, `avatars/${user.id}-${Date.now()}`)
      setAvatarUrl(url)
    } catch {
      toast({ title: 'Errore upload avatar', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (pwdForm.newPwd !== pwdForm.confirm) {
      toast({ title: 'Le password non coincidono', variant: 'destructive' }); return
    }
    if (pwdForm.newPwd.length < 6) {
      toast({ title: 'Password troppo corta (min 6 caratteri)', variant: 'destructive' }); return
    }
    setPwdLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwdForm.newPwd })
      if (error) throw error
      toast({ title: 'Password aggiornata', variant: 'success' })
      setPwdForm({ current: '', newPwd: '', confirm: '' })
    } catch (err) {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' })
    } finally {
      setPwdLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-black">Il mio profilo</h1>
        <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
      </div>

      <div className="space-y-6">
        {/* Avatar + username */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 p-6">
          <h2 className="font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
            <User className="h-4 w-4 text-juve-gold" /> Informazioni profilo
          </h2>

          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="shrink-0 relative">
              <div className="w-20 h-20 bg-juve-gold flex items-center justify-center overflow-hidden">
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  : <User className="h-10 w-10 text-black" />
                }
              </div>
              <label className="absolute -bottom-2 -right-2 w-7 h-7 bg-juve-black text-white flex items-center justify-center cursor-pointer hover:bg-juve-gold transition-colors">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Nome redattore</label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Il tuo nome"
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Email</label>
                <input value={user?.email || ''} disabled
                  className="w-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 cursor-not-allowed" />
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-juve-gold text-black text-sm font-black uppercase tracking-wider hover:bg-juve-gold-dark disabled:opacity-60"
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Salva modifiche
            </button>
          </div>
        </motion.div>

        {/* Change password */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white border border-gray-200 p-6">
          <h2 className="font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
            <Key className="h-4 w-4 text-juve-gold" /> Cambia password
          </h2>
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
                  onChange={e => setPwdForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black"
                />
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={pwdLoading || !pwdForm.newPwd || !pwdForm.confirm}
                className="flex items-center gap-2 px-5 py-2 bg-juve-black text-white text-sm font-bold hover:bg-juve-gray disabled:opacity-60">
                {pwdLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                Aggiorna password
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
