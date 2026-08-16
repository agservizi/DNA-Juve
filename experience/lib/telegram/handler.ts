import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  answerCallback,
  downloadFile,
  getFile,
  isChatAllowed,
  largestPhoto,
  sendMessage,
  type TelegramUpdate,
} from '@/lib/telegram/api'
import { clearSession, getSession, saveSession, type TelegramDraft, type TelegramSession } from '@/lib/telegram/session'
import {
  createArticleFromTelegram,
  findArticleForEdit,
  getArticleTagsCsv,
  listCategories,
  listPublishedGalleryItems,
  listPublishedVideos,
  listRecentArticles,
  updateArticleFromTelegram,
  uploadCoverBytes,
  type EditableArticle,
} from '@/lib/telegram/publish'

const HELP = `Comandi BianconeriHub

/nuovo — crea un articolo
/modifica — modifica un articolo esistente
/modifica <slug|url> — modifica un articolo preciso
/annulla — interrompe la bozza
/help — questo messaggio

Flusso /nuovo:
1) titolo
2) sommario
3) testo (più messaggi ok, poi /fine)
4) tag (virgola) oppure /salta
5) foto copertina oppure /salta
6) video dalla videoteca oppure /salta
7) media da Gallery Live oppure /salta
8) categoria
9) Pubblica in evidenza / Pubblica / Bozza

Flusso /modifica:
1) scegli l’articolo
2) scegli cosa cambiare (titolo, sommario, testo, tag, copertina, categoria)
3) salva campo per campo`

function chunkButtons<T>(items: T[], size: number) {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size))
  return rows
}

function truncateLabel(value: string, max = 28) {
  const t = value.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function askCategory(db: SupabaseClient, chatId: number) {
  const categories = await listCategories(db)
  if (!categories.length) {
    await sendMessage(chatId, 'Nessuna categoria in database. Creane una da /admin/categorie.')
    return false
  }
  await sendMessage(chatId, 'Scegli la categoria:', {
    reply_markup: {
      inline_keyboard: chunkButtons(
        categories.map((c) => ({ text: c.name, callback_data: `cat:${c.id}` })),
        2,
      ),
    },
  })
  return true
}

async function askVideo(db: SupabaseClient, chatId: number) {
  const videos = await listPublishedVideos(db, 8)
  if (!videos.length) {
    await sendMessage(chatId, 'Nessun video pubblicato in videoteca. Scrivi /salta per continuare.')
    return
  }
  await sendMessage(chatId, 'Scegli un video dalla videoteca, oppure /salta:', {
    reply_markup: {
      inline_keyboard: [
        ...videos.map((v) => [
          {
            text: truncateLabel(`${v.platform}: ${v.title}`),
            callback_data: `video:${v.id}`,
          },
        ]),
      ],
    },
  })
}

async function askGallery(db: SupabaseClient, chatId: number) {
  const items = await listPublishedGalleryItems(db, 8)
  if (!items.length) {
    await sendMessage(chatId, 'Nessun media in Gallery Live. Scrivi /salta per continuare.')
    return
  }
  await sendMessage(chatId, 'Scegli da Gallery Live, oppure /salta:', {
    reply_markup: {
      inline_keyboard: [
        ...items.map((item) => [
          {
            text: truncateLabel(`${item.media_type === 'video' ? '🎬' : '📷'} ${item.title}`),
            callback_data: `gal:${item.id}`,
          },
        ]),
      ],
    },
  })
}

async function askStatus(chatId: number) {
  await sendMessage(chatId, 'Stato pubblicazione:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Pubblica in evidenza', callback_data: 'status:published:1' }],
        [
          { text: 'Pubblica', callback_data: 'status:published:0' },
          { text: 'Bozza', callback_data: 'status:draft:0' },
        ],
      ],
    },
  })
}

