import { useState, useEffect } from 'react'
import { motion, useSpring } from 'framer-motion'

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0)
    }
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-transparent pointer-events-none">
      <motion.div
        className="h-full bg-juve-gold origin-left"
        style={{ scaleX: progress / 100 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      />
    </div>
  )
}
