import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit3, X, Eye, Upload, Link2, Loader2, Film, Play, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const VIDEO_CATEGORIES = [
  { value: 'highlights', label: 'Highlights' },
  { value: 'interviste', label: 'Interviste' },
  { value: 'analisi', label: 'Analisi' },
  { value: 'allenamenti', label: 'Allenamenti' },
]

const PLATFORM_OPTIONS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'dailymotion', label: 'Dailymotion' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'custom', label: 'Upload / URL diretto' },
]

function extractVideoSource(url) {
  if (!url) return { platform: 'custom', videoId: null, isPlaylist: false }

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase()

    if (hostname === 'youtu.be' || hostname.endsWith('youtube.com')) {
      const videoId = parsed.searchParams.get('v')
        || parsed.pathname.match(/\/(?:embed\/|shorts\/)?([a-zA-Z0-9_-]{11})(?:\/|$)/)?.[1]
        || ''
      const playlistId = parsed.searchParams.get('list') || ''
      return {
        platform: 'youtube',
        videoId,
        isPlaylist: !!playlistId,
      }
    }

    if (hostname.endsWith('dailymotion.com') || hostname === 'dai.ly') {
      const videoId = parsed.pathname.match(/\/(?:video|embed\/video)\/([a-zA-Z0-9]+)/)?.[1]
        || parsed.pathname.match(/^\/([a-zA-Z0-9]+)$/)?.[1]
        || ''
      return { platform: 'dailymotion', videoId, isPlaylist: false }
    }

    if (hostname.endsWith('vimeo.com')) {
      const videoId = parsed.pathname.match(/\/(?:video\/)?(\d+)(?:\/|$)/)?.[1] || ''
      return { platform: 'vimeo', videoId, isPlaylist: false }
    }
  } catch {
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (yt) return { platform: 'youtube', videoId: yt[1], isPlaylist: /[?&]list=/.test(url) }
    const dm = url.match(/dailymotion\.com\/(?:video|embed\/video)\/([a-zA-Z0-9]+)/)
    if (dm) return { platform: 'dailymotion', videoId: dm[1], isPlaylist: false }
    const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
    if (vm) return { platform: 'vimeo', videoId: vm[1], isPlaylist: false }
  }

  return { platform: 'custom', videoId: null, isPlaylist: false }
}

