'use client'

import { Canvas } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'

export function HomeGalleryAura() {
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
