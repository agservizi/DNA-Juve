"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  const compact = size === "sm"
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer relative inline-flex shrink-0 cursor-pointer items-center rounded-full border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#af8f5c]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0a] disabled:cursor-not-allowed disabled:opacity-50",
        compact ? "h-3.5 w-6" : "h-5 w-9",
        "data-[state=checked]:border-[#af8f5c] data-[state=checked]:bg-[#af8f5c]",
        "data-[state=unchecked]:border-[#5c5d58] data-[state=unchecked]:bg-[#3a3b38]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-[#f4f2ec] shadow-sm ring-0 transition-transform",
          compact ? "size-2.5 data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0.5" : "size-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5",
          "data-[state=checked]:bg-[#090a0a]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