function slugify(text) {
  return text.toLowerCase().replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const emptyVideo = {
  title: '', description: '', video_url: '', platform: 'youtube', video_id: '',
  thumbnail: '', duration: 0, category: 'highlights', is_published: false,
}

export default function VideoAdmin() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ ...emptyVideo })
  const [uploadMode, setUploadMode] = useState('url') // 'url' | 'upload'
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['admin-videos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const slug = data.slug || slugify(data.title) + '-' + Date.now().toString(36)
      const payload = { ...data, slug, published_at: data.is_published ? new Date().toISOString() : null }
      delete payload.slug_gen

      if (editingId) {
        delete payload.slug // don't change slug on edit
        const { error } = await supabase.from('videos').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('videos').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] })
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('videos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-videos'] }),
  })

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }) => {
      const { error } = await supabase.from('videos').update({
        is_published: published,
        published_at: published ? new Date().toISOString() : null,
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-videos'] }),
  })

  const resetForm = () => {
    setFormData({ ...emptyVideo })
    setEditingId(null)
    setShowForm(false)
    setUploadMode('url')
  }

  const openEdit = (video) => {
    setFormData({
      title: video.title, description: video.description || '', video_url: video.video_url,
      platform: video.platform, video_id: video.video_id || '', thumbnail: video.thumbnail || '',
      duration: video.duration || 0, category: video.category || 'highlights', is_published: video.is_published,
    })
    setEditingId(video.id)
    setUploadMode(video.platform === 'custom' ? 'upload' : 'url')
    setShowForm(true)
  }

  const handleUrlChange = (url) => {
    const { platform, videoId } = extractVideoSource(url)
    const thumbnail = platform === 'youtube' && videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : formData.thumbnail
    setFormData(p => ({ ...p, video_url: url, platform, video_id: videoId || '', thumbnail }))
  }

  const handleFileUpload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('media').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName)
      setFormData(p => ({ ...p, video_url: publicUrl, platform: 'custom', video_id: '' }))
    } catch (err) {
      alert('Errore upload: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.title || !formData.video_url) return
    saveMutation.mutate(formData)
  }

  const getThumbnail = (v) => {
    if (v.thumbnail) return v.thumbnail
    if (v.platform === 'youtube' && v.video_id) return `https://img.youtube.com/vi/${v.video_id}/mqdefault.jpg`
    return null
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-black text-juve-black">Video</h1>
          <p className="text-sm text-gray-500">{videos.length} video · {videos.filter(v => v.is_published).length} pubblicati</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 bg-juve-black text-white px-4 py-2 text-sm font-bold hover:bg-juve-gold hover:text-juve-black transition-colors">
          <Plus className="h-4 w-4" /> Nuovo video
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <form onSubmit={handleSubmit} className="bg-white border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">
                  {editingId ? 'Modifica video' : 'Nuovo video'}
                </h2>
                <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Titolo *</label>
                <input required value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-juve-gold focus:outline-none" />
              </div>

              {/* Source mode toggle */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Sorgente</label>
                <div className="flex gap-2 mb-3">
                  <button type="button" onClick={() => setUploadMode('url')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border transition-colors ${
                      uploadMode === 'url' ? 'bg-juve-black text-white border-juve-black' : 'border-gray-300 text-gray-600 hover:border-juve-gold'
                    }`}>
                    <Link2 className="h-3.5 w-3.5" /> URL (YouTube, playlist, Vimeo, embed)
                  </button>
                  <button type="button" onClick={() => setUploadMode('upload')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border transition-colors ${
                      uploadMode === 'upload' ? 'bg-juve-black text-white border-juve-black' : 'border-gray-300 text-gray-600 hover:border-juve-gold'
                    }`}>
                    <Upload className="h-3.5 w-3.5" /> Upload file
                  </button>
                </div>

                {uploadMode === 'url' ? (
                  <div>
                    <input value={formData.video_url} onChange={e => handleUrlChange(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=...&list=... oppure URL Vimeo / embed"
                      className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-juve-gold focus:outline-none" />
                    {formData.platform && formData.platform !== 'custom' && (
                      <p className="text-[10px] text-green-600 font-bold mt-1 uppercase">
                        Rilevato: {formData.platform} {formData.video_id && `(${formData.video_id})`}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-juve-gold p-8 cursor-pointer transition-colors">
                      <input type="file" accept="video/*" className="hidden" onChange={e => handleFileUpload(e.target.files[0])} />
                      {uploading ? (
                        <><Loader2 className="h-5 w-5 animate-spin text-juve-gold" /> <span className="text-sm text-gray-500">Caricamento...</span></>
                      ) : formData.video_url && formData.platform === 'custom' ? (
                        <><Film className="h-5 w-5 text-green-600" /> <span className="text-sm text-green-600 font-bold">Video caricato</span></>
                      ) : (
                        <><Upload className="h-5 w-5 text-gray-400" /> <span className="text-sm text-gray-500">Trascina o clicca per caricare un video</span></>
                      )}
                    </label>
                    {formData.video_url && formData.platform === 'custom' && (
                      <p className="text-[10px] text-gray-400 mt-1 truncate">{formData.video_url}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Categoria</label>
                  <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-juve-gold focus:outline-none">
                    {VIDEO_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Durata (secondi)</label>
                  <input type="number" value={formData.duration} onChange={e => setFormData(p => ({ ...p, duration: +e.target.value }))}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-juve-gold focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Thumbnail URL</label>
                  <input value={formData.thumbnail} onChange={e => setFormData(p => ({ ...p, thumbnail: e.target.value }))}
                    placeholder="Auto per YouTube"
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-juve-gold focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Descrizione</label>
                <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-juve-gold focus:outline-none" />
              </div>

              {/* Preview thumbnail */}
              {(formData.thumbnail || (formData.platform === 'youtube' && formData.video_id)) && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Anteprima</label>
                  <img src={formData.thumbnail || `https://img.youtube.com/vi/${formData.video_id}/hqdefault.jpg`}
                    alt="Anteprima" className="w-48 aspect-video object-cover border border-gray-200" />
                </div>
              )}

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={formData.is_published}
                    onChange={e => setFormData(p => ({ ...p, is_published: e.target.checked }))} />
                  Pubblica subito
                </label>
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={saveMutation.isPending}
                  className="bg-juve-black text-white px-6 py-2 text-sm font-bold hover:bg-juve-gold hover:text-juve-black transition-colors disabled:opacity-50">
                  {saveMutation.isPending ? 'Salvataggio...' : editingId ? 'Aggiorna' : 'Crea video'}
                </button>
                <button type="button" onClick={resetForm} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-800">
                  Annulla
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista video */}
      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-juve-gold mx-auto" /></div>
      ) : (
        <div className="space-y-3">
          {videos.map((video) => {
            const thumb = getThumbnail(video)
            return (
              <div key={video.id} className="bg-white border border-gray-200 p-4 flex gap-4">
                {/* Thumbnail */}
                <div className="w-32 aspect-video bg-gray-100 shrink-0 overflow-hidden">
                  {thumb ? (
                    <img src={thumb} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Film className="h-6 w-6 text-gray-300" /></div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 ${video.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {video.is_published ? 'Pubblicato' : 'Bozza'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-juve-gold">{video.category}</span>
                    <span className="text-[10px] text-gray-400 uppercase">{video.platform}</span>
                  </div>
                  <h3 className="font-display text-sm font-black text-juve-black truncate">{video.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                    <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{video.views || 0} views</span>
                    {video.published_at && <span>{new Date(video.published_at).toLocaleDateString('it-IT')}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => openEdit(video)} className="p-1.5 text-gray-400 hover:text-juve-gold" title="Modifica">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button onClick={() => togglePublish.mutate({ id: video.id, published: !video.is_published })}
                    className={`p-1.5 ${video.is_published ? 'text-green-500 hover:text-gray-400' : 'text-gray-400 hover:text-green-500'}`}
                    title={video.is_published ? 'Nascondi' : 'Pubblica'}>
                    <Play className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(video)}
                    className="p-1.5 text-gray-400 hover:text-red-500" title="Elimina">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-sm p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-black text-juve-black dark:text-white">Elimina video</h3>
                  <p className="text-sm text-gray-500">Questa azione è irreversibile.</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
                Vuoi eliminare il video <span className="font-bold">"{deleteTarget.title}"</span>?
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
                  Annulla
                </button>
                <button
                  disabled={deleteMutation.isPending}
                  onClick={() => { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null) }}
                  className="bg-red-600 text-white px-4 py-2 text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Eliminazione...' : 'Elimina'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
