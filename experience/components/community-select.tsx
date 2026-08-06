'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import styles from './community-select.module.css'

type Option = { value: string; label: string }

export function CommunitySelect({
  value,
  options,
  onChange,
  label,
  required = false,
}: {
  value: string
  options: Option[]
  onChange: (value: string) => void
  label: string
  required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const selected = options.find((option) => option.value === value) || options[0]

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  const focusOption = (edge: 'first' | 'last') => {
    window.requestAnimationFrame(() => {
      const items = root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')
      items?.[edge === 'first' ? 0 : items.length - 1]?.focus()
    })
  }

  return <div className={styles.root} ref={root}>
    <button
      className={styles.trigger}
      ref={trigger}
      type="button"
      role="combobox"
      aria-label={label}
      aria-controls={listId}
      aria-expanded={open}
      aria-haspopup="listbox"
      onClick={() => setOpen((current) => !current)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          setOpen(true)
          focusOption(event.key === 'ArrowDown' ? 'first' : 'last')
        }
      }}
    >
      <span>{selected?.label}</span><i aria-hidden="true">⌄</i>
    </button>
    {required && <input tabIndex={-1} aria-hidden="true" className={styles.hidden} value={value} onChange={() => {}} required />}
    <AnimatePresence>
      {open && <motion.div
        id={listId}
        className={styles.menu}
        role="listbox"
        aria-label={label}
        initial={{ opacity: 0, y: -8, scale: .98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: .985 }}
        transition={{ duration: .28, ease: [.22, 1, .36, 1] }}
      >
        {options.map((option) => <button
          key={option.value || 'all'}
          type="button"
          role="option"
          aria-selected={option.value === value}
          className={styles.option}
          onClick={() => { onChange(option.value); setOpen(false) }}
          onKeyDown={(event) => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
            event.preventDefault()
            const items = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') || [])
            const current = items.indexOf(event.currentTarget)
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? Math.min(items.length - 1, current + 1) : Math.max(0, current - 1)
            items[next]?.focus()
          }}
        >
          <span>{option.label}</span><i aria-hidden="true" />
        </button>)}
      </motion.div>}
    </AnimatePresence>
  </div>
}