async function askEditMenu(chatId: number, draft: TelegramDraft) {
  const title = draft.title || 'Articolo'
  await sendMessage(
    chatId,
    `Modifica: <b>${escapeHtml(truncateLabel(title, 60))}</b>\n` +
      `Stato: <b>${draft.status || '?'}</b>${draft.featured ? ' · evidenza' : ''}\n\n` +
      'Cosa vuoi cambiare?',
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Titolo', callback_data: 'efield:title' },
            { text: 'Sommario', callback_data: 'efield:excerpt' },
          ],
          [
            { text: 'Testo', callback_data: 'efield:content' },
            { text: 'Tag', callback_data: 'efield:tags' },
          ],
          [
            { text: 'Copertina', callback_data: 'efield:cover' },
            { text: 'Categoria', callback_data: 'efield:category' },
          ],
          [
            { text: 'In evidenza', callback_data: 'efield:featured' },
            { text: 'Stato', callback_data: 'efield:status' },
          ],
          [{ text: 'Fine', callback_data: 'efield:done' }],
        ],
      },
    },
  )
}

async function startEditSession(db: SupabaseClient, chatId: number, article: EditableArticle) {
  const tags = await getArticleTagsCsv(db, article.id)
  const category = Array.isArray(article.categories) ? article.categories[0] : article.categories
  const draft: TelegramDraft = {
    mode: 'edit',
    article_id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt || '',
    tags,
    cover_image: article.cover_image || undefined,
    category_id: article.category_id || category?.id,
    category_name: category?.name,
    status: article.status === 'draft' ? 'draft' : 'published',
    featured: !!article.featured,
  }
  await saveSession(db, { chat_id: chatId, step: 'edit_menu', draft })
  await askEditMenu(chatId, draft)
}

async function askRecentArticles(db: SupabaseClient, chatId: number) {
  const articles = await listRecentArticles(db, 8)
  if (!articles.length) {
    await sendMessage(chatId, 'Nessun articolo da modificare.')
    return
  }
  await saveSession(db, { chat_id: chatId, step: 'edit_pick', draft: { mode: 'edit' } })
  await sendMessage(chatId, 'Scegli l’articolo da modificare, oppure manda slug/URL:', {
    reply_markup: {
      inline_keyboard: articles.map((article) => [
        {
          text: truncateLabel(`${article.status === 'draft' ? '📝 ' : ''}${article.title}`, 48),
          callback_data: `edit:${article.id}`,
        },
      ]),
    },
  })
}

async function goToGalleryStep(db: SupabaseClient, session: TelegramSession, draft: TelegramDraft) {
  await saveSession(db, { ...session, step: 'gallery', draft })
  await askGallery(db, session.chat_id)
}

async function goToCategoryStep(db: SupabaseClient, session: TelegramSession, draft: TelegramDraft) {
  await saveSession(db, { ...session, step: 'category', draft })
  await askCategory(db, session.chat_id)
}

async function finalize(
  db: SupabaseClient,
  session: TelegramSession,
  status: 'draft' | 'published',
  featured: boolean,
) {
  const draft = session.draft
  const content = (draft.contentParts || []).join('\n\n').trim()
  const article = await createArticleFromTelegram(db, {
    title: draft.title || '',
    excerpt: draft.excerpt || '',
    content,
    tags: draft.tags,
    cover_image: draft.cover_image,
    video_id: draft.video_id,
    gallery_item_id: draft.gallery_item_id,
    category_id: draft.category_id,
    status,
    featured: status === 'published' ? featured : false,
  })
  await clearSession(db, session.chat_id)
  const label =
    status === 'draft' ? 'bozza' : featured ? 'pubblicato in evidenza' : 'pubblicato'
  await sendMessage(
    session.chat_id,
    `Articolo salvato come <b>${label}</b>.\n\n` +
      `<a href="${article.url}">Apri pubblico</a>\n` +
      `<a href="${article.adminUrl}">Apri in admin</a>`,
    { parse_mode: 'HTML' },
  )
}

