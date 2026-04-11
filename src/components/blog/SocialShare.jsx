import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TwitterShareButton, FacebookShareButton, WhatsappShareButton,
  TwitterIcon, FacebookIcon, WhatsappIcon,
} from 'react-share'
import { Link2, Check } from 'lucide-react'

export default function SocialShare({ url, title, excerpt, className = '' }) {
  const [copied, setCopied] = useState(false)

  const fullUrl = url || window.location.href

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <div className={`relative inline-flex flex-nowrap items-center gap-2 whitespace-nowrap ${className}`}>
      {/* Always-visible inline buttons */}
      <span className="mr-1 shrink-0 text-xs font-bold uppercase tracking-wider text-gray-500">Condividi:</span>

      <TwitterShareButton url={fullUrl} title={title} via="BianconeriHub" className="shrink-0 align-middle">
        <span className="flex items-center justify-center w-8 h-8 bg-[#1DA1F2] hover:bg-[#1a8fd1] text-white transition-colors">
          <TwitterIcon size={14} round={false} bgStyle={{ fill: 'transparent' }} iconFillColor="white" />
        </span>
      </TwitterShareButton>

      <FacebookShareButton url={fullUrl} quote={excerpt} className="shrink-0 align-middle">
        <span className="flex items-center justify-center w-8 h-8 bg-[#1877F2] hover:bg-[#166fe5] text-white transition-colors">
          <FacebookIcon size={14} round={false} bgStyle={{ fill: 'transparent' }} iconFillColor="white" />
        </span>
      </FacebookShareButton>

      <WhatsappShareButton url={fullUrl} title={title} className="shrink-0 align-middle">
        <span className="flex items-center justify-center w-8 h-8 bg-[#25D366] hover:bg-[#20bc5a] text-white transition-colors">
          <WhatsappIcon size={14} round={false} bgStyle={{ fill: 'transparent' }} iconFillColor="white" />
        </span>
      </WhatsappShareButton>

      <button
        onClick={handleCopy}
        title="Copia link"
        className="relative flex h-8 w-8 shrink-0 items-center justify-center bg-gray-200 transition-colors hover:bg-juve-black hover:text-white"
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Check className="h-3.5 w-3.5 text-green-500" />
            </motion.span>
          ) : (
            <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Link2 className="h-3.5 w-3.5" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Tooltip "Copiato!" */}
      <AnimatePresence>
        {copied && (
          <motion.span
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-8 right-0 text-xs bg-juve-black text-white px-2 py-1 whitespace-nowrap pointer-events-none"
          >
            Link copiato!
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
