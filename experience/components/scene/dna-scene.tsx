'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, MeshTransmissionMaterial } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useRef } from 'react'
import type { Group } from 'three'

function Crest() {
  const ref = useRef<Group>(null)
  useFrame((state, delta) => {
    if (!ref.current) return
    ref.current.rotation.y += delta * .16
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * .35) * .08
  })
  return (
    <Float speed={1.25} rotationIntensity={0.18} floatIntensity={0.5}>
      <group ref={ref} rotation={[0.08, -0.35, -0.08]}>
        <mesh position={[-0.72, 0, 0]} scale={[0.42, 2.45, 0.38]}>
          <boxGeometry args={[1, 1, 1, 6, 16, 6]} />
          <MeshTransmissionMaterial color="#FFFFFF" roughness={0.18} thickness={0.8} transmission={0.92} chromaticAberration={0.035} />
        </mesh>
        <mesh position={[0.48, -0.18, 0]} rotation={[0, 0, -0.22]} scale={[0.42, 2.05, 0.38]}>
          <boxGeometry args={[1, 1, 1, 6, 16, 6]} />
          <meshStandardMaterial color="#AF8F5C" metalness={0.72} roughness={0.2} />
        </mesh>
        <mesh position={[0.18, -1.3, 0]} rotation={[0, 0, 1.08]} scale={[0.35, 1.2, 0.34]}>
          <boxGeometry args={[1, 1, 1, 6, 12, 6]} />
          <meshStandardMaterial color="#FFFFFF" metalness={0.5} roughness={0.25} />
        </mesh>
      </group>
    </Float>
  )
}

export default function DnaScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 7], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 5, 5]} intensity={3.2} color="#AF8F5C" />
      <pointLight position={[-4, -2, 3]} intensity={12} color="#FFFFFF" />
      <Crest />
      <Environment preset="city" />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.42} luminanceThreshold={0.8} mipmapBlur />
        <Vignette eskil={false} offset={0.18} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  )
}
