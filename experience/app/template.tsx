import { ViewTransition } from 'react'

/**
 * Remounts on navigation so React View Transitions can run enter/exit.
 * Soft crossfade only — no directional wipes.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="route-fade" exit="route-fade" default="none">
      {children}
    </ViewTransition>
  )
}
