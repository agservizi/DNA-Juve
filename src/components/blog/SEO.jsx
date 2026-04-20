import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'BianconeriHub'
const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://bianconerihub.com').replace(/\/+$/, '')
const DEFAULT_IMAGE = `${SITE_URL}/og-default.png`
const DEFAULT_DESCRIPTION = 'Il magazine digitale dedicato alla Juventus. Analisi, notizie, mercato e tanto altro dalla redazione bianconera.'
const SITE_TWITTER = '@BianconeriHub'
const ORGANIZATION_NAME = 'BianconeriHub'

function normalizeAbsoluteUrl(value, fallbackPath = '') {
  if (!value) return fallbackPath ? `${SITE_URL}${fallbackPath}` : SITE_URL
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('/')) return `${SITE_URL}${value}`
  return `${SITE_URL}/${value}`
}

function uniqueStrings(values = []) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)))
}

function buildSeoTitle(value = '') {
  const normalized = String(value || '').trim()
  if (!normalized) return `${SITE_NAME} — Il Magazine Bianconero`
  return normalized.toLowerCase().includes(SITE_NAME.toLowerCase()) ? normalized : `${normalized} | ${SITE_NAME}`
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  metaTitle,
  metaDescription,
  canonical,
  ogImage,
  type = 'website',
  publishedAt,
  modifiedAt,
  author,
  category,
  tags = [],
  noindex = false,
  breadcrumbs = [],
  categorySlug,
  keywords = [],
  pageType = 'webpage',
  itemList = [],
  authorUrl,
  authorImage,
  authorDescription,
  authorLinks = [],
  ogImageAlt,
  // Article-specific for JSON-LD
  articleData,
}) {
  const resolvedTitle = metaTitle || title
  const resolvedDescription = metaDescription || description || DEFAULT_DESCRIPTION
  const fullTitle = buildSeoTitle(resolvedTitle)
  const canonicalUrl = normalizeAbsoluteUrl(canonical || url, '')
  const resolvedOgImage = normalizeAbsoluteUrl(ogImage || image || DEFAULT_IMAGE)
  const resolvedKeywords = uniqueStrings([
    ...keywords,
    ...tags,
    category,
    resolvedTitle,
    'Juventus',
    'BianconeriHub',
  ])
  const normalizedItemList = itemList
    .map((item) => ({
      name: String(item?.name || '').trim(),
      url: normalizeAbsoluteUrl(item?.url || ''),
    }))
    .filter((item) => item.name && item.url)

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORGANIZATION_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/favicon.svg`,
    },
  }

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/cerca?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  const webpageJsonLd = {
    '@context': 'https://schema.org',
    '@type': pageType === 'collection' ? 'CollectionPage' : pageType === 'profile' ? 'ProfilePage' : 'WebPage',
    name: resolvedTitle || title || SITE_NAME,
    description: resolvedDescription,
    url: canonicalUrl,
    inLanguage: 'it-IT',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    primaryImageOfPage: resolvedOgImage ? {
      '@type': 'ImageObject',
      url: resolvedOgImage,
    } : undefined,
    breadcrumb: breadcrumbs.length ? {
      '@id': `${canonicalUrl}#breadcrumb`,
    } : undefined,
  }

  // JSON-LD structured data
  const baseJsonLd = type === 'article' && articleData
    ? {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: resolvedTitle || title,
        description: resolvedDescription,
        image: resolvedOgImage,
        datePublished: publishedAt,
        dateModified: modifiedAt || publishedAt,
        author: {
          '@type': 'Person',
          name: author || 'Redazione BianconeriHub',
          url: authorUrl ? normalizeAbsoluteUrl(authorUrl) : undefined,
          image: authorImage ? normalizeAbsoluteUrl(authorImage) : undefined,
        },
        publisher: {
          '@type': 'Organization',
          name: ORGANIZATION_NAME,
          logo: {
            '@type': 'ImageObject',
            url: `${SITE_URL}/favicon.svg`,
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
        articleSection: category,
        keywords: tags.join(', '),
        url: canonicalUrl,
        articleBody: resolvedDescription,
        wordCount: articleData?.content ? String(articleData.content).replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length : undefined,
        isAccessibleForFree: true,
        about: tags.length ? tags.map((tag) => ({ '@type': 'Thing', name: tag })) : undefined,
      }
    : pageType === 'collection' && normalizedItemList.length
      ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: normalizedItemList.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          url: item.url,
        })),
      }
      : pageType === 'profile'
        ? {
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: resolvedTitle || title || 'Autore',
          description: authorDescription || resolvedDescription,
          image: authorImage ? normalizeAbsoluteUrl(authorImage) : undefined,
          url: canonicalUrl,
          sameAs: authorLinks.map((link) => normalizeAbsoluteUrl(link)).filter(Boolean),
        }
        : webpageJsonLd

  const breadcrumbJsonLd = breadcrumbs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: normalizeAbsoluteUrl(crumb.url),
        })),
      }
    : null

  const jsonLd = [
    organizationJsonLd,
    ...(pageType === 'website' ? [websiteJsonLd] : []),
    ...(type === 'article' || pageType !== 'website' ? [webpageJsonLd] : []),
    baseJsonLd,
    ...(breadcrumbJsonLd ? [breadcrumbJsonLd] : []),
  ].filter(Boolean)

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={resolvedDescription} />
      {resolvedKeywords.length > 0 && <meta name="keywords" content={resolvedKeywords.join(', ')} />}
      {type === 'article' && resolvedKeywords.length > 0 && <meta name="news_keywords" content={resolvedKeywords.slice(0, 12).join(', ')} />}
      {author && <meta name="author" content={author} />}
      {publishedAt && <meta name="date" content={publishedAt} />}
      {modifiedAt && <meta name="last-modified" content={modifiedAt} />}
      <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'} />
      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hrefLang="it" href={canonicalUrl} />
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:image" content={resolvedOgImage} />
      <meta property="og:image:alt" content={ogImageAlt || resolvedTitle || title || SITE_NAME} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content="it_IT" />

      {/* Article specific */}
      {type === 'article' && publishedAt && <meta property="article:published_time" content={publishedAt} />}
      {type === 'article' && modifiedAt && <meta property="article:modified_time" content={modifiedAt} />}
      {modifiedAt && <meta property="og:updated_time" content={modifiedAt} />}
      {type === 'article' && author && <meta property="article:author" content={author} />}
      {type === 'article' && category && <meta property="article:section" content={category} />}
      {type === 'article' && tags.map(tag => <meta key={tag} property="article:tag" content={tag} />)}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={SITE_TWITTER} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={resolvedOgImage} />
      <meta name="twitter:image:alt" content={ogImageAlt || resolvedTitle || title || SITE_NAME} />

      {/* RSS Feed */}
      <link rel="alternate" type="application/rss+xml" title={`${SITE_NAME} RSS Feed`} href={`${SITE_URL}/feed.xml`} />
      {categorySlug && <link rel="alternate" type="application/rss+xml" title={`${SITE_NAME} — ${category || categorySlug} RSS`} href={`${SITE_URL}/feed/${categorySlug}.xml`} />}

      {/* Theme */}
      <meta name="theme-color" content="#000000" />

      {/* JSON-LD */}
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  )
}
