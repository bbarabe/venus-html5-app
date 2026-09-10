import { makeAutoObservable } from "mobx"
import { useMemo } from "react"
import { savePrefs } from "../Greenline/prefs.client"

/**
 * The panel is two columns — tank levels on the left, sensor readings on the
 * right — and four rows is what fits a column without the labels shrinking.
 * The cap is per column, so a boat with no sensors still gets four tanks.
 */
export const MAX_VALUES_PER_KIND = 4

const STORAGE_KEY = "greenline.helmValues"

/**
 * The measurements a temperature service can carry, in the order it lists
 * them. A sensor publishes any subset of the three on one service, so the
 * measurement is part of a reading's identity rather than the device alone.
 */
export const ENVIRONMENT_MEASUREMENTS = ["temperature", "humidity", "pressure"] as const
export type EnvironmentMeasurement = (typeof ENVIRONMENT_MEASUREMENTS)[number]

/** A tank level, addressed by the instance the tank tree published. */
export interface TankValueRef {
  kind: "tank"
  instance: number
  measurement: "level"
}

/** One reading off one environment sensor. */
export interface EnvironmentValueRef {
  kind: "environment"
  instance: number
  measurement: EnvironmentMeasurement
}

/**
 * A pinned reading.
 *
 * Nothing here names a device, a service or a boat: a ref is a tree, the
 * device instance that tree published, and which of that device's readings to
 * draw. Both trees are enumerated at runtime, so the same code covers a boat
 * with nine tanks and no sensors and one with a single Ruuvi.
 */
export type HelmValueRef = TankValueRef | EnvironmentValueRef

export type HelmValueKind = HelmValueRef["kind"]

export const helmValueKey = (ref: HelmValueRef) => `${ref.kind}/${ref.instance}/${ref.measurement}`

export const helmValueRefsEqual = (a: HelmValueRef, b: HelmValueRef) => helmValueKey(a) === helmValueKey(b)

/**
 * Trim a selection to what the panel can draw: the first
 * `MAX_VALUES_PER_KIND` of each kind, in the order they were chosen. Applied
 * on the way in as well as on the way out, so a hand-edited storage key
 * cannot overfill a column.
 */
export const capPerKind = (refs: HelmValueRef[]): HelmValueRef[] => {
  const counts: Record<HelmValueKind, number> = { tank: 0, environment: 0 }
  return refs.filter((ref) => (counts[ref.kind] += 1) <= MAX_VALUES_PER_KIND)
}

const isHelmValueRef = (value: unknown): value is HelmValueRef => {
  const ref = value as HelmValueRef
  if (!ref || !Number.isFinite(Number(ref.instance))) return false
  if (ref.kind === "tank") return ref.measurement === "level"
  if (ref.kind === "environment") return (ENVIRONMENT_MEASUREMENTS as readonly string[]).includes(ref.measurement)
  return false
}

/** Whatever came off the wire, reduced to the refs the panel can draw. */
const parseSelection = (value: unknown): HelmValueRef[] | undefined => {
  if (!Array.isArray(value)) return undefined
  return capPerKind(
    value.filter(isHelmValueRef).map((ref) => ({ ...ref, instance: Number(ref.instance) }) as HelmValueRef),
  )
}

/**
 * Which readings the helm has pinned to Home.
 *
 * The choice roams: it lives in the preferences document on the GX (see
 * `Greenline/prefs.client.ts`), so every display on the boat shows the same
 * picks and a reboot of the MFD, whose webview forgets its web storage,
 * costs nothing. localStorage keeps a copy so the page paints its last state
 * before the GX answers, and stands in when the relay is down. Storage can
 * fail or come back empty, so every access is guarded and nothing depends on
 * it working.
 *
 * `selection` stays undefined until someone actually chooses, which is what
 * separates "never configured" — fall back to whatever the bus is offering —
 * from "deliberately cleared", which has to be honoured as an empty panel.
 */
export class HelmValuesStore {
  selection?: HelmValueRef[]

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
      // No storage, or something else wrote nonsense to the key. Stay unset,
      // which means the panel falls back to the bus default.
    }
  }

  /** What the GX has on file. An empty list is a real choice; garbage is ignored. */
  hydrate(value: unknown) {
    const parsed = parseSelection(value)
    if (!parsed) return
    this.selection = parsed
    this.cache()
  }

  setSelection(refs: HelmValueRef[]) {
    this.selection = capPerKind(refs)
    this.cache()
    void savePrefs({ helmValues: this.selection })
  }

  private cache() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.selection))
    } catch {
      // No local copy; the GX still has it.
    }
  }
}

let store: HelmValuesStore

function initializeStore() {
  const _store = store ?? new HelmValuesStore()
  // For SSG and SSR always create a new store
  if (typeof window === "undefined") return _store
  // Create the store once in the client
  if (!store) store = _store

  return _store
}

export function useHelmValuesStore() {
  return useMemo(() => initializeStore(), [])
}
