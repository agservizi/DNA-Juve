'use client'

import Link from 'next/link'
import { CookiePreferencesButton } from '@/components/cookie-consent'

const telegramUrl = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL || ''
const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL || ''

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
      <path d="M21.8 4.2 2.9 11.5c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.9 5.7c.2.7.4.9 1 .9.6 0 .9-.3 1.2-.6l2.7-2.6 5.1 3.8c.9.5 1.6.2 1.8-.9L23.4 5.7c.3-1.3-.5-1.9-1.6-1.5ZM9.6 14.4l-.3 3.6 1.7-2.7 7.9-7.1-9.3 6.2Z" />
    </svg>
  )
}

export function SiteFooter() {
  return (
    <div className="global-footer">
      <footer className="site-footer">
        <div>
          <Link className="footer-brand" href="/">
            BIANCONERI<span>HUB</span>
          </Link>
          <p>Il blog digitale dedicato alla Juventus. Analisi, notizie, mercato e community bianconera.</p>
          {instagramUrl ? (
            <div className="footer-social" aria-label="Seguici">
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            </div>
          ) : null}
        </div>
        <div className="footer-links">
          <Link href="/gallery">Gallery</Link>
          <Link href="/chi-siamo">Chi siamo</Link>
          <Link href="/contatti">Contatti</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/cookie-policy">Cookie</Link>
          <CookiePreferencesButton />
        </div>
        <div className="footer-bottom">
          <small>Â© {new Date().getFullYear()} BianconeriHub. Blog indipendente non affiliato con Juventus F.C.</small>
          {telegramUrl ? (
            <a
              className="footer-telegram"
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Canale Telegram BianconeriHub"
            >
              <TelegramIcon />
            </a>
          ) : null}
        </div>
      </footer>
    </div>
  )
}
