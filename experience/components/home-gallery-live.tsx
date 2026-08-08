'use client'

import { Canvas } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'next-view-transitions'
import { useEffect, useRef } from 'react'
import type { HomeGalleryItem } from '@/lib/content'

function GalleryAura() {
  return (
    <Canvas dpr={[1, 1.15]} gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }} camera={{ position: [0, 0, 5], fov: 42 }}>
      <ambientLight intensity={0.15} />
      <Sparkles count={14} scale={[9, 4, 2]} size={1.1} speed={0.06} opacity={0.14} color="#d4b579" />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.18} luminanceThreshold={0.7} />
        <Vignette eskil={false} offset={0.3} darkness={0.65} />
      </EffectComposer>
    </Canvas>
  )
}

export function HomeGalleryLive({ items }: { items: HomeGalleryItem[] }) {
  const root = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion || !root.current || !items.length) return
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-gallery-tile]',
        { opacity: 0, y: 28, clipPath: 'inset(10% 0 10% 0)' },
        {
          opacity: 1,
          y: 0,
          clipPath: 'inset(0% 0 0% 0)',
          duration: 0.9,
          stagger: 0.055,
          ease: 'power3.out',
          scrollTrigger: { trigger: root.current, start: 'top 82%', once: true },
        },
      )
    }, root)
    return () => ctx.revert()
  }, [items, reduceMotion])

  if (!items.length) return null

  return (
    <section ref={root} className="home-gallery" id="chapter-gallery" aria-labelledby="gallery-live-title" data-cinema-room="gallery">
      {!reduceMotion && (
        <div className="home-gallery__aura" aria-hidden="true">
          <GalleryAura />
        </div>
      )}
      <div className="home-gallery__head">
        <div>
          <p className="eyebrow">Gallery live</p>
          <h2 id="gallery-live-title">
            Istanti
            <br />
            <i>dal vivo.</i>
          </h2>
          <p>Dieci frame dallo stadio e dalla curva. L’archivio completo è nella gallery.</p>
        </div>
        <Link className="kinetic-cta" href="/gallery">
          <span>Vedi tutta la gallery</span>
          <i aria-hidden="true">↗︎</i>
        </Link>
      </div>
      <div className="home-gallery__rail" role="list">
        {items.map((item, index) => (
          <motion.article
            key={item.id}
            className="home-gallery__tile"
            data-gallery-tile
            role="listitem"
            whileHover={reduceMotion ? undefined : { y: -6 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <Link href="/gallery" aria-label={`${item.media_type === 'video' ? 'Video' : 'Foto'}: ${item.title}. Apri la gallery`}>
              <div className="home-gallery__media" style={{ viewTransitionName: `gallery-cover-${item.id}` }}>
                {item.media_type === 'video' ? (
                  <video src={item.media_url} muted playsInline preload="metadata" />
                ) : (
                  <img src={item.media_url} alt={item.alt_text || item.title} loading={index < 4 ? 'eager' : 'lazy'} />
                )}
                {item.media_type === 'video' && <span className="home-gallery__play" aria-hidden="true">▶</span>}
              </div>
              <div className="home-gallery__copy">
                <span>
                  {item.location || 'Bordocampo'} · {new Date(item.captured_at).toLocaleDateString('it-IT')}
                </span>
                <strong>{item.title}</strong>
              </div>
            </Link>
          </motion.article>
        ))}
      </div>
      <div className="home-gallery__foot">
        <Link className="text-link" href="/gallery">
          Apri l’archivio completo <i aria-hidden="true">↗︎</i>
        </Link>
      </div>
    </section>
  )
}
