import type { SupabaseClient } from '@supabase/supabase-js'
import type { LiveNews } from '@/lib/live-news'
import { liveNewsParagraphs } from '@/lib/live-news'
import { createArticleFromTelegram } from '@/lib/telegram/publish'

async function getNotizieCategoryId(db: SupabaseClient) {
  const { data } = await db.from('categories').select('id').eq('slug', 'notizie').maybeSingle()
  return data?.id || null
}

export async function promoteLiveNewsToDraft(db: SupabaseClient, live: LiveNews, authorId: string) {
  const title = String(live.title || '').trim()
  if (!title) throw new Error('Notizia live senza titolo')

  const { data: existing } = await db
    .from('articles')
    .select('id,slug,status')
    .eq('source_url', live.url)
    .maybeSingle()
  if (existing?.id && existing?.slug) {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bianconerihub.com').replace(/\/+$/, '')
    return {
      id: existing.id as string,
      slug: existing.slug as string,
      status: existing.status as string,
      url: `${siteUrl}/articolo/${existing.slug}`,
      adminUrl: `${siteUrl}/admin/articoli/${existing.id}/modifica`,
    }
  }

  const paragraphs = liveNewsParagraphs(live)
  const content = [...paragraphs, `Fonte originale: ${live.source}${live.url ? `\n${live.url}` : ''}`]
    .filter(Boolean)
    .join('\n\n')
  const excerpt = String(live.description || paragraphs[0] || title).trim()
  const categoryId = await getNotizieCategoryId(db)

  return createArticleFromTelegram(db, {
    title,
    excerpt,
    content,
    cover_image: live.image || undefined,
    category_id: categoryId || undefined,
    author_id: authorId,
    source_url: live.url,
    internal_notes: `Promosso da Notizie Live · fonte ${live.source}`,
    status: 'draft',
    featured: false,
  })
}
