import type { ReactNode } from 'react'

declare module 'react' {
  export type ViewTransitionClass = string

  export type ViewTransitionProps = {
    children?: ReactNode
    name?: string
    default?: ViewTransitionClass | 'none' | 'auto'
    enter?: ViewTransitionClass | Record<string, ViewTransitionClass | 'none' | 'auto'>
    exit?: ViewTransitionClass | Record<string, ViewTransitionClass | 'none' | 'auto'>
    share?: ViewTransitionClass | Record<string, ViewTransitionClass | 'none' | 'auto'>
  }

  export function ViewTransition(props: ViewTransitionProps): React.ReactElement
}

export {}
