'use client'

import { Link } from 'next-view-transitions'
import { CookiePreferencesButton } from '@/components/cookie-consent'
import { NewsletterCapture } from '@/components/newsletter-capture'

const telegramUrl = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL || ''
const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL || ''

export function SiteFooter() {
  return (
    <div className="global-footer">
      <footer className="site-footer">
        <div>
          <Link className="footer-brand" href="/">
            BIANCONERI<span>HUB</span>
          </Link>
          <p>Il blog digitale dedicato alla Juventus. Analisi, notizie, mercato e community bianconera.</p>
          {(telegramUrl || instagramUrl) && (
            <div className="footer-social" aria-label="Seguici">
              {telegramUrl && (
                <a href={telegramUrl} target="_blank" rel="noopener noreferrer">
                  Telegram
                </a>
              )}
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
                  Instagram
                </a>
              )}
            </div>
          )}
        </div>
        <div className="footer-links">
          <Link href="/gallery">Gallery</Link>
          <Link href="/chi-siamo">Chi siamo</Link>
          <Link href="/contatti">Contatti</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/cookie-policy">Cookie</Link>
          <CookiePreferencesButton />
        </div>
        <div className="footer-newsletter">
          <NewsletterCapture compact />
        </div>
        <small>© {new Date().getFullYear()} BianconeriHub. Blog indipendente non affiliato con Juventus F.C.</small>
      </footer>
    </div>
  )
}
