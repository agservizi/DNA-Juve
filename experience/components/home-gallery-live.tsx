'use client'

import dynamic from 'next/dynamic'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import type { HomeGalleryItem } from '@/lib/content'

const GalleryAura = dynamic(() => import('@/components/home-gallery-aura').then((mod) => mod.HomeGalleryAura), {
  ssr: false,
})

export function HomeGalleryLive({ items }: { items: HomeGalleryItem[] }) {
  const root = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()
  const hasItems = items.length > 0

  useEffect(() => {
    if (reduceMotion || !root.current || !hasItems) return
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
  }, [hasItems, items, reduceMotion])

  return (
    <section
      ref={root}
      className="home-gallery"
      id="chapter-gallery"
      aria-labelledby="gallery-live-title"
      data-cinema-room="gallery"
      data-empty={!hasItems || undefined}
    >
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
          <p>
            {hasItems
              ? 'Dieci frame dallo stadio e dalla curva. L’archivio completo è nella gallery.'
              : 'Lo spazio è pronto: appena pubblichi foto o video dalla control room, appariranno qui.'}
          </p>
        </div>
        <Link className="kinetic-cta" href="/gallery">
          <span>{hasItems ? 'Vedi tutta la gallery' : 'Apri la gallery'}</span>
          <i aria-hidden="true">↗︎</i>
        </Link>
      </div>

      {hasItems ? (
        <>
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
                    {item.media_type === 'video' && (
                      <span className="home-gallery__play" aria-hidden="true">
                        ▶
                      </span>
                    )}
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
        </>
      ) : (
        <div className="home-gallery__empty" role="status">
          <div className="home-gallery__empty-grid" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <span key={index} />
            ))}
          </div>
          <div className="home-gallery__empty-copy">
            <p className="eyebrow">Archivio in attesa</p>
            <h3>Nessun media pubblicato ancora.</h3>
            <Link className="text-link" href="/gallery">
              Vai alla Gallery <i aria-hidden="true">↗︎</i>
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
