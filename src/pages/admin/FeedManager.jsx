import { motion } from 'framer-motion'
import { Rss, Map, ExternalLink, Copy, Check } from 'lucide-react'
import { useState } from 'react'

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://bianconerihub.com'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handle} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-juve-black transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copiato' : 'Copia'}
    </button>
  )
}

export default function FeedManager() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-black">RSS Feed & Sitemap</h1>
        <p className="text-sm text-gray-500 mt-1">Link per indicizzazione e lettori RSS</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {/* RSS Feed */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-500 flex items-center justify-center">
              <Rss className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold">RSS Feed</h2>
              <p className="text-xs text-gray-500">Per lettori e aggregatori RSS</p>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 px-3 py-2 flex items-center justify-between gap-2 mb-3">
            <code className="text-xs text-gray-600 truncate">{SITE_URL}/feed.xml</code>
            <CopyButton text={`${SITE_URL}/feed.xml`} />
          </div>
          <div className="flex gap-2">
            <a href="/feed.xml" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-juve-gold hover:underline">
              <ExternalLink className="h-3.5 w-3.5" />
              Visualizza feed
            </a>
          </div>
        </motion.div>

        {/* Sitemap */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 flex items-center justify-center">
              <Map className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold">Sitemap XML</h2>
              <p className="text-xs text-gray-500">Per Google Search Console</p>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 px-3 py-2 flex items-center justify-between gap-2 mb-3">
            <code className="text-xs text-gray-600 truncate">{SITE_URL}/sitemap.xml</code>
            <CopyButton text={`${SITE_URL}/sitemap.xml`} />
          </div>
          <div className="flex gap-2">
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-juve-gold hover:underline">
              <ExternalLink className="h-3.5 w-3.5" />
              Visualizza sitemap
            </a>
          </div>
        </motion.div>

        {/* Google Search Console */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white border border-gray-200 p-6 md:col-span-2">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-juve-gold" />
            Suggerimenti SEO
          </h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-juve-gold rounded-full mt-2 shrink-0" />
              Invia <code className="text-xs bg-gray-100 px-1">{SITE_URL}/sitemap.xml</code> a <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-juve-gold hover:underline">Google Search Console</a>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-juve-gold rounded-full mt-2 shrink-0" />
              Aggiungi il feed RSS all'header del sito aggiornando <code className="text-xs bg-gray-100 px-1">index.html</code>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-juve-gold rounded-full mt-2 shrink-0" />
              Imposta <code className="text-xs bg-gray-100 px-1">VITE_SITE_URL</code> nel file <code className="text-xs bg-gray-100 px-1">.env</code> con il dominio di produzione
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  )
}
