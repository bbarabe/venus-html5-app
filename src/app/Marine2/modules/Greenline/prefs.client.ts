import { makeAutoObservable } from "mobx"
import { getParameterByName } from "../../../utils/util"

/**
 * Roaming helm preferences, kept on the GX.
 *
 * The MFD's webview forgets its web storage on every reboot, and the owner
 * wants the same picks on every display anyway, so the pinned readings, the
 * quick switches and the theme live in one JSON document on the Cerbo. The
 * camera relay (Boat NMEA/camera-relay, port 8095 of the same host) stores it:
 * `GET /prefs.json` returns the document, `POST /prefs` merges top-level keys.
 * localStorage stays as a cache so the page paints its last state before the
 * fetch returns, and as the fallback when the relay is down.
 *
 * The document is opaque to the relay. Each key here is owned by one store,
 * which validates what it reads back, so a hand-edited file cannot break the
 * page.
 */
export interface GreenlinePrefs {
  helmValues?: unknown
  quickSwitches?: unknown
  theme?: unknown
}

export type PrefsKey = keyof GreenlinePrefs

const RELAY_PORT = 8095
const LOAD_TIMEOUT_MS = 6000

/** Where the relay is: `?relay=host:port` for development, else the GX itself. */
export const relayBase = (): string => {
  const override = getParameterByName("relay")
  if (override) return `http://${override}`
  const host = getParameterByName("host") || window.location.hostname || "localhost"
  return `http://${host}:${RELAY_PORT}`
}

export type PrefsSource = "loading" | "cerbo" | "unavailable"

/** What Diagnostics shows: where the preferences came from and whether the last write landed. */
export class PrefsStatus {
  source: PrefsSource = "loading"
  loadedAt?: Date
  lastSaveAt?: Date
  lastSaveOk?: boolean

  constructor() {
    makeAutoObservable(this)
  }

  setSource(source: PrefsSource) {
    this.source = source
    this.loadedAt = new Date()
  }

  setSaved(ok: boolean) {
    this.lastSaveOk = ok
    this.lastSaveAt = new Date()
    if (ok && this.source !== "cerbo") this.source = "cerbo"
  }
}

export const prefsStatus = new PrefsStatus()

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)

/** Fetch the document. Undefined means the relay did not answer, not an empty document. */
export async function loadPrefs(): Promise<GreenlinePrefs | undefined> {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : undefined
  const timer = window.setTimeout(() => controller?.abort(), LOAD_TIMEOUT_MS)
  try {
    const res = await fetch(`${relayBase()}/prefs.json`, { signal: controller?.signal, cache: "no-store" })
    if (!res.ok) return undefined
    const doc: unknown = await res.json()
    return isObject(doc) ? (doc as GreenlinePrefs) : undefined
  } catch {
    return undefined
  } finally {
    window.clearTimeout(timer)
  }
}

// Writes are serialised so two quick edits cannot land out of order.
let queue: Promise<unknown> = Promise.resolve()

/** Merge `patch` into the document on the GX. Resolves false when the relay is unreachable. */
export function savePrefs(patch: Partial<GreenlinePrefs>): Promise<boolean> {
  const run = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${relayBase()}/prefs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      const ok = res.ok
      prefsStatus.setSaved(ok)
      return ok
    } catch {
      prefsStatus.setSaved(false)
      return false
    }
  }
  const next = queue.then(run, run)
  queue = next
  return next
}
