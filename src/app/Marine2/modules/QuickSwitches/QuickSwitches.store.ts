import { makeAutoObservable } from "mobx"
import { useMemo } from "react"

/** Four is what fits on one row of the panel without the labels shrinking. */
export const MAX_QUICK_SWITCHES = 4

const STORAGE_KEY = "greenline.quickSwitches"

export interface QuickSwitchRef {
  tree: string
  deviceId: string
  outputId: string
}

export const quickSwitchKey = (ref: QuickSwitchRef) => `${ref.tree}/${ref.deviceId}/${ref.outputId}`

/**
 * Which switches the helm has pinned to Home.
 *
 * Kept in localStorage rather than on the GX: this is a per-display preference,
 * and writing it to the device's settings would push one helm's choice onto
 * every other screen on the boat. Storage can fail or come back empty (a
 * private window, cleared site data), and an empty list is a valid state, so
 * every access is guarded and nothing depends on it having worked.
 */
export class QuickSwitchesStore {
  selection: QuickSwitchRef[] = []

  constructor() {
    makeAutoObservable(this)
    this.load()
  }

  load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        this.selection = parsed
          .filter((r) => r && typeof r.tree === "string" && typeof r.outputId === "string")
          .map((r) => ({ tree: r.tree, deviceId: String(r.deviceId), outputId: r.outputId }))
          .slice(0, MAX_QUICK_SWITCHES)
      }
    } catch {
      // No storage, or something else wrote nonsense to the key. Start empty.
    }
  }

  setSelection(refs: QuickSwitchRef[]) {
    this.selection = refs.slice(0, MAX_QUICK_SWITCHES)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.selection))
    } catch {
      // Preference is lost on reload; the buttons still work this session.
    }
  }

  isSelected(ref: QuickSwitchRef) {
    return this.selection.some((r) => quickSwitchKey(r) === quickSwitchKey(ref))
  }
}

let store: QuickSwitchesStore

function initializeStore() {
  const _store = store ?? new QuickSwitchesStore()
  // For SSG and SSR always create a new store
  if (typeof window === "undefined") return _store
  // Create the store once in the client
  if (!store) store = _store

  return _store
}

export function useQuickSwitchesStore() {
  return useMemo(() => initializeStore(), [])
}
