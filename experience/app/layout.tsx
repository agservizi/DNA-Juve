import type { Metadata, Viewport } from 'next'
import { ViewTransitions } from 'next-view-transitions'
import { ExperienceProviders } from '@/components/experience-providers'
import { SiteChrome } from '@/components/site-chrome'
import { CookieConsent } from '@/components/cookie-consent'
import './globals.css'
import { Instrument_Serif, Manrope } from 'next/font/google'
import { cn } from '@/lib/utils'

const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const sans = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bianconerihub.com').replace(/\/+$/, '')

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'BianconeriHub', template: '%s · BianconeriHub' },
  description: 'Notizie, memoria e community juventina in un’esperienza digitale immersiva.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    type: 'website',
    siteName: 'BianconeriHub',
    locale: 'it_IT',
    images: ['/og-default.svg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BianconeriHub',
    description: 'Notizie, memoria e community juventina in un’esperienza digitale immersiva.',
    images: ['/og-default.svg'],
  },
  alternates: {
    types: {
      'application/rss+xml': [{ url: '/feed.xml', title: 'BianconeriHub RSS' }],
    },
  },
}

export const viewport: Viewport = { themeColor: '#050505', colorScheme: 'dark' }

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'BianconeriHub',
      url: siteUrl,
      logo: `${siteUrl}/favicon.svg`,
      sameAs: [
        process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL,
        process.env.NEXT_PUBLIC_INSTAGRAM_URL,
      ].filter(Boolean),
    },
    {
      '@type': 'WebSite',
      name: 'BianconeriHub',
      url: siteUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/cerca?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ViewTransitions>
      <html lang="it" className={cn('font-sans', display.variable, sans.variable)}>
        <body>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
          />
          <SiteChrome position="before" />
          <ExperienceProviders>{children}</ExperienceProviders>
          <SiteChrome position="after" />
          <CookieConsent />
        </body>
      </html>
    </ViewTransitions>
  )
}
