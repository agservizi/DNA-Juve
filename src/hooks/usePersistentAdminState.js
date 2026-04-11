import { useEffect, useMemo, useState } from 'react'

function resolveInitialValue(initialValue) {
  return typeof initialValue === 'function' ? initialValue() : initialValue
}

export function usePersistentState(storageKey, initialValue, options = {}) {
  const {
    storage = 'local',
    removeWhen,
  } = options

  const storageName = storage === 'session' ? 'sessionStorage' : 'localStorage'
  const fallbackValue = useMemo(() => resolveInitialValue(initialValue), [initialValue])

  const readStoredValue = () => {
    if (typeof window === 'undefined') return fallbackValue

    try {
      const rawValue = window[storageName].getItem(storageKey)
      return rawValue ? JSON.parse(rawValue) : fallbackValue
    } catch {
      return fallbackValue
    }
  }

  const [value, setValue] = useState(readStoredValue)

  useEffect(() => {
    setValue(readStoredValue())
  }, [storageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      if (removeWhen?.(value)) {
        window[storageName].removeItem(storageKey)
        return
      }

      window[storageName].setItem(storageKey, JSON.stringify(value))
    } catch {
      // Ignore storage quota and parsing errors.
    }
  }, [removeWhen, storageKey, storageName, value])

  const clearValue = () => {
    if (typeof window === 'undefined') return

    try {
      window[storageName].removeItem(storageKey)
    } catch {
      // Ignore storage cleanup failures.
    }
  }

  return [value, setValue, clearValue]
}

export function usePersistentAdminState(key, initialValue, options = {}) {
  return usePersistentState(`admin:${key}`, initialValue, options)
}