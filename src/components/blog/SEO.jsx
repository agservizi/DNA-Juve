import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'BianconeriHub'
const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://bianconerihub.com').replace(/\/+$/, '')
const DEFAULT_IMAGE = `${SITE_URL}/og-default.png`
const DEFAULT_DESCRIPTION = 'Il magazine digitale dedicato alla Juventus. Analisi, notizie, mercato e tanto altro dalla redazione bianconera.'

function normalizeAbsoluteUrl(value, fallbackPath = '') {
  if (!value) return fallbackPath ? `${SITE_URL}${fallbackPath}` : SITE_URL
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('/')) return `${SITE_URL}${value}`
  return `${SITE_URL}/${value}`
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
  // Article-specific for JSON-LD
  articleData,
}) {
  const resolvedTitle = metaTitle || title
  const resolvedDescription = metaDescription || description || DEFAULT_DESCRIPTION
  const fullTitle = resolvedTitle ? `${resolvedTitle} | ${SITE_NAME}` : `${SITE_NAME} — Il Magazine Bianconero`
  const canonicalUrl = normalizeAbsoluteUrl(canonical || url, '')
  const resolvedOgImage = normalizeAbsoluteUrl(ogImage || image || DEFAULT_IMAGE)

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
        },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
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
      }
    : {
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

  const breadcrumbJsonLd = breadcrumbs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: normalizeAbsoluteUrl(crumb.url),
        })),
      }
    : null

  const jsonLd = breadcrumbJsonLd ? [baseJsonLd, breadcrumbJsonLd] : [baseJsonLd]

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:image" content={resolvedOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content="it_IT" />

      {/* Article specific */}
      {type === 'article' && publishedAt && <meta property="article:published_time" content={publishedAt} />}
      {type === 'article' && modifiedAt && <meta property="article:modified_time" content={modifiedAt} />}
      {type === 'article' && author && <meta property="article:author" content={author} />}
      {type === 'article' && category && <meta property="article:section" content={category} />}
      {type === 'article' && tags.map(tag => <meta key={tag} property="article:tag" content={tag} />)}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@BianconeriHub" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={resolvedOgImage} />

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