async function handleCommand(db: SupabaseClient, chatId: number, text: string) {
  const [rawCommand, ...rest] = text.split(/\s+/)
  const command = rawCommand.toLowerCase().replace(/@\w+$/, '')
  const arg = rest.join(' ').trim()

  if (command === '/start' || command === '/help') {
    await sendMessage(chatId, HELP)
    return
  }

  if (command === '/annulla') {
    await clearSession(db, chatId)
    await sendMessage(chatId, 'Operazione annullata.')
    return
  }

  if (command === '/nuovo') {
    const session: TelegramSession = { chat_id: chatId, step: 'title', draft: { mode: 'create' } }
    await saveSession(db, session)
    await sendMessage(chatId, 'Nuovo articolo.\n\nMandami il <b>titolo</b>.', { parse_mode: 'HTML' })
    return
  }

  if (command === '/modifica') {
    if (arg) {
      const article = await findArticleForEdit(db, arg)
      if (!article) {
        await sendMessage(chatId, 'Articolo non trovato. Usa /modifica per scegliere dalla lista.')
        return
      }
      await startEditSession(db, chatId, article)
      return
    }
    await askRecentArticles(db, chatId)
    return
  }

  await sendMessage(chatId, 'Comando non riconosciuto. Usa /help')
}

async function returnToEditMenu(db: SupabaseClient, session: TelegramSession, draft: TelegramDraft, notice?: string) {
  await saveSession(db, { ...session, step: 'edit_menu', draft })
  if (notice) await sendMessage(session.chat_id, notice, { parse_mode: 'HTML' })
  await askEditMenu(session.chat_id, draft)
}

async function handleEditStepText(db: SupabaseClient, session: TelegramSession, text: string) {
  const chatId = session.chat_id
  const draft: TelegramDraft = { ...session.draft }
  const trimmed = text.trim()
  const lower = trimmed.toLowerCase()
  const articleId = draft.article_id
  if (!articleId) {
    await clearSession(db, chatId)
    await sendMessage(chatId, 'Sessione modifica non valida. Usa /modifica')
    return
  }

  if (session.step === 'edit_pick') {
    const article = await findArticleForEdit(db, trimmed)
    if (!article) {
      await sendMessage(chatId, 'Articolo non trovato. Scegli un pulsante o manda uno slug/URL valido.')
      return
    }
    await startEditSession(db, chatId, article)
    return
  }

  if (session.step === 'edit_title') {
    if (trimmed.length < 3) {
      await sendMessage(chatId, 'Titolo troppo corto. Riprova.')
      return
    }
    const updated = await updateArticleFromTelegram(db, articleId, { title: trimmed })
    draft.title = trimmed
    await returnToEditMenu(db, session, draft, `Titolo aggiornato.\n<a href="${updated.url}">Apri articolo</a>`)
    return
  }

  if (session.step === 'edit_excerpt') {
    if (trimmed.length < 10) {
      await sendMessage(chatId, 'Sommario troppo corto. Riprova.')
      return
    }
    const updated = await updateArticleFromTelegram(db, articleId, { excerpt: trimmed })
    draft.excerpt = trimmed
    await returnToEditMenu(db, session, draft, `Sommario aggiornato.\n<a href="${updated.url}">Apri articolo</a>`)
    return
  }

  if (session.step === 'edit_content') {
    if (lower === '/fine' || lower === 'fine') {
      const parts = draft.contentParts || []
      if (!parts.length) {
        await sendMessage(chatId, 'Scrivi almeno un pezzo di testo, poi /fine. Oppure /annulla')
        return
      }
      const content = parts.join('\n\n').trim()
      const updated = await updateArticleFromTelegram(db, articleId, { content })
      draft.contentParts = []
      await returnToEditMenu(db, session, draft, `Testo aggiornato.\n<a href="${updated.url}">Apri articolo</a>`)
      return
    }
    draft.contentParts = [...(draft.contentParts || []), trimmed]
    await saveSession(db, { ...session, step: 'edit_content', draft })
    await sendMessage(chatId, `Ricevuto (${draft.contentParts.length} pezzi). Continua o /fine`)
    return
  }

  if (session.step === 'edit_tags') {
    const tags = lower === '/salta' || lower === 'salta' ? '' : trimmed
    const updated = await updateArticleFromTelegram(db, articleId, { tags })
    draft.tags = tags
    await returnToEditMenu(db, session, draft, `Tag aggiornati.\n<a href="${updated.url}">Apri articolo</a>`)
    return
  }

  if (session.step === 'edit_cover') {
    if (lower === '/salta' || lower === 'salta') {
      await returnToEditMenu(db, session, draft, 'Copertina lasciata invariata.')
      return
    }
    await sendMessage(chatId, 'In questa fase mandami una foto, oppure /salta')
    return
  }

  if (session.step === 'edit_category') {
    await sendMessage(chatId, 'Usa i pulsanti categoria, oppure /annulla')
    return
  }

  if (session.step === 'edit_menu') {
    await askEditMenu(chatId, draft)
  }
}

