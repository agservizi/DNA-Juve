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
import { createArticleFromTelegram, listCategories, uploadCoverBytes } from '@/lib/telegram/publish'

const HELP = `Comandi BianconeriHub

/nuovo — crea un articolo
/annulla — interrompe la bozza
/help — questo messaggio

Flusso /nuovo:
1) titolo
2) sommario
3) testo (più messaggi ok, poi /fine)
4) tag (virgola) oppure /salta
5) foto copertina oppure /salta
6) categoria
7) Bozza o Pubblica`

function chunkButtons<T>(items: T[], size: number) {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size))
  return rows
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

async function askStatus(chatId: number) {
  await sendMessage(chatId, 'Stato pubblicazione:', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Bozza', callback_data: 'status:draft' },
          { text: 'Pubblica', callback_data: 'status:published' },
        ],
      ],
    },
  })
}

async function finalize(
  db: SupabaseClient,
  session: TelegramSession,
  status: 'draft' | 'published',
) {
  const draft = session.draft
  const content = (draft.contentParts || []).join('\n\n').trim()
  const article = await createArticleFromTelegram(db, {
    title: draft.title || '',
    excerpt: draft.excerpt || '',
    content,
    tags: draft.tags,
    cover_image: draft.cover_image,
    category_id: draft.category_id,
    status,
  })
  await clearSession(db, session.chat_id)
  await sendMessage(
    session.chat_id,
    `Articolo salvato come <b>${status === 'published' ? 'pubblicato' : 'bozza'}</b>.\n\n` +
      `<a href="${article.url}">Apri pubblico</a>\n` +
      `<a href="${article.adminUrl}">Apri in admin</a>`,
    { parse_mode: 'HTML' },
  )
}

async function handleCommand(db: SupabaseClient, chatId: number, text: string) {
  const command = text.split(/\s+/)[0].toLowerCase().replace(/@\w+$/, '')

  if (command === '/start' || command === '/help') {
    await sendMessage(chatId, HELP)
    return
  }

  if (command === '/annulla') {
    await clearSession(db, chatId)
    await sendMessage(chatId, 'Bozza annullata.')
    return
  }

  if (command === '/nuovo') {
    const session: TelegramSession = { chat_id: chatId, step: 'title', draft: {} }
    await saveSession(db, session)
    await sendMessage(chatId, 'Nuovo articolo.\n\nMandami il <b>titolo</b>.', { parse_mode: 'HTML' })
    return
  }

  await sendMessage(chatId, 'Comando non riconosciuto. Usa /help')
}

async function handleStepText(db: SupabaseClient, session: TelegramSession, text: string) {
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
      await saveSession(db, { ...session, step: 'category', draft })
      await askCategory(db, chatId)
      return
    }
    await sendMessage(chatId, 'In questa fase mandami una foto, oppure /salta')
    return
  }

  if (session.step === 'category' || session.step === 'status') {
    await sendMessage(chatId, 'Usa i pulsanti qui sotto, oppure /annulla')
  }
}

async function handlePhoto(db: SupabaseClient, session: TelegramSession, fileId: string, mimeHint?: string) {
  if (session.step !== 'cover') {
    await sendMessage(session.chat_id, 'Ora non sto aspettando una foto. Usa /nuovo o /help')
    return
  }

  const file = await getFile(fileId)
  if (!file.file_path) throw new Error('file_path Telegram mancante')
  const { bytes, contentType } = await downloadFile(file.file_path)
  const type = mimeHint && mimeHint.startsWith('image/') ? mimeHint : contentType.startsWith('image/') ? contentType : 'image/jpeg'
  const url = await uploadCoverBytes(db, bytes, type, session.draft.title || 'cover')
  const draft = { ...session.draft, cover_image: url }
  await saveSession(db, { ...session, step: 'category', draft })
  await sendMessage(session.chat_id, 'Copertina caricata.')
  await askCategory(db, session.chat_id)
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

    if (data.startsWith('cat:') && session.step === 'category') {
      const categoryId = data.slice(4)
      const categories = await listCategories(db)
      const category = categories.find((c) => c.id === categoryId)
      if (!category) {
        await sendMessage(chatId, 'Categoria non valida. Riprova.')
        await askCategory(db, chatId)
        return
      }
      const draft = { ...session.draft, category_id: category.id, category_name: category.name }
      await saveSession(db, { ...session, step: 'status', draft })
      await sendMessage(chatId, `Categoria: <b>${category.name}</b>`, { parse_mode: 'HTML' })
      await askStatus(chatId)
      return
    }

    if (data.startsWith('status:') && session.step === 'status') {
      const status = data.slice(7) === 'published' ? 'published' : 'draft'
      await finalize(db, session, status)
      return
    }

    await sendMessage(chatId, 'Azione non valida in questo momento. Usa /nuovo')
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
    // Allow /fine and /salta during flow
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
    await sendMessage(chatId, 'Usa /nuovo per creare un articolo, oppure /help')
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
