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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3020'),
  title: { default: 'BianconeriHub', template: '%s · BianconeriHub' },
  description: 'Notizie, memoria e community juventina in un’esperienza digitale immersiva.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/favicon.svg' },
  openGraph: { images: ['/og-default.svg'] },
}

export const viewport: Viewport = { themeColor: '#050505', colorScheme: 'dark' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ViewTransitions>
      <html lang="it" className={cn('font-sans', display.variable, sans.variable)}>
        <body>
          <SiteChrome position="before" />
          <ExperienceProviders>{children}</ExperienceProviders>
          <SiteChrome position="after" />
          <CookieConsent />
        </body>
      </html>
    </ViewTransitions>
  )
}
