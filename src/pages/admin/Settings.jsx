import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Database, ExternalLink } from 'lucide-react'

export default function Settings() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-black">Impostazioni</h1>
        <p className="text-sm text-gray-500 mt-1">Configurazione del magazine</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {/* Supabase config */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Database className="h-5 w-5 text-juve-gold" />
            <h2 className="font-bold">Database Supabase</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Configura le credenziali Supabase nel file <code className="text-xs bg-gray-100 px-1.5 py-0.5">.env</code>
          </p>
          <div className="space-y-2 text-xs font-mono bg-gray-50 p-3 border border-gray-200">
            <p className="text-gray-600">VITE_SUPABASE_URL=...</p>
            <p className="text-gray-600">VITE_SUPABASE_ANON_KEY=...</p>
          </div>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-juve-gold hover:underline"
          >
            Apri dashboard Supabase
            <ExternalLink className="h-3 w-3" />
          </a>
        </motion.div>

        {/* SQL setup */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <SettingsIcon className="h-5 w-5 text-juve-gold" />
            <h2 className="font-bold">Setup Database</h2>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Esegui il file <code className="text-xs bg-gray-100 px-1.5 py-0.5">supabase/schema.sql</code> nel SQL Editor di Supabase per creare le tabelle necessarie.
          </p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-juve-gold rounded-full" /> Tabella <code>articles</code>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-juve-gold rounded-full" /> Tabella <code>categories</code>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-juve-gold rounded-full" /> Tabella <code>profiles</code>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-juve-gold rounded-full" /> Storage bucket <code>article-images</code>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  )
}
