'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const vertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.0);}`
const fragment = `
 precision highp float;
 varying vec2 vUv;
 uniform float uTime;
 uniform float uScroll;
 uniform float uEra;
 uniform vec2 uPointer;
 float field(vec2 p,float phase){
  float a=sin(p.x*8.0+sin(p.y*4.0+phase)*1.8+phase);
  float b=cos(p.y*11.0+cos(p.x*3.0-phase)*1.4-phase*.7);
  return a+b;
 }
 void main(){
  vec2 uv=vUv-.5;
  uv.x*=1.78;
  vec2 pointer=(uPointer-.5)*vec2(1.78,1.0);
  float distanceToPointer=length(uv-pointer);
  float eraShift=uEra*.12;
  float flow=field(uv+vec2(uScroll*.16+eraShift,-uScroll*.08),uTime*.16+eraShift);
  float line=smoothstep(.14,.0,abs(fract(flow*.22+uScroll*.3)-.5)-.36);
  float halo=exp(-distanceToPointer*3.6);
  float horizon=smoothstep(.7,.05,abs(uv.y+sin(uv.x*2.4+uTime*.1)*.12));
  vec3 gold=vec3(.686,.561,.361),white=vec3(.94,.94,.92);
  vec3 dusk=mix(gold,vec3(.55,.48,.38),uEra*.35);
  vec3 color=mix(dusk,white,clamp(halo+line*.28,0.0,1.0));
  float alpha=(line*.12+horizon*.03+halo*.07)*smoothstep(1.15,.18,length(uv))*(.55+uEra*.2);
  gl_FragColor=vec4(color,alpha);
 }`

function Field() {
  const material = useRef<THREE.ShaderMaterial>(null)
  const pointer = useRef(new THREE.Vector2(0.5, 0.5))
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uEra: { value: 0 },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    }),
    [],
  )
  useEffect(() => {
    const move = (event: PointerEvent) => pointer.current.set(event.clientX / innerWidth, 1 - event.clientY / innerHeight)
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])
  useFrame(({ clock }) => {
    if (!material.current) return
    material.current.uniforms.uTime.value = clock.elapsedTime
    material.current.uniforms.uPointer.value.lerp(pointer.current, 0.055)
    const css = getComputedStyle(document.documentElement)
    const progress = Number(css.getPropertyValue('--cinema-progress')) || 0
    const era = Number(css.getPropertyValue('--cinema-era-grade')) || 0
    material.current.uniforms.uScroll.value = THREE.MathUtils.lerp(material.current.uniforms.uScroll.value, progress, 0.06)
    material.current.uniforms.uEra.value = THREE.MathUtils.lerp(material.current.uniforms.uEra.value, era, 0.08)
  })
  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

/** Shader field only — no torus / sparkles / bloom wallpaper. */
export default function AmbientWebGL() {
  const [, setQuality] = useState(1)
  return (
    <div className="ambient-webgl" aria-hidden="true">
      <Canvas dpr={[0.85, 1.2]} camera={{ position: [0, 0, 4.6], fov: 42 }} gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}>
        <PerformanceMonitor onDecline={() => setQuality(0.55)} onIncline={() => setQuality(1)} />
        <AdaptiveDpr pixelated />
        <Field />
      </Canvas>
    </div>
  )
}
