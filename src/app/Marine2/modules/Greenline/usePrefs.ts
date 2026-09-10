import { useEffect } from "react"
import { comparer, reaction } from "mobx"
import type { useTheme } from "@victronenergy/mfd-modules"
import { useHelmValuesStore } from "../HelmValues"
import { useQuickSwitchesStore } from "../QuickSwitches"
import { loadPrefs, prefsStatus, savePrefs, GreenlinePrefs } from "./prefs.client"

type ThemeStore = ReturnType<typeof useTheme>["themeStore"]

export interface ThemePrefs {
  darkMode: boolean
  nightMode: boolean
  autoMode: boolean
}

/**
 * The helm is dark unless somebody says otherwise. Auto mode is off on purpose:
 * it follows the browser's `prefers-color-scheme`, and the MFD's webview
 * reports light, which is what turned the page white.
 */
export const DEFAULT_THEME: ThemePrefs = { darkMode: true, nightMode: false, autoMode: false }

const isTheme = (v: unknown): v is ThemePrefs => {
  const t = v as ThemePrefs
  return !!t && typeof t.darkMode === "boolean" && typeof t.nightMode === "boolean" && typeof t.autoMode === "boolean"
}

const applyTheme = (themeStore: ThemeStore, theme: ThemePrefs) => {
  if (themeStore.autoMode !== theme.autoMode) themeStore.setAutoMode(theme.autoMode)
  if (themeStore.darkMode !== theme.darkMode) themeStore.setDarkMode(theme.darkMode)
  if (themeStore.nightMode !== theme.nightMode) themeStore.setNightMode(theme.nightMode)
}

/**
 * Pull the roaming preferences off the GX once at startup and push them into
 * the stores, then keep the theme in sync the other way: the stock Settings
 * menu writes the mfd-modules ThemeStore, and a reaction forwards every change
 * to the GX, so the menu needs no edit.
 *
 * A browser that still has pins in localStorage from before the document
 * existed seeds it once, so nothing is lost on the way over.
 */
export function useGreenlinePrefs(themeStore: ThemeStore) {
  const helm = useHelmValuesStore()
  const quick = useQuickSwitchesStore()

  useEffect(() => {
    let cancelled = false
    let dispose: (() => void) | undefined

    loadPrefs().then((doc) => {
      if (cancelled) return
      prefsStatus.setSource(doc ? "cerbo" : "unavailable")

      const seed: Partial<GreenlinePrefs> = {}
      if (doc && "helmValues" in doc) helm.hydrate(doc.helmValues)
      else if (doc && helm.selection) seed.helmValues = helm.selection
      if (doc && "quickSwitches" in doc) quick.hydrate(doc.quickSwitches)
      else if (doc && quick.selection.length > 0) seed.quickSwitches = quick.selection

      applyTheme(themeStore, isTheme(doc?.theme) ? doc.theme : DEFAULT_THEME)

      if (Object.keys(seed).length > 0) void savePrefs(seed)

      dispose = reaction(
        () => ({ darkMode: themeStore.darkMode, nightMode: themeStore.nightMode, autoMode: themeStore.autoMode }),
        (theme) => void savePrefs({ theme }),
        { equals: comparer.structural },
      )
    })

    return () => {
      cancelled = true
      dispose?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