async function handleStepText(db: SupabaseClient, session: TelegramSession, text: string) {
  if (session.draft.mode === 'edit' || String(session.step).startsWith('edit_')) {
    await handleEditStepText(db, session, text)
    return
  }

  const chatId = session.chat_id
  const draft: TelegramDraft = { ...session.draft }
  const trimmed = text.trim()
  const lower = trimmed.toLowerCase()

  if (session.step === 'title') {
    if (trimmed.length < 3) {
      await sendMessage(chatId, 'Titolo troppo corto. Riprova.')
      return
    }
    draft.title = trimmed
    await saveSession(db, { ...session, step: 'excerpt', draft })
    await sendMessage(chatId, 'Ora il <b>sommario</b> (2–3 frasi).', { parse_mode: 'HTML' })
    return
  }

  if (session.step === 'excerpt') {
    if (trimmed.length < 10) {
      await sendMessage(chatId, 'Sommario troppo corto. Riprova.')
      return
    }
    draft.excerpt = trimmed
    await saveSession(db, { ...session, step: 'content', draft: { ...draft, contentParts: [] } })
    await sendMessage(
      chatId,
      'Ora il <b>testo</b> dell’articolo.\nPuoi mandare più messaggi.\nQuando hai finito: /fine',
      { parse_mode: 'HTML' },
    )
    return
  }

  if (session.step === 'content') {
    if (lower === '/fine' || lower === 'fine') {
      const parts = draft.contentParts || []
      if (!parts.length) {
        await sendMessage(chatId, 'Scrivi almeno un pezzo di testo, poi /fine.')
        return
      }
      await saveSession(db, { ...session, step: 'tags', draft })
      await sendMessage(chatId, 'Tag separati da virgola, oppure /salta')
      return
    }
    draft.contentParts = [...(draft.contentParts || []), trimmed]
    await saveSession(db, { ...session, step: 'content', draft })
    await sendMessage(chatId, `Ricevuto (${draft.contentParts.length} pezzi). Continua o /fine`)
    return
  }

  if (session.step === 'tags') {
    if (lower !== '/salta' && lower !== 'salta') draft.tags = trimmed
    await saveSession(db, { ...session, step: 'cover', draft })
    await sendMessage(chatId, 'Mandami la <b>copertina</b> (JPG/PNG) oppure /salta', { parse_mode: 'HTML' })
    return
  }

  if (session.step === 'cover') {
    if (lower === '/salta' || lower === 'salta') {
      await saveSession(db, { ...session, step: 'video', draft })
      await askVideo(db, chatId)
      return
    }
    await sendMessage(chatId, 'In questa fase mandami una foto, oppure /salta')
    return
  }

  if (session.step === 'video') {
    if (lower === '/salta' || lower === 'salta') {
      await goToGalleryStep(db, session, draft)
      return
    }
    await sendMessage(chatId, 'Usa i pulsanti video, oppure /salta')
    return
  }

  if (session.step === 'gallery') {
    if (lower === '/salta' || lower === 'salta') {
      await goToCategoryStep(db, session, draft)
      return
    }
    await sendMessage(chatId, 'Usa i pulsanti Gallery Live, oppure /salta')
    return
  }

  if (session.step === 'category' || session.step === 'status') {
    await sendMessage(chatId, 'Usa i pulsanti qui sotto, oppure /annulla')
  }
}

