import styles from './public-shell.module.css'

export function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className={styles.page}>
    <main className={styles.main} id="contenuto">{children}</main>
  </div>
}
