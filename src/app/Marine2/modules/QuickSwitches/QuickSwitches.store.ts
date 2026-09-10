import { makeAutoObservable } from "mobx"
import { useMemo } from "react"
import { savePrefs } from "../Greenline/prefs.client"

/** Four is what fits on one row of the panel without the labels shrinking. */
export const MAX_QUICK_SWITCHES = 4

const STORAGE_KEY = "greenline.quickSwitches"

export interface QuickSwitchRef {
  tree: string
  deviceId: string
  outputId: string
}

export const quickSwitchKey = (ref: QuickSwitchRef) => `${ref.tree}/${ref.deviceId}/${ref.outputId}`

/** Whatever came off the wire, reduced to well-formed refs, at most four. */
const parseSelection = (value: unknown): QuickSwitchRef[] | undefined => {
  if (!Array.isArray(value)) return undefined
  return value
    .filter((r) => r && typeof r.tree === "string" && typeof r.outputId === "string")
    .map((r) => ({ tree: r.tree, deviceId: String(r.deviceId), outputId: r.outputId }))
    .slice(0, MAX_QUICK_SWITCHES)
}

/**
 * Which switches the helm has pinned to Home.
 *
 * The choice roams: it lives in the preferences document on the GX (see
 * `Greenline/prefs.client.ts`), so every display shows the same buttons and
 * an MFD reboot, which wipes the webview's storage, costs nothing.
 * localStorage keeps a copy so the page paints its last state before the GX
 * answers, and stands in when the relay is down. Storage can fail or come
 * back empty, and an empty list is a valid state, so every access is guarded
 * and nothing depends on it having worked.
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
      const parsed = parseSelection(JSON.parse(raw))
      if (parsed) this.selection = parsed
    } catch {
      // No storage, or something else wrote nonsense to the key. Start empty.
    }
  }

  /** What the GX has on file. An empty list is a real choice; garbage is ignored. */
  hydrate(value: unknown) {
    const parsed = parseSelection(value)
    if (!parsed) return
    this.selection = parsed
    this.cache()
  }

  setSelection(refs: QuickSwitchRef[]) {
    this.selection = refs.slice(0, MAX_QUICK_SWITCHES)
    this.cache()
    void savePrefs({ quickSwitches: this.selection })
  }

  private cache() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.selection))
    } catch {
      // No local copy; the GX still has it.
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