async function handlePhoto(db: SupabaseClient, session: TelegramSession, fileId: string, mimeHint?: string) {
  if (session.step === 'edit_cover') {
    const articleId = session.draft.article_id
    if (!articleId) {
      await sendMessage(session.chat_id, 'Sessione modifica non valida. Usa /modifica')
      return
    }
    const file = await getFile(fileId)
    if (!file.file_path) throw new Error('file_path Telegram mancante')
    const { bytes, contentType } = await downloadFile(file.file_path)
    const type = mimeHint && mimeHint.startsWith('image/') ? mimeHint : contentType.startsWith('image/') ? contentType : 'image/jpeg'
    const url = await uploadCoverBytes(db, bytes, type, session.draft.title || 'cover')
    const updated = await updateArticleFromTelegram(db, articleId, { cover_image: url })
    const draft = { ...session.draft, cover_image: url }
    await returnToEditMenu(db, session, draft, `Copertina aggiornata.\n<a href="${updated.url}">Apri articolo</a>`)
    return
  }

  if (session.step !== 'cover') {
    await sendMessage(session.chat_id, 'Ora non sto aspettando una foto. Usa /nuovo, /modifica o /help')
    return
  }

  const file = await getFile(fileId)
  if (!file.file_path) throw new Error('file_path Telegram mancante')
  const { bytes, contentType } = await downloadFile(file.file_path)
  const type = mimeHint && mimeHint.startsWith('image/') ? mimeHint : contentType.startsWith('image/') ? contentType : 'image/jpeg'
  const url = await uploadCoverBytes(db, bytes, type, session.draft.title || 'cover')
  const draft = { ...session.draft, cover_image: url }
  await saveSession(db, { ...session, step: 'video', draft })
  await sendMessage(session.chat_id, 'Copertina caricata.')
  await askVideo(db, session.chat_id)
}

