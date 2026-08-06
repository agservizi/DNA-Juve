'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { COOKIE_CONSENT_EVENT, readCookieConsent } from '@/components/cookie-consent'

const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false })
const Rive = dynamic(() => import('@rive-app/react-canvas').then((module) => module.default), { ssr: false })
const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

const localLottie = {
  v: '5.12.2', fr: 30, ip: 0, op: 180, w: 480, h: 480, nm: 'BianconeriHub orbit', ddd: 0,
  assets: [],
  layers: [{ ddd: 0, ind: 1, ty: 4, nm: 'Gold orbit', sr: 1, ks: { o: { a: 0, k: 22 }, r: { a: 1, k: [{ t: 0, s: [0] }, { t: 180, s: [360] }] }, p: { a: 0, k: [240, 240, 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] } }, ao: 0, shapes: [{ ty: 'gr', it: [{ d: 1, ty: 'el', s: { a: 0, k: [330, 330] }, p: { a: 0, k: [0, 0] }, nm: 'Ellipse' }, { ty: 'st', c: { a: 0, k: [.686, .561, .361, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 1.4 }, lc: 2, lj: 2, d: [{ n: 'd', v: { a: 0, k: 28 } }, { n: 'g', v: { a: 0, k: 52 } }, { n: 'o', v: { a: 0, k: 0 } }], nm: 'Stroke' }, { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, sk: { a: 0, k: 0 }, sa: { a: 0, k: 0 } }], nm: 'Orbit' }], ip: 0, op: 180, st: 0, bm: 0 }],
}

export function CinematicMediaLayer() {
  const reduced = useReducedMotion()
  const [externalAllowed, setExternalAllowed] = useState(false)
  const [lottieData, setLottieData] = useState<object | null>(null)
  const splineUrl = process.env.NEXT_PUBLIC_SPLINE_SCENE_URL
  const riveUrl = process.env.NEXT_PUBLIC_RIVE_HERO_URL
  const lottieUrl = process.env.NEXT_PUBLIC_LOTTIE_URL

  useEffect(() => {
    const sync = () => setExternalAllowed(Boolean(readCookieConsent()?.externalMedia))
    const timer = window.setTimeout(sync, 0)
    window.addEventListener(`${COOKIE_CONSENT_EVENT}:changed`, sync)
    return () => { window.clearTimeout(timer); window.removeEventListener(`${COOKIE_CONSENT_EVENT}:changed`, sync) }
  }, [])

  useEffect(() => {
    if (reduced) return
    let active = true
    import('@theatre/core').then(({ getProject }) => {
      const project = getProject('BianconeriHub Runtime')
      if (active) project.ready.then(() => { document.documentElement.dataset.theatreRuntime = 'ready' })
    }).catch(() => {})
    return () => { active = false; delete document.documentElement.dataset.theatreRuntime }
  }, [reduced])

  useEffect(() => {
    if (!externalAllowed || !lottieUrl || reduced) return
    const controller = new AbortController()
    fetch(lottieUrl, { signal: controller.signal }).then((response) => {
      if (!response.ok) throw new Error('Animazione Lottie non disponibile')
      return response.json() as Promise<object>
    }).then(setLottieData).catch(() => setLottieData(null))
    return () => controller.abort()
  }, [externalAllowed, lottieUrl, reduced])

  if (reduced) return null
  return <div className="cinematic-media-layer" aria-hidden="true">
    <div className="cinematic-media-local"><Lottie animationData={localLottie} loop autoplay /></div>
    {externalAllowed && splineUrl && <div className="cinematic-media-spline"><Spline scene={splineUrl} /></div>}
    {externalAllowed && riveUrl && <div className="cinematic-media-rive"><Rive src={riveUrl} shouldDisableRiveListeners /></div>}
    {externalAllowed && lottieData && <div className="cinematic-media-lottie"><Lottie animationData={lottieData} loop autoplay /></div>}
  </div>
}
