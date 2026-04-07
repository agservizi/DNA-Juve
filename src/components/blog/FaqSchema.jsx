import { Helmet } from 'react-helmet-async'

/**
 * Extracts FAQ pairs from article HTML content.
 * A FAQ pair is a heading (h2/h3) that ends with "?" followed by
 * paragraph(s) that serve as the answer.
 */
function extractFaqFromHtml(html) {
  if (!html || typeof document === 'undefined') return []

  const div = document.createElement('div')
  div.innerHTML = html

  const faqs = []
  const children = Array.from(div.children)

  for (let i = 0; i < children.length; i++) {
    const el = children[i]
    const tag = el.tagName?.toLowerCase()

    if ((tag === 'h2' || tag === 'h3') && el.textContent?.trim().endsWith('?')) {
      const question = el.textContent.trim()
      const answerParts = []

      // Collect all following <p> elements until the next heading
      for (let j = i + 1; j < children.length; j++) {
        const next = children[j]
        const nextTag = next.tagName?.toLowerCase()
        if (nextTag === 'h1' || nextTag === 'h2' || nextTag === 'h3') break
        if (nextTag === 'p' && next.textContent?.trim()) {
          answerParts.push(next.textContent.trim())
        }
      }

      if (answerParts.length > 0) {
        faqs.push({ question, answer: answerParts.join(' ') })
      }
    }
  }

  return faqs
}

export default function FaqSchema({ content }) {
  const faqs = extractFaqFromHtml(content)

  if (faqs.length < 1) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  )
}

export { extractFaqFromHtml }
