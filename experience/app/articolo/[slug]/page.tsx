import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import sanitizeHtml from 'sanitize-html'
import { ArticleExperience } from '@/components/article-experience'
import { promoteLikelyParagraphHeadings } from '@/lib/article-headings'
import { getArticleBySlug, getArticleSidebar } from '@/lib/content'
import { getRumors, getTeamMatches } from '@/lib/match-market-content'
import { authorSlug } from '@/lib/editorial-content'

type Props = { params: Promise<{ slug: string }> }

function faqJsonLd(content: string) {
  const blocks = Array.from(content.matchAll(/<(h[23])[^>]*>([\s\S]*?)<\/\1>([\s\S]*?)(?=<h[123]\b|$)/gi))
  const entries = blocks.map(([, , heading, following]) => {
    const question = sanitizeHtml(heading, { allowedTags: [], allowedAttributes: {} }).trim()
    if (!question.endsWith('?')) return null
    const answers = Array.from(following.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
      .map((match) => sanitizeHtml(match[1], { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    return answers.length ? { question, answer: answers.join(' ') } : null
  }).filter((entry): entry is { question: string; answer: string } => Boolean(entry))
  if (!entries.length) return null
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: entries.map((entry) => ({ '@type': 'Question', name: entry.question, acceptedAnswer: { '@type': 'Answer', text: entry.answer } })) }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { article, tags } = await getArticleBySlug(slug)
  if (!article) return { title: 'Articolo non trovato' }
  return {
    title: article.meta_title || article.title,
    description: article.meta_description || article.excerpt || undefined,
    robots: article.noindex ? { index: false, follow: false } : undefined,
    keywords: tags.map((tag) => tag.name),
    alternates: { canonical: article.canonical_url || `/articolo/${article.slug}` },
    openGraph: {
      type: 'article', title: article.title, description: article.excerpt || undefined,
      images: (article.og_image || article.cover_image) ? [{ url: article.og_image || article.cover_image || '' }] : undefined,
      publishedTime: article.published_at,
      modifiedTime: article.updated_at || undefined,
      authors: article.profiles?.username ? [article.profiles.username] : undefined,
    },
  }
}

export const dynamic = 'force-dynamic'

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const [{ article, related, tags }, sidebar, matches, rumors] = await Promise.all([getArticleBySlug(slug), getArticleSidebar(), getTeamMatches(), getRumors()])
  if (!article) notFound()
  const sanitizedContent = sanitizeHtml(article.content || '', {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'figure', 'figcaption', 'iframe', 'video', 'source']).filter((tag) => !['pre', 'code', 'tt', 'kbd', 'samp'].includes(tag)),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['class', 'id', 'data-video-id', 'data-video-title', 'data-video-platform', 'data-video-videoid', 'data-video-url', 'data-video-thumbnail'],
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      iframe: ['src', 'title', 'width', 'height', 'allow', 'allowfullscreen', 'loading'],
      video: ['src', 'poster', 'controls', 'preload'],
      source: ['src', 'type'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
      img: sanitizeHtml.simpleTransform('img', { loading: 'lazy' }, true),
      pre: 'div',
      code: 'span',
      font: 'span',
    },
  }).replace(/\s(?:style|face)=("|')[\s\S]*?\1/gi, '')
    .replace(/<\/?pre\b[^>]*>/gi, '')
    .replace(/\sclass="(?:PDq2pG_[^"]*|Apple-style-span)"/gi, '')
  const consentSafeContent = promoteLikelyParagraphHeadings(sanitizedContent).replace(/<iframe\b([^>]*)src=(['"])(.*?)\2([^>]*)><\/iframe>/gi, (_match, before, _quote, src, after) => {
    const title = `${before} ${after}`.match(/title=(['"])(.*?)\1/i)?.[2] || 'Video articolo'
    return `<div class="article-video-consent" data-external-video data-src="${sanitizeHtml(src,{allowedTags:[],allowedAttributes:{}})}" data-title="${sanitizeHtml(title,{allowedTags:[],allowedAttributes:{}})}"></div>`
  })
  let headingIndex = 0
  const contentWithIds = consentSafeContent.replace(/<(h[123])([^>]*)>/gi, (_match, tag, attrs) => `<${tag}${attrs.replace(/\sid=(['"]).*?\1/i, '')} id="heading-${headingIndex++}">`)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bianconerihub.com'
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'NewsArticle', headline: article.title,
    description: article.meta_description || article.excerpt || undefined,
    image: article.og_image || article.cover_image || undefined,
    datePublished: article.published_at, dateModified: article.updated_at || article.published_at,
    author: { '@type': 'Person', name: article.profiles?.username || 'Redazione', url: article.profiles?.username ? `${siteUrl}/autore/${authorSlug(article.profiles.username)}` : undefined },
    publisher: { '@type': 'Organization', name: 'BianconeriHub', url: siteUrl },
    mainEntityOfPage: article.canonical_url || `${siteUrl}/articolo/${article.slug}`,
    articleSection: article.categories?.name, keywords: tags.map((tag) => tag.name).join(', '),
  }
  const faq = faqJsonLd(sanitizedContent)
  const nextMatch = matches.filter((match) => !match.played && new Date(match.date) > new Date()).sort((a,b) => +new Date(a.date)-+new Date(b.date))[0] || null
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />{faq&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faq).replace(/</g,'\\u003c')}}/>}<ArticleExperience article={{ ...article, content: contentWithIds }} related={related} tags={tags} sidebar={sidebar} nextMatch={nextMatch} rumor={rumors[0] || null} /></>
}
