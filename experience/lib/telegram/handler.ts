import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  answerCallback,
  channelChatId,
  downloadFile,
  getFile,
  getWebhookInfo,
  isChatAllowed,
  largestPhoto,
  sendMessage,
  sendPhoto,
  type TelegramUpdate,
} from '@/lib/telegram/api'
import { clearSession, createServiceClient, getSession, saveSession, type TelegramDraft, type TelegramSession } from '@/lib/telegram/session'
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
import { getTeamMatches, getRumors } from '@/lib/match-market-content'
import { getLiveNews, liveNewsHref } from '@/lib/live-news'
import { promoteLiveNewsToDraft } from '@/lib/promote-live'
import {
  announceBreaking,
  announceFulltime,
  announceKickoff,
  announceLiveDigest,
  announceMarketHot,
  announceMorningBrief,
  announceVideo,
  announcePagelleOpen,
  announceClubPulse,
  getChannelSettings,
  updateChannelSettings,
  listRecentChannelPosts,
  pinLastKickoff,
  sendChannelPoll,
  verifyChannelConfig,
  type ChannelSettings,
} from '@/lib/telegram/channel'

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://bianconerihub.com').replace(/\/+$/, '')

const HELP = `Comandi BianconeriHub

<b>Articoli</b>
/nuovo — crea un articolo
/modifica — modifica un articolo esistente
/bozze — lista bozze recenti
/cerca &lt;q&gt; — cerca articoli

<b>Canale</b>
/flash &lt;testo&gt; — breaking news
/promuovi — notizia live → bozza
/pubblica_canale — pubblica articolo
/digest — anteprima + invio digest
/mattina — rassegna mattutina
/video_canale — annuncia video
/gallery_canale — galleria foto
/sondaggio_canale — sondaggio 1X2
/rumor — rumors mercato → canale

<b>Partite</b>
/partita — prossime partite + kickoff
/risultato — forza full-time
/gol &lt;testo&gt; — annuncio gol
/pin — pinna ultimo kickoff
/pagelle — crea pagelle partita
/thread — crea thread matchday

<b>Community</b>
/club — conteggio pronostici
/media — prossima foto → gallery

<b>Impostazioni</b>
/quiet on|off — silenziosa
/auto &lt;tipo&gt; on|off — auto-post
/stato — webhook + canale + settings
/test_canale — test solo in redazione
/annulla — interrompe la bozza
/help — questo messaggio`

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
  const [rawCommand, ...rest] = text.trim().split(/\s+/)
  // Strip bot mention, BOM/zero-width, and trailing punctuation from autocomplete
  const command = rawCommand
    .toLowerCase()
    .replace(/@\w+$/u, '')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/[^\w/]/g, '')
  const arg = rest.join(' ').trim()

  if (command === '/start' || command === '/help') {
    await sendMessage(chatId, HELP, { parse_mode: 'HTML' })
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

  if (command === '/promuovi') {
    try {
      const news = await getLiveNews()
      const external = news.filter((n) => !n.editorial).slice(0, 8)
      if (!external.length) {
        await sendMessage(chatId, 'Nessuna notizia live esterna al momento.')
        return
      }
      if (arg) {
        const match = external.find((n) => n.slug === arg || n.title.toLowerCase().includes(arg.toLowerCase()))
        if (!match) {
          await sendMessage(chatId, 'Notizia non trovata. Usa /promuovi senza argomenti per la lista.')
          return
        }
        const sdb = createServiceClient()
        const authorId = process.env.TELEGRAM_DEFAULT_AUTHOR_ID
        if (!authorId) { await sendMessage(chatId, 'TELEGRAM_DEFAULT_AUTHOR_ID non configurato.'); return }
        const result = await promoteLiveNewsToDraft(sdb, match, authorId)
        await sendMessage(chatId, `Bozza creata: <a href="${result.url}">${escapeHtml(result.slug)}</a>\n<a href="${result.adminUrl}">Admin</a>`, { parse_mode: 'HTML' })
        return
      }
      await sendMessage(chatId, 'Scegli notizia da promuovere:', {
        reply_markup: {
          inline_keyboard: external.map((n) => [{ text: truncateLabel(n.title, 48), callback_data: `promote:${n.slug.slice(0, 48)}` }]),
        },
      })
    } catch (e) {
      await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'promuovi fallito'}`)
    }
    return
  }

  if (command === '/flash') {
    if (!arg) { await sendMessage(chatId, 'Usa: /flash <testo breaking>'); return }
    const res = await announceBreaking(arg)
    await sendMessage(chatId, res.ok ? 'Breaking inviato al canale.' : `Non inviato: ${res.reason || 'errore'}`)
    return
  }

  if (command === '/pubblica_canale') {
    const articles = await listRecentArticles(db, 8)
    const published = articles.filter((a) => a.status === 'published')
    if (!published.length) { await sendMessage(chatId, 'Nessun articolo pubblicato recente.'); return }
    await sendMessage(chatId, 'Scegli articolo da annunciare sul canale:', {
      reply_markup: {
        inline_keyboard: published.map((a) => [{ text: truncateLabel(a.title, 48), callback_data: `chanart:${a.slug}` }]),
      },
    })
    return
  }

  if (command === '/partita') {
    try {
      const matches = await getTeamMatches()
      const upcoming = matches.filter((m) => !m.played).slice(0, 5)
      if (!upcoming.length) { await sendMessage(chatId, 'Nessuna partita in programma.'); return }
      const lines = upcoming.map((m) => {
        const d = new Date(m.date)
        const dateStr = d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })
        const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
        return `${m.home} — ${m.away} · ${dateStr} ${m.timeTbd ? '' : timeStr} · ${m.competition}`
      })
      await sendMessage(chatId, `Prossime partite:\n\n${lines.join('\n')}\n\nScegli per annunciare kickoff:`, {
        reply_markup: {
          inline_keyboard: upcoming.map((m) => [{ text: truncateLabel(`${m.home} — ${m.away}`, 40), callback_data: `kickoff:${m.id}` }]),
        },
      })
    } catch (e) {
      await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'partita fallita'}`)
    }
    return
  }

  if (command === '/gol') {
    if (!arg) { await sendMessage(chatId, 'Usa: /gol <descrizione gol>'); return }
    const res = await announceBreaking(`⚽ GOL! ${arg}`)
    await sendMessage(chatId, res.ok ? 'Gol annunciato.' : `Non inviato: ${res.reason || 'errore'}`)
    return
  }

  if (command === '/risultato') {
    try {
      const matches = await getTeamMatches()
      const played = matches.filter((m) => m.played).slice(-5)
      if (!played.length) { await sendMessage(chatId, 'Nessuna partita giocata recente.'); return }
      await sendMessage(chatId, 'Scegli partita per forzare full-time:', {
        reply_markup: {
          inline_keyboard: played.map((m) => [{
            text: truncateLabel(`${m.home} ${m.homeScore}–${m.awayScore} ${m.away}`, 44),
            callback_data: `ft:${m.id}`,
          }]),
        },
      })
    } catch (e) {
      await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'risultato fallito'}`)
    }
    return
  }

  if (command === '/digest') {
    try {
      const news = await getLiveNews()
      const items = news.slice(0, 8).map((n) => ({
        title: n.title,
        url: n.editorial ? `${siteUrl()}/articolo/${n.slug}` : n.url,
      }))
      if (!items.length) { await sendMessage(chatId, 'Nessuna notizia per il digest.'); return }
      const preview = items.map((it, i) => `${i + 1}. ${it.title}`).join('\n')
      await sendMessage(chatId, `Anteprima digest:\n\n${preview}\n\nInviare al canale?`, {
        reply_markup: { inline_keyboard: [[{ text: 'Invia digest', callback_data: 'send_digest' }]] },
      })
    } catch (e) {
      await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'digest fallito'}`)
    }
    return
  }

  if (command === '/mattina') {
    try {
      const news = await getLiveNews()
      const items = news.slice(0, 6).map((n) => ({
        title: n.title,
        url: n.editorial ? `${siteUrl()}/articolo/${n.slug}` : n.url,
      }))
      const res = await announceMorningBrief(items)
      await sendMessage(chatId, res.ok ? 'Rassegna inviata.' : `Non inviata: ${res.reason || 'errore'}`)
    } catch (e) {
      await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'mattina fallita'}`)
    }
    return
  }

  if (command === '/rumor') {
    try {
      const rumors = await getRumors()
      if (!rumors.length) { await sendMessage(chatId, 'Nessun rumor attivo.'); return }
      await sendMessage(chatId, 'Scegli rumor da annunciare:', {
        reply_markup: {
          inline_keyboard: rumors.slice(0, 8).map((r) => [{
            text: truncateLabel(`${r.direction === 'in' ? '🟢' : '🔴'} ${r.player_name}`, 40),
            callback_data: `rumor:${r.id}`,
          }]),
        },
      })
    } catch (e) {
      await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'rumor fallito'}`)
    }
    return
  }

  if (command === '/video_canale') {
    const videos = await listPublishedVideos(db, 8)
    if (!videos.length) { await sendMessage(chatId, 'Nessun video pubblicato.'); return }
    await sendMessage(chatId, 'Scegli video da annunciare sul canale:', {
      reply_markup: {
        inline_keyboard: videos.map((v) => [{ text: truncateLabel(v.title, 40), callback_data: `chanvid:${v.id}` }]),
      },
    })
    return
  }

  if (command === '/gallery_canale') {
    const items = await listPublishedGalleryItems(db, 8)
    if (!items.length) { await sendMessage(chatId, 'Nessun media in gallery.'); return }
    await sendMessage(chatId, 'Scegli media da inviare al canale:', {
      reply_markup: {
        inline_keyboard: items.map((item) => [{
          text: truncateLabel(`${item.media_type === 'video' ? '🎬' : '📷'} ${item.title}`, 40),
          callback_data: `changal:${item.id}`,
        }]),
      },
    })
    return
  }

  if (command === '/sondaggio_canale') {
    try {
      const matches = await getTeamMatches()
      const upcoming = matches.filter((m) => !m.played).slice(0, 5)
      if (!upcoming.length) { await sendMessage(chatId, 'Nessuna partita in programma per il sondaggio.'); return }
      await sendMessage(chatId, 'Scegli partita per il sondaggio 1X2:', {
        reply_markup: {
          inline_keyboard: upcoming.map((m) => [{ text: truncateLabel(`${m.home} — ${m.away}`, 40), callback_data: `poll:${m.id}` }]),
        },
      })
    } catch (e) {
      await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'sondaggio fallito'}`)
    }
    return
  }

  if (command === '/pin') {
    const res = await pinLastKickoff()
    await sendMessage(chatId, res.ok ? `Pinnato messaggio ${res.messageId}` : `Non pinnato: ${res.reason}`)
    return
  }

  if (command === '/quiet') {
    try {
      const settings = await getChannelSettings()
      if (arg === 'on') {
        await updateChannelSettings({ quiet_enabled: true })
        await sendMessage(chatId, 'Modalità silenziosa attivata.')
      } else if (arg === 'off') {
        await updateChannelSettings({ quiet_enabled: false })
        await sendMessage(chatId, 'Modalità silenziosa disattivata.')
      } else if (/^\d{2}[:-]\d{2}$/.test(arg.split(/\s+/)[0] || '')) {
        const parts = arg.split(/\s+/)
        const start = parts[0].replace('-', ':')
        const end = (parts[1] || '08:00').replace('-', ':')
        await updateChannelSettings({ quiet_enabled: true, quiet_start: start, quiet_end: end })
        await sendMessage(chatId, `Silenziosa attiva ${start}–${end}`)
      } else {
        await sendMessage(chatId, `Silenziosa: ${settings.quiet_enabled ? 'ON' : 'OFF'} (${settings.quiet_start}–${settings.quiet_end})\n\nUsa: /quiet on|off oppure /quiet HH:MM HH:MM`)
      }
    } catch (e) {
      await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'quiet fallito'}`)
    }
    return
  }

  if (command === '/auto') {
    try {
      const settings = await getChannelSettings()
      const parts = arg.split(/\s+/)
      const kind = parts[0] || ''
      const toggle = parts[1]?.toLowerCase()
      if (!kind || (toggle !== 'on' && toggle !== 'off')) {
        const lines = Object.entries(settings.auto_kinds).map(([k, v]) => `  ${k}: ${v ? 'on' : 'off'}`)
        await sendMessage(chatId, `Auto-post:\n${lines.join('\n')}\n\nUsa: /auto <tipo> on|off`)
        return
      }
      const autoKinds = { ...settings.auto_kinds, [kind]: toggle === 'on' }
      await updateChannelSettings({ auto_kinds: autoKinds })
      await sendMessage(chatId, `Auto-post ${kind}: ${toggle}`)
    } catch (e) {
      await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'auto fallito'}`)
    }
    return
  }

  if (command === '/stato') {
    try {
      const [webhook, channel, settings, posts] = await Promise.all([
        getWebhookInfo(),
        verifyChannelConfig(),
        getChannelSettings(),
        listRecentChannelPosts(5),
      ])
      const whInfo = webhook as Record<string, unknown>
      const lines = [
        `<b>Webhook:</b> ${whInfo?.url || 'non impostato'}`,
        `<b>Canale:</b> ${channel.ok ? channel.detail : channel.detail || 'non configurato'}`,
        `<b>Silenziosa:</b> ${settings.quiet_enabled ? `ON (${settings.quiet_start}–${settings.quiet_end})` : 'OFF'}`,
        `<b>Digest ore:</b> ${settings.digest_hours.join(', ')}`,
        `<b>Ultimi post:</b> ${posts.length ? posts.map((p) => `${p.kind}:${p.ref_id}`).join(', ') : 'nessuno'}`,
      ]
      await sendMessage(chatId, lines.join('\n'), { parse_mode: 'HTML' })
    } catch (e) {
      await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'stato fallito'}`)
    }
    return
  }

  if (command === '/test_canale') {
    await sendMessage(chatId, 'Test canale: questo messaggio rimane solo qui in redazione. Se riesci a leggerlo, il bot funziona.')
    return
  }

  if (command === '/bozze') {
    const articles = await listRecentArticles(db, 10)
    const drafts = articles.filter((a) => a.status === 'draft')
    if (!drafts.length) { await sendMessage(chatId, 'Nessuna bozza.'); return }
    const lines = drafts.map((a) => `• <b>${escapeHtml(truncateLabel(a.title, 50))}</b>`)
    await sendMessage(chatId, `Bozze recenti:\n\n${lines.join('\n')}`, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: drafts.map((a) => [{ text: truncateLabel(a.title, 44), callback_data: `edit:${a.id}` }]),
      },
    })
    return
  }

  if (command === '/cerca') {
    if (!arg) { await sendMessage(chatId, 'Usa: /cerca <parola chiave>'); return }
    const { data } = await db
      .from('articles')
      .select('id,title,slug,status')
      .or(`title.ilike.%${arg}%,excerpt.ilike.%${arg}%`)
      .order('updated_at', { ascending: false })
      .limit(8)
    const found = data || []
    if (!found.length) { await sendMessage(chatId, `Nessun articolo trovato per "${escapeHtml(arg)}".`); return }
    const lines = found.map((a: any) => `• ${a.status === 'draft' ? '📝 ' : ''}${escapeHtml(truncateLabel(a.title, 50))}`)
    await sendMessage(chatId, `Risultati per "${escapeHtml(arg)}":\n\n${lines.join('\n')}`, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: found.map((a: any) => [{ text: truncateLabel(a.title, 44), callback_data: `edit:${a.id}` }]),
      },
    })
    return
  }

  if (command === '/thread') {
    try {
      const matches = await getTeamMatches()
      const upcoming = matches.filter((m) => !m.played).slice(0, 6)
      const recent = matches.filter((m) => m.played).slice(-3)
      const choices = [...upcoming, ...recent]
      if (!choices.length) {
        await sendMessage(chatId, 'Nessuna partita disponibile per il thread matchday.')
        return
      }
      await sendMessage(chatId, 'Scegli la partita per aprire/annunciare il thread forum:', {
        reply_markup: {
          inline_keyboard: choices.map((m) => [{
            text: truncateLabel(`${m.home} — ${m.away}`, 44),
            callback_data: `thread:${m.id}`,
          }]),
        },
      })
    } catch (e) {
      await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'thread fallito'}`)
    }
    return
  }

  if (command === '/pagelle') {
    try {
      const matches = await getTeamMatches()
      const played = matches.filter((m) => m.played).slice(-5)
      if (!played.length) { await sendMessage(chatId, 'Nessuna partita giocata recente.'); return }
      await sendMessage(chatId, 'Scegli partita per le pagelle:', {
        reply_markup: {
          inline_keyboard: played.map((m) => [{
            text: truncateLabel(`${m.home} ${m.homeScore}–${m.awayScore} ${m.away}`, 44),
            callback_data: `pagelle:${m.id}`,
          }]),
        },
      })
    } catch (e) {
      await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'pagelle fallite'}`)
    }
    return
  }

  if (command === '/media') {
    const session: TelegramSession = { chat_id: chatId, step: 'idle' as any, draft: { mode: 'create' } }
    await saveSession(db, { ...session, step: 'idle' as any, draft: { ...session.draft, _mediaNext: true } as any })
    await sendMessage(chatId, 'Prossima foto che invii verrà annunciata come gallery sul canale. Mandami la foto ora.')
    return
  }

  if (command === '/club') {
    try {
      const sdb = createServiceClient()
      const { count } = await sdb
        .from('community_predictions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      await sendMessage(chatId, `Pronostici community (ultimi 7 giorni): <b>${count ?? 0}</b>`, { parse_mode: 'HTML' })
    } catch (e) {
      await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'club fallito'}`)
    }
    return
  }

  await sendMessage(chatId, 'Comando non riconosciuto. Usa /help', { parse_mode: 'HTML' })
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

    // ── Channel callbacks ──

    if (data.startsWith('promote:')) {
      try {
        const slug = data.slice(8)
        const news = await getLiveNews()
        const match = news.find((n) => n.slug.startsWith(slug))
        if (!match) { await sendMessage(chatId, 'Notizia non trovata.'); return }
        const sdb = createServiceClient()
        const authorId = process.env.TELEGRAM_DEFAULT_AUTHOR_ID
        if (!authorId) { await sendMessage(chatId, 'TELEGRAM_DEFAULT_AUTHOR_ID non configurato.'); return }
        const result = await promoteLiveNewsToDraft(sdb, match, authorId)
        await sendMessage(chatId, `Bozza creata: <a href="${result.url}">${escapeHtml(result.slug)}</a>\n<a href="${result.adminUrl}">Admin</a>`, { parse_mode: 'HTML' })
      } catch (e) {
        await sendMessage(chatId, `Errore promozione: ${e instanceof Error ? e.message : 'fallito'}`)
      }
      return
    }

    if (data.startsWith('chanart:')) {
      try {
        const slug = data.slice(8)
        const article = await findArticleForEdit(db, slug)
        if (!article) { await sendMessage(chatId, 'Articolo non trovato.'); return }
        const site = siteUrl()
        const url = `${site}/articolo/${article.slug}`
        const res = await (await import('@/lib/telegram/channel')).announcePublishedArticle({
          title: article.title,
          excerpt: article.excerpt || undefined,
          url,
          cover_image: article.cover_image,
        })
        await sendMessage(chatId, res.ok ? `Articolo annunciato sul canale.` : `Non inviato: ${res.reason || 'errore'}`)
      } catch (e) {
        await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'chanart fallito'}`)
      }
      return
    }

    if (data.startsWith('kickoff:')) {
      try {
        const matchId = Number(data.slice(8))
        const matches = await getTeamMatches()
        const match = matches.find((m) => m.id === matchId)
        if (!match) { await sendMessage(chatId, 'Partita non trovata.'); return }
        const res = await announceKickoff(match)
        await sendMessage(chatId, res.ok ? 'Kickoff annunciato.' : `Non inviato: ${res.reason || 'errore'}`)
      } catch (e) {
        await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'kickoff fallito'}`)
      }
      return
    }

    if (data.startsWith('ft:')) {
      try {
        const matchId = Number(data.slice(3))
        const matches = await getTeamMatches()
        const match = matches.find((m) => m.id === matchId)
        if (!match) { await sendMessage(chatId, 'Partita non trovata.'); return }
        const res = await announceFulltime(match)
        await sendMessage(chatId, res.ok ? 'Full-time annunciato.' : `Non inviato: ${res.reason || 'errore'}`)
      } catch (e) {
        await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'ft fallito'}`)
      }
      return
    }

    if (data === 'send_digest') {
      try {
        const news = await getLiveNews()
        const items = news.slice(0, 8).map((n) => ({
          title: n.title,
          url: n.editorial ? `${siteUrl()}/articolo/${n.slug}` : n.url,
        }))
        const res = await announceLiveDigest(items)
        await sendMessage(chatId, res.ok ? 'Digest inviato al canale.' : `Non inviato: ${res.reason || 'errore'}`)
      } catch (e) {
        await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'digest fallito'}`)
      }
      return
    }

    if (data.startsWith('rumor:')) {
      try {
        const rumorId = data.slice(6)
        const rumors = await getRumors()
        const rumor = rumors.find((r) => r.id === rumorId)
        if (!rumor) { await sendMessage(chatId, 'Rumor non trovato.'); return }
        const res = await announceMarketHot(rumor)
        await sendMessage(chatId, res.ok ? 'Rumor annunciato sul canale.' : `Non inviato: ${res.reason || 'errore'}`)
      } catch (e) {
        await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'rumor fallito'}`)
      }
      return
    }

    if (data.startsWith('chanvid:')) {
      try {
        const videoId = data.slice(8)
        const { data: video, error } = await db
          .from('videos')
          .select('id,title,thumbnail,video_url')
          .eq('id', videoId)
          .eq('is_published', true)
          .maybeSingle()
        if (error) throw error
        if (!video) { await sendMessage(chatId, 'Video non trovato.'); return }
        const res = await announceVideo(video)
        await sendMessage(chatId, res.ok ? 'Video annunciato sul canale.' : `Non inviato: ${res.reason || 'errore'}`)
      } catch (e) {
        await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'chanvid fallito'}`)
      }
      return
    }

    if (data.startsWith('changal:')) {
      try {
        const galId = data.slice(8)
        const { data: item, error } = await db
          .from('gallery_items')
          .select('id,title,media_url,media_type')
          .eq('id', galId)
          .maybeSingle()
        if (error) throw error
        if (!item) { await sendMessage(chatId, 'Media non trovato.'); return }
        const chId = channelChatId()
        if (!chId) { await sendMessage(chatId, 'Canale non configurato.'); return }
        if (item.media_type === 'video' && item.media_url) {
          await sendMessage(chId, `🎬 <b>${escapeHtml(item.title)}</b>\n\n${item.media_url}`, { parse_mode: 'HTML', disable_web_page_preview: false })
        } else if (item.media_url) {
          await sendPhoto(chId, item.media_url, { caption: `📷 <b>${escapeHtml(item.title)}</b>`, parse_mode: 'HTML' })
        }
        await sendMessage(chatId, 'Gallery media inviato al canale.')
      } catch (e) {
        await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'gallery fallita'}`)
      }
      return
    }

    if (data.startsWith('poll:')) {
      try {
        const matchId = Number(data.slice(5))
        const matches = await getTeamMatches()
        const match = matches.find((m) => m.id === matchId)
        if (!match) { await sendMessage(chatId, 'Partita non trovata.'); return }
        const question = `${match.home} — ${match.away}: chi vince?`
        const options = [`1 (${match.home})`, 'X (Pareggio)', `2 (${match.away})`]
        const res = await sendChannelPoll(question, options, { refId: `poll:${matchId}` })
        await sendMessage(chatId, res.ok ? 'Sondaggio inviato al canale.' : `Non inviato: ${res.reason || 'errore'}`)
      } catch (e) {
        await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'sondaggio fallito'}`)
      }
      return
    }

    if (data.startsWith('pagelle:')) {
      try {
        const matchId = Number(data.slice(8))
        const matches = await getTeamMatches()
        const match = matches.find((m) => m.id === matchId)
        if (!match) { await sendMessage(chatId, 'Partita non trovata.'); return }
        const sdb = createServiceClient()
        const { data: existing } = await sdb.from('pagelle_matches').select('id').eq('match_id', String(matchId)).maybeSingle()
        if (!existing) {
          const { error } = await sdb.from('pagelle_matches').insert([{
            match_id: String(matchId),
            home_team: match.home,
            away_team: match.away,
            home_score: match.played ? match.homeScore : null,
            away_score: match.played ? match.awayScore : null,
            competition: match.competition,
            match_date: match.date,
            is_active: true,
          }])
          if (error) throw error
        } else {
          await sdb.from('pagelle_matches').update({ is_active: true }).eq('id', existing.id)
        }
        const res = await announcePagelleOpen(match)
        await sendMessage(chatId, res.ok ? 'Pagelle create e annunciate.' : `Pagelle create. Canale: ${res.reason || 'non inviato'}`)
      } catch (e) {
        await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'pagelle fallite'}`)
      }
      return
    }

    if (data.startsWith('thread:')) {
      try {
        const matchId = Number(data.slice(7))
        const matches = await getTeamMatches()
        const match = matches.find((m) => m.id === matchId)
        if (!match) { await sendMessage(chatId, 'Partita non trovata.'); return }
        const { ensureMatchThread } = await import('@/lib/match-thread')
        const { announceForumHighlight } = await import('@/lib/telegram/channel')
        const thread = await ensureMatchThread({ matchId: String(match.id), home: match.home, away: match.away })
        const url = `${siteUrl()}/community/forum/${thread.id}`
        const res = await announceForumHighlight(`Discussione aperta: ${match.home} — ${match.away}`, url)
        await sendMessage(
          chatId,
          `Thread pronto.\n<a href="${escapeHtml(url)}">Apri forum</a>${res.ok ? '\nAnnuncio canale inviato.' : `\nCanale: ${res.reason || 'non inviato'}`}`,
          { parse_mode: 'HTML' },
        )
      } catch (e) {
        await sendMessage(chatId, `Errore: ${e instanceof Error ? e.message : 'thread fallito'}`)
      }
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
    await sendMessage(chatId, 'Usa /help per i comandi disponibili.')
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
