import { Link } from 'next-view-transitions'
import { CookiePreferencesButton } from '@/components/cookie-consent'

export function SiteFooter() {
  return <div className="global-footer">
    <footer className="site-footer">
      <div>
        <Link className="footer-brand" href="/">BIANCONERI<span>HUB</span></Link>
        <p>Il blog digitale dedicato alla Juventus. Analisi, notizie, mercato e community bianconera.</p>
      </div>
      <div className="footer-links">
        <Link href="/gallery">Gallery</Link>
        <Link href="/chi-siamo">Chi siamo</Link>
        <Link href="/contatti">Contatti</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/cookie-policy">Cookie</Link>
        <CookiePreferencesButton />
      </div>
      <small>© {new Date().getFullYear()} BianconeriHub. Blog indipendente non affiliato con Juventus F.C.</small>
    </footer>
  </div>
}
