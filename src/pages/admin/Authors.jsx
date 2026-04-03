import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Mail, Trash2, Loader2, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/Dialog'

async function getAuthors() {
  const { data } = await supabase
    .from('profiles')
    .select('*, articles(count)')
  return data || []
}

async function inviteAuthor(email) {
  const { data, error } = await supabase.functions.invoke('admin-invite', {
    body: { email },
  })
  if (error) throw error
  return data
}

async function deleteAuthorApi(userId) {
  const { data, error } = await supabase.functions.invoke('admin-delete-user', {
    body: { userId },
  })
  if (error) throw error
  return data
}

export default function Authors() {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: authors = [], isLoading } = useQuery({
    queryKey: ['authors'],
    queryFn: getAuthors,
  })

  const inviteMutation = useMutation({
    mutationFn: () => inviteAuthor(email),
    onSuccess: () => {
      toast({ title: 'Invito inviato!', description: `Email di invito inviata a ${email}`, variant: 'success' })
      setEmail('')
      setInviteOpen(false)
      qc.invalidateQueries(['authors'])
    },
    onError: (err) => toast({
      title: 'Errore invito',
      description: err.message || 'Impossibile inviare l\'invito.',
      variant: 'destructive',
    }),
  })

  const deleteAuthorMutation = useMutation({
    mutationFn: async (userId) => {
      await deleteAuthorApi(userId)
    },
    onSuccess: () => {
      qc.invalidateQueries(['authors'])
      toast({ title: 'Redattore rimosso', variant: 'success' })
      setDeleteTarget(null)
    },
    onError: (err) => toast({ title: 'Errore', description: err.message, variant: 'destructive' }),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-black">Redattori</h1>
          <p className="text-sm text-gray-500 mt-1">{authors.length} redattori registrati</p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 bg-juve-gold text-black px-5 py-2.5 text-sm font-black uppercase tracking-wider hover:bg-juve-gold-dark transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Invita redattore
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-juve-gold" /></div>
      ) : (
        <div className="bg-white border border-gray-200">
          {authors.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-display text-lg">Nessun redattore</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              <AnimatePresence>
                {authors.map((author, i) => (
                  <motion.div key={author.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-juve-gold flex items-center justify-center shrink-0">
                      {author.avatar_url
                        ? <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="font-bold text-black text-sm">{author.username?.[0]?.toUpperCase() || 'R'}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-juve-black">{author.username || 'Redattore'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">ID: {author.id.slice(0, 8)}…</p>
                    </div>
                    <span className="text-xs text-gray-500 hidden md:block">
                      {author.articles?.[0]?.count || 0} articoli
                    </span>
                    <button
                      onClick={() => setDeleteTarget(author)}
                      className="p-1.5 hover:bg-red-100 transition-colors text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Invite modal */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)}>
        <DialogHeader onClose={() => setInviteOpen(false)}>
          <DialogTitle>Invita un redattore</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="redattore@esempio.it"
                className="w-full border border-gray-300 pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-juve-black"
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <button onClick={() => setInviteOpen(false)} className="px-4 py-2 border border-gray-300 text-sm">Annulla</button>
          <button
            onClick={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending || !email}
            className="px-5 py-2 bg-juve-gold text-black text-sm font-black disabled:opacity-60 flex items-center gap-2"
          >
            {inviteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Invia invito
          </button>
        </DialogFooter>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogHeader onClose={() => setDeleteTarget(null)}>
          <DialogTitle>Rimuovi redattore</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-gray-600">Rimuovere <strong>{deleteTarget?.username}</strong> dalla redazione? Gli articoli rimarranno visibili.</p>
        </DialogContent>
        <DialogFooter>
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-gray-300 text-sm">Annulla</button>
          <button onClick={() => deleteAuthorMutation.mutate(deleteTarget.id)} disabled={deleteAuthorMutation.isPending}
            className="px-4 py-2 bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60 flex items-center gap-2">
            {deleteAuthorMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Rimuovi
          </button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
