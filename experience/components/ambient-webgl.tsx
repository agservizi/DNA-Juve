'use client'

import { Canvas,useFrame,useLoader } from '@react-three/fiber'
import { AdaptiveDpr,Float,PerformanceMonitor,Sparkles } from '@react-three/drei'
import { Bloom,EffectComposer,Vignette } from '@react-three/postprocessing'
import { useEffect,useMemo,useRef,useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.0);}`
const fragment=`
 precision highp float;
 varying vec2 vUv;
 uniform float uTime;
 uniform float uScroll;
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
  float flow=field(uv+vec2(uScroll*.16,-uScroll*.08),uTime*.16);
  float line=smoothstep(.14,.0,abs(fract(flow*.22+uScroll*.3)-.5)-.36);
  float halo=exp(-distanceToPointer*3.6);
  float horizon=smoothstep(.7,.05,abs(uv.y+sin(uv.x*2.4+uTime*.1)*.12));
  vec3 gold=vec3(.686,.561,.361),white=vec3(.94,.94,.92);
  vec3 color=mix(gold,white,clamp(halo+line*.28,0.0,1.0));
  float alpha=(line*.16+horizon*.035+halo*.09)*smoothstep(1.15,.18,length(uv));
  gl_FragColor=vec4(color,alpha);
 }`

function Field(){
 const material=useRef<THREE.ShaderMaterial>(null),pointer=useRef(new THREE.Vector2(.5,.5))
 const uniforms=useMemo(()=>({uTime:{value:0},uScroll:{value:0},uPointer:{value:new THREE.Vector2(.5,.5)}}),[])
 useEffect(()=>{const move=(event:PointerEvent)=>pointer.current.set(event.clientX/innerWidth,1-event.clientY/innerHeight);window.addEventListener('pointermove',move,{passive:true});return()=>window.removeEventListener('pointermove',move)},[])
 useFrame(({clock})=>{if(!material.current)return;material.current.uniforms.uTime.value=clock.elapsedTime;material.current.uniforms.uPointer.value.lerp(pointer.current,.055);const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);material.current.uniforms.uScroll.value=THREE.MathUtils.lerp(material.current.uniforms.uScroll.value,scrollY/max,.06)})
 return <mesh frustumCulled={false}><planeGeometry args={[2,2]}/><shaderMaterial ref={material} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending}/></mesh>
}

function Architecture(){
 const group=useRef<THREE.Group>(null)
 useFrame(({clock,pointer})=>{if(!group.current)return;const max=Math.max(1,document.documentElement.scrollHeight-innerHeight),progress=scrollY/max;group.current.rotation.z=progress*Math.PI*.55+clock.elapsedTime*.012;group.current.rotation.x=THREE.MathUtils.lerp(group.current.rotation.x,pointer.y*.08,.025);group.current.rotation.y=THREE.MathUtils.lerp(group.current.rotation.y,pointer.x*.1,.025);group.current.position.y=THREE.MathUtils.lerp(group.current.position.y,(progress-.5)*.55,.025)})
 return <Float speed={.28} rotationIntensity={.08} floatIntensity={.12}><group ref={group} position={[1.35,0,-.2]} rotation={[.15,-.25,.25]}>
  <mesh scale={[1.8,1.8,1.8]}><torusGeometry args={[.72,.012,6,180]}/><meshBasicMaterial color="#af8f5c" transparent opacity={.32}/></mesh>
  <mesh rotation={[.65,.2,.9]} scale={[2.7,2.7,2.7]}><torusGeometry args={[.72,.006,5,180]}/><meshBasicMaterial color="#ffffff" transparent opacity={.13}/></mesh>
  <mesh rotation={[-.4,.7,-.35]} scale={[3.7,3.7,3.7]}><torusGeometry args={[.72,.004,5,180]}/><meshBasicMaterial color="#af8f5c" transparent opacity={.1}/></mesh>
 </group></Float>
}

function CompressedModel({url}:{url:string}){
 const gltf=useLoader(GLTFLoader,url,(loader)=>{
  const dracoPath=process.env.NEXT_PUBLIC_DRACO_DECODER_PATH
  if(dracoPath){const draco=new DRACOLoader();draco.setDecoderPath(dracoPath);loader.setDRACOLoader(draco)}
  loader.setMeshoptDecoder(MeshoptDecoder)
 })
 return <primitive object={gltf.scene} scale={.75} position={[1.2,-.6,-.8]}/>
}

export default function AmbientWebGL(){
 const model=process.env.NEXT_PUBLIC_AMBIENT_MODEL_URL
 const [quality,setQuality]=useState(1)
 return <div className="ambient-webgl" aria-hidden="true"><Canvas dpr={[.85,1.35]} camera={{position:[0,0,4.6],fov:42}} gl={{alpha:true,antialias:false,powerPreference:'high-performance'}}>
  <PerformanceMonitor onDecline={()=>setQuality(.55)} onIncline={()=>setQuality(1)}/><AdaptiveDpr pixelated/>
  <Field/><Architecture/>
  <Sparkles count={quality===1?18:6} scale={[8,5,2]} size={.35} speed={.08} opacity={.055} color="#d1ae70"/>
  {model&&<CompressedModel url={model}/>} 
  {quality===1&&<EffectComposer multisampling={0}><Bloom intensity={.22} luminanceThreshold={.72} mipmapBlur/><Vignette eskil={false} offset={.25} darkness={.42}/></EffectComposer>}
 </Canvas></div>
}