export async function handleTelegramUpdate(db: SupabaseClient, update: TelegramUpdate) {
  if (update.callback_query) {
    const cb = update.callback_query
    const chatId = cb.message?.chat.id || cb.from.id
    if (!isChatAllowed(chatId)) {
      await answerCallback(cb.id, 'Non autorizzato')
      return
    }

    await answerCallback(cb.id)
    const session = await getSession(db, chatId)
    const data = String(cb.data || '')

    if (data.startsWith('edit:') && (session.step === 'edit_pick' || session.step === 'idle' || session.draft.mode === 'edit')) {
      const articleId = data.slice(5)
      const article = await findArticleForEdit(db, articleId)
      if (!article) {
        await sendMessage(chatId, 'Articolo non trovato.')
        return
      }
      await startEditSession(db, chatId, article)
      return
    }

    if (data.startsWith('efield:') && session.step === 'edit_menu') {
      const field = data.slice(7)
      const draft = { ...session.draft }
      if (!draft.article_id) {
        await sendMessage(chatId, 'Sessione modifica non valida. Usa /modifica')
        return
      }

      if (field === 'done') {
        await clearSession(db, chatId)
        const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bianconerihub.com').replace(/\/+$/, '')
        const url = draft.slug ? `${site}/articolo/${draft.slug}` : ''
        await sendMessage(
          chatId,
          `Modifica conclusa.\n${url ? `<a href="${url}">Apri articolo</a>` : 'Usa /modifica per un altro articolo.'}`,
          { parse_mode: 'HTML' },
        )
        return
      }

      if (field === 'title') {
        await saveSession(db, { ...session, step: 'edit_title', draft })
        await sendMessage(chatId, `Titolo attuale:\n<b>${escapeHtml(draft.title || '')}</b>\n\nMandami il nuovo titolo.`, {
          parse_mode: 'HTML',
        })
        return
      }

      if (field === 'excerpt') {
        await saveSession(db, { ...session, step: 'edit_excerpt', draft })
        await sendMessage(
          chatId,
          `Sommario attuale:\n${escapeHtml(draft.excerpt || '(vuoto)')}\n\nMandami il nuovo sommario.`,
          { parse_mode: 'HTML' },
        )
        return
      }

      if (field === 'content') {
        await saveSession(db, { ...session, step: 'edit_content', draft: { ...draft, contentParts: [] } })
        await sendMessage(
          chatId,
          'Mandami il <b>nuovo testo</b> (sostituisce quello attuale).\nPuoi mandare più messaggi, poi /fine',
          { parse_mode: 'HTML' },
        )
        return
      }

      if (field === 'tags') {
        await saveSession(db, { ...session, step: 'edit_tags', draft })
        await sendMessage(
          chatId,
          `Tag attuali: <b>${escapeHtml(draft.tags || '(nessuno)')}</b>\n\nMandami i nuovi tag separati da virgola, oppure /salta per svuotare.`,
          { parse_mode: 'HTML' },
        )
        return
      }

      if (field === 'cover') {
        await saveSession(db, { ...session, step: 'edit_cover', draft })
        await sendMessage(chatId, 'Mandami la nuova <b>copertina</b>, oppure /salta per lasciare quella attuale.', {
          parse_mode: 'HTML',
        })
        return
      }

      if (field === 'category') {
        await saveSession(db, { ...session, step: 'edit_category', draft })
        await askCategory(db, chatId)
        return
      }

      if (field === 'featured') {
        const featured = !draft.featured
        const updated = await updateArticleFromTelegram(db, draft.article_id, { featured })
        draft.featured = featured
        await returnToEditMenu(
          db,
          session,
          draft,
          featured ? `Articolo messo in evidenza.\n<a href="${updated.url}">Apri articolo</a>` : `Evidenza rimossa.\n<a href="${updated.url}">Apri articolo</a>`,
        )
        return
      }

      if (field === 'status') {
        await sendMessage(chatId, 'Nuovo stato:', {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Pubblica in evidenza', callback_data: 'estatus:published:1' }],
              [
                { text: 'Pubblica', callback_data: 'estatus:published:0' },
                { text: 'Bozza', callback_data: 'estatus:draft:0' },
              ],
            ],
          },
        })
        return
      }

      await sendMessage(chatId, 'Campo non valido.')
      return
    }

    if (data.startsWith('estatus:') && session.draft.mode === 'edit' && session.draft.article_id) {
      const articleId = session.draft.article_id
      const [, statusRaw, featuredRaw] = data.split(':')
      const status = statusRaw === 'published' ? 'published' : 'draft'
      const featured = featuredRaw === '1'
      const draft = { ...session.draft }
      const updated = await updateArticleFromTelegram(db, articleId, {
        status,
        featured: status === 'published' ? featured : false,
      })
      draft.status = status
      draft.featured = status === 'published' ? featured : false
      await returnToEditMenu(
        db,
        session,
        draft,
        `Stato aggiornato a <b>${status === 'draft' ? 'bozza' : featured ? 'pubblicato in evidenza' : 'pubblicato'}</b>.\n<a href="${updated.url}">Apri articolo</a>`,
      )
      return
    }

    if (data.startsWith('video:') && session.step === 'video') {
      const videoId = data.slice(6)
      const { data: video, error } = await db
        .from('videos')
        .select('id,title,is_published')
        .eq('id', videoId)
        .eq('is_published', true)
        .maybeSingle()
      if (error) throw error
      if (!video) {
        await sendMessage(chatId, 'Video non valido. Riprova o /salta.')
        await askVideo(db, chatId)
        return
      }
      const draft = { ...session.draft, video_id: video.id }
      await sendMessage(chatId, `Video: <b>${truncateLabel(video.title, 60)}</b>`, { parse_mode: 'HTML' })
      await goToGalleryStep(db, session, draft)
      return
    }

    if (data.startsWith('gal:') && session.step === 'gallery') {
      const galleryId = data.slice(4)
      const { data: item, error } = await db
        .from('gallery_items')
        .select('id,title,status')
        .eq('id', galleryId)
        .eq('status', 'published')
        .maybeSingle()
      if (error) throw error
      if (!item) {
        await sendMessage(chatId, 'Media gallery non valido. Riprova o /salta.')
        await askGallery(db, chatId)
        return
      }
      const draft = { ...session.draft, gallery_item_id: item.id }
      await sendMessage(chatId, `Gallery: <b>${truncateLabel(item.title, 60)}</b>`, { parse_mode: 'HTML' })
      await goToCategoryStep(db, session, draft)
      return
    }

    if (data.startsWith('cat:') && (session.step === 'category' || session.step === 'edit_category')) {
      const categoryId = data.slice(4)
      const categories = await listCategories(db)
      const category = categories.find((c) => c.id === categoryId)
      if (!category) {
        await sendMessage(chatId, 'Categoria non valida. Riprova.')
        await askCategory(db, chatId)
        return
      }

      if (session.step === 'edit_category' && session.draft.article_id) {
        const articleId = session.draft.article_id
        const draft = { ...session.draft, category_id: category.id, category_name: category.name }
        const updated = await updateArticleFromTelegram(db, articleId, { category_id: category.id })
        await returnToEditMenu(
          db,
          session,
          draft,
          `Categoria: <b>${escapeHtml(category.name)}</b>\n<a href="${updated.url}">Apri articolo</a>`,
        )
        return
      }

      const draft = { ...session.draft, category_id: category.id, category_name: category.name }
      await saveSession(db, { ...session, step: 'status', draft })
      await sendMessage(chatId, `Categoria: <b>${category.name}</b>`, { parse_mode: 'HTML' })
      await askStatus(chatId)
      return
    }

    if (data.startsWith('status:') && session.step === 'status') {
      const [, statusRaw, featuredRaw] = data.split(':')
      const status = statusRaw === 'published' ? 'published' : 'draft'
      const featured = featuredRaw === '1' || (featuredRaw === undefined && status === 'published')
      await finalize(db, session, status, featured)
      return
    }

    await sendMessage(chatId, 'Azione non valida in questo momento. Usa /nuovo o /modifica')
    return
  }

  const message = update.message
  if (!message) return
  const chatId = message.chat.id
  if (!isChatAllowed(chatId)) {
    await sendMessage(chatId, 'Chat non autorizzata.')
    return
  }

  const text = (message.text || '').trim()
  if (text.startsWith('/')) {
    if (text.toLowerCase().startsWith('/fine') || text.toLowerCase().startsWith('/salta')) {
      const session = await getSession(db, chatId)
      if (session.step !== 'idle') {
        await handleStepText(db, session, text)
        return
      }
    }
    await handleCommand(db, chatId, text)
    return
  }

  const session = await getSession(db, chatId)
  if (session.step === 'idle') {
    await sendMessage(chatId, 'Usa /nuovo o /modifica, oppure /help')
    return
  }

  const photo = largestPhoto(message)
  if (photo) {
    await handlePhoto(db, session, photo.file_id)
    return
  }

  if (message.document?.mime_type?.startsWith('image/')) {
    await handlePhoto(db, session, message.document.file_id, message.document.mime_type)
    return
  }

  if (text) {
    await handleStepText(db, session, text)
    return
  }

  await sendMessage(chatId, 'Messaggio non supportato in questa fase.')
}
