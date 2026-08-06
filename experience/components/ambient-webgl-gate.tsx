'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react'

const AmbientWebGL=dynamic(()=>import('@/components/ambient-webgl'),{ssr:false})
class WebGLErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true}}componentDidCatch(_error:Error,_info:ErrorInfo){}render(){return this.state.failed?null:this.props.children}}

export function AmbientWebGLGate(){
 const pathname=usePathname(),[ready,setReady]=useState(false)
 useEffect(()=>{
  if(pathname.startsWith('/admin')||matchMedia('(prefers-reduced-motion: reduce)').matches||matchMedia('(pointer:coarse)').matches)return
  const nav=navigator as Navigator&{deviceMemory?:number;connection?:{saveData?:boolean}}
  if(nav.connection?.saveData||(nav.deviceMemory||8)<4)return
  const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{powerPreference:'high-performance'})
  if(!gl)return
  gl.getExtension('WEBGL_lose_context')?.loseContext()
  const idle=window.requestIdleCallback?window.requestIdleCallback(()=>setReady(true),{timeout:1800}):window.setTimeout(()=>setReady(true),900)
  return()=>{if(window.cancelIdleCallback)window.cancelIdleCallback(idle);else clearTimeout(idle)}
 },[pathname])
 if(!ready||pathname.startsWith('/admin'))return null
 return <WebGLErrorBoundary><AmbientWebGL/></WebGLErrorBoundary>
}
