'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import s from './editorial-premium.module.css'
export function EditorialSearchForm({ query }: { query: string }) {
  const [value, setValue] = useState(query), router = useRouter()
  return <form className={s.premiumSearch} role="search" data-premium-intro onSubmit={e => { e.preventDefault(); if (value.trim()) router.push(`/cerca?q=${encodeURIComponent(value.trim())}`) }}>
    <label htmlFor="editorial-search">Cosa vuoi cercare?</label><div className={s.searchMachine}><span aria-hidden="true">⌕</span><input id="editorial-search" value={value} onChange={e => setValue(e.target.value)} placeholder="Del Piero, Champions, mercato…" autoComplete="off"/><button type="submit"><b>Cerca</b><i aria-hidden="true">↗︎</i></button></div>
  </form>
}
