'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useReducedMotion } from 'motion/react'
import { COOKIE_CONSENT_EVENT, readCookieConsent } from '@/components/cookie-consent'

const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false })
const Rive = dynamic(() => import('@rive-app/react-canvas').then((module) => module.default), { ssr: false })
const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

/**
 * Optional branded media only when real Juventus assets + consent exist.
 * Decorative local Lottie / Theatre stubs are intentionally off.
 */
export function CinematicMediaLayer() {
  const reduced = useReducedMotion()
  const pathname = usePathname()
  const [externalAllowed, setExternalAllowed] = useState(false)
  const [lottieData, setLottieData] = useState<object | null>(null)
  const splineUrl = process.env.NEXT_PUBLIC_SPLINE_SCENE_URL
  const riveUrl = process.env.NEXT_PUBLIC_RIVE_HERO_URL
  const lottieUrl = process.env.NEXT_PUBLIC_LOTTIE_URL
  const hasRealAsset = Boolean(splineUrl || riveUrl || lottieUrl)

  useEffect(() => {
    const sync = () => setExternalAllowed(Boolean(readCookieConsent()?.externalMedia))
    const timer = window.setTimeout(sync, 0)
    window.addEventListener(`${COOKIE_CONSENT_EVENT}:changed`, sync)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(`${COOKIE_CONSENT_EVENT}:changed`, sync)
    }
  }, [])

  useEffect(() => {
    if (!externalAllowed || !lottieUrl || reduced) return
    const controller = new AbortController()
    fetch(lottieUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Animazione Lottie non disponibile')
        return response.json() as Promise<object>
      })
      .then(setLottieData)
      .catch(() => setLottieData(null))
    return () => controller.abort()
  }, [externalAllowed, lottieUrl, reduced])

  if (reduced || !hasRealAsset || !externalAllowed) return null
  if (pathname.startsWith('/admin') || pathname.startsWith('/area-bianconera')) return null

  return (
    <div className="cinematic-media-layer" aria-hidden="true">
      {splineUrl && <div className="cinematic-media-spline"><Spline scene={splineUrl} /></div>}
      {riveUrl && <div className="cinematic-media-rive"><Rive src={riveUrl} shouldDisableRiveListeners /></div>}
      {lottieData && <div className="cinematic-media-lottie"><Lottie animationData={lottieData} loop autoplay /></div>}
    </div>
  )
}
