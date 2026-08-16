import Link from 'next/link'
import { PublicShell } from '@/components/public-shell'
import styles from '@/components/institutional.module.css'
export default function NotFound(){return <PublicShell><div className={`${styles.content} ${styles.notFound}`}><strong>404</strong><h1>Questa pagina non esiste</h1><p>L&apos;articolo o la pagina che stai cercando potrebbe essere stata rimossa, rinominata o temporaneamente non disponibile.</p><div className={styles.actions}><Link className={styles.cta} href="/">Home</Link><Link className={styles.cta} href="/cerca">Cerca articoli</Link></div></div></PublicShell>}
