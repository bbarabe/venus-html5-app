import { useMemo } from "react"
import { PortalId, useMqtt, useTopicsState } from "@victronenergy/mfd-modules"

export interface ShoreIgnoreState {
  /** 1 while Solar Priority is holding the Quattro off AC input 1. */
  ignoreAcIn1?: number
  ignoreAcIn2?: number
  /** 1 when the inverter/charger is actually drawing from an AC input. */
  activeInConnected?: number
}

export const getShoreIgnoreTopics = (portalId: PortalId, vebusInstance: number) => ({
  ignoreAcIn1: `N/${portalId}/vebus/${vebusInstance}/Ac/Control/IgnoreAcIn1`,
  ignoreAcIn2: `N/${portalId}/vebus/${vebusInstance}/Ac/Control/IgnoreAcIn2`,
  activeInConnected: `N/${portalId}/vebus/${vebusInstance}/Ac/ActiveIn/Connected`,
})

/**
 * Whether shore power is being deliberately bypassed.
 *
 * Solar Priority runs on the Cerbo and steers the Quattro by writing
 * /Ac/Control/IgnoreAcIn1 on the vebus service, so that flag — not the switch
 * service's own toggle — is what actually tells the helm the shore lead is
 * plugged in and being ignored. This is the boat's signature state and the one
 * that most needs spelling out in words.
 */
export function useShoreIgnored(vebusInstance: number): ShoreIgnoreState {
  const { portalId } = useMqtt()
  const topics = useMemo(() => getShoreIgnoreTopics(portalId, vebusInstance), [portalId, vebusInstance])
  return useTopicsState<ShoreIgnoreState>(topics)
}

export const isShoreIgnored = (state: ShoreIgnoreState) => state.ignoreAcIn1 === 1 || state.ignoreAcIn2 === 1

export interface SolarPriorityStatus {
  quattroConnected?: number
  /** system/0/SystemState/State: systemcalc derives 244 (Sustain) from the Quattro's main state and the toggle. */
  systemState?: number
  /** vebus /Dc/0/PreferRenewableEnergy: 1 prioritise renewable, 0 charge to 100 % (the GX's "Charge now"), 2 firmware's own full charge in progress. */
  preferRenewableEnergy?: number
  generatorSelected?: number
  /** dbus-solarpriority's enable toggle (its first switchable output). */
  enabled?: number
  /** shore | probe | solar | burndown | suspend */
  controllerState?: string
  controllerStatus?: string
  /** grey | green | yellow | blue | red */
  statusFill?: string
  /** "charge" | "discharge" | "" */
  oneWay?: string
  targetSoc?: number
  hold?: number
  /** 1 day, 0 night, absent while not known */
  daylight?: number
  /** what the arrays are judged to have, W */
  estimateW?: number
  /** what the boat needs to run on them, W */
  needW?: number
  /** the island's running shortfall, Wh */
  deficitWh?: number
  /** 0 none, 1 floor (shore holds the bank where it is), 2 ceiling */
  sustain?: number
}

const SYSTEM_STATE_SUSTAIN = 244

/** Native firmware feedback and the boat controller are independent observations. */
export function useSolarPriorityStatus(vebusInstance: number, switchInstance: number): SolarPriorityStatus {
  const { portalId } = useMqtt()
  const topics = useMemo(() => {
    const sp = `N/${portalId}/switch/${switchInstance}/SolarPriority`
    return {
      quattroConnected: `N/${portalId}/vebus/${vebusInstance}/Connected`,
      systemState: `N/${portalId}/system/0/SystemState/State`,
      preferRenewableEnergy: `N/${portalId}/vebus/${vebusInstance}/Dc/0/PreferRenewableEnergy`,
      generatorSelected: `N/${portalId}/vebus/${vebusInstance}/Ac/State/RemoteGeneratorSelected`,
      enabled: `N/${portalId}/switch/${switchInstance}/SwitchableOutput/output_1/State`,
      controllerState: `${sp}/State`,
      controllerStatus: `${sp}/Status`,
      statusFill: `${sp}/StatusFill`,
      oneWay: `${sp}/OneWay`,
      targetSoc: `${sp}/TargetSoc`,
      hold: `${sp}/Hold`,
      daylight: `${sp}/Daylight`,
      estimateW: `${sp}/EstimateW`,
      needW: `${sp}/NeedW`,
      deficitWh: `${sp}/DeficitWh`,
      sustain: `${sp}/Sustain`,
    }
  }, [portalId, vebusInstance, switchInstance])
  return useTopicsState<SolarPriorityStatus>(topics)
}

/**
 * The Quattro's own "Solar & wind priority" feature, in the GX's words
 * (gui-v2 PageVeBus.qml): toggle 0 is the "Charge the battery to 100%"
 * button pressed, 2 is the firmware charging to full by itself, 1 is normal
 * operation, which systemcalc reports as the Sustain system state while the
 * Quattro is in that main state.
 */
export function nativeSolarPriorityStatus(status: SolarPriorityStatus): string {
  if (status.quattroConnected !== 1) return "Unavailable"
  if (status.generatorSelected === 1) return "Off on generator input"
  if (status.preferRenewableEnergy === 2) return "Charging to 100 %"
  if (status.preferRenewableEnergy === 0) return "Charge now"
  if (status.preferRenewableEnergy === 1) {
    return status.systemState === SYSTEM_STATE_SUSTAIN ? "Prefer solar — sustaining" : "Prefer solar"
  }
  return "Not configured"
}

export type StatusTone = "gray" | "green" | "yellow" | "red"

export interface SolarPriorityBrief {
  /** One pill: where the boat's power is coming from right now. */
  headline: { label: string; tone: StatusTone }
  /** Label / value rows in plain words, for a settings list. */
  rows: { label: string; value: string }[]
}

const watts = (w: number | undefined) => (typeof w === "number" ? `${Math.round(w).toLocaleString()} W` : undefined)
const pct = (p: number | undefined) => (typeof p === "number" ? `${Math.round(p)} %` : undefined)

/**
 * What Solar Priority is doing, said the way a skipper would say it. Built
 * from the controller's structured paths, never from its status line (which
 * is a log line). `bankSoc` is the drive bank's SOC, for the held level.
 */
export function describeSolarPriority(status: SolarPriorityStatus, bankSoc?: number): SolarPriorityBrief {
  const rows: { label: string; value: string }[] = []
  const state = status.controllerState
  const on = status.enabled === 1
  const day = status.daylight === 1
  const night = status.daylight === 0
  const island = state === "solar" || state === "burndown" || state === "probe"

  let headline: SolarPriorityBrief["headline"]
  if (!state) headline = { label: "Controller not on the bus", tone: "gray" }
  else if (status.statusFill === "red") headline = { label: "Fault — on shore power", tone: "red" }
  else if (!on) headline = { label: "Shore power · Solar Priority off", tone: "gray" }
  else if (island)
    headline = { label: state === "probe" ? "Trying the sun" : "On solar · shore on standby", tone: "green" }
  else if (state === "suspend") headline = { label: "Shore power · heavy load", tone: "yellow" }
  else headline = { label: night ? "Shore power · night" : "Shore power", tone: "gray" }

  // The sun, as the controller judges it
  if (on && state) {
    if (night) rows.push({ label: "Sun", value: "None until morning" })
    else if (island) {
      const shortfall =
        typeof status.deficitWh === "number" && status.deficitWh > 0
          ? ` · ${Math.round(status.deficitWh)} Wh short so far`
          : ""
      rows.push({ label: "Sun", value: `Carrying the boat${shortfall}` })
    } else if (day && typeof status.estimateW === "number" && typeof status.needW === "number") {
      const have = watts(status.estimateW) ?? "—"
      const need = watts(status.needW) ?? "—"
      rows.push({ label: "Sun", value: `${have} of the ${need} the boat needs` })
    } else rows.push({ label: "Sun", value: "Waiting for daylight" })
  }

  // The bank: what is being done with it
  const target = pct(status.targetSoc)
  if (status.oneWay === "charge" && target)
    rows.push({ label: "Bank", value: `Charging to ${target} on the sun's time` })
  else if (status.oneWay === "discharge" && target) rows.push({ label: "Bank", value: `Letting it fall to ${target}` })
  else if (status.sustain === 1) {
    const level = pct(bankSoc)
    rows.push({
      label: "Bank",
      value: level ? `Held at ${level} until the sun returns` : "Held where it is until the sun returns",
    })
  } else if (status.hold === 1 && target) rows.push({ label: "Bank", value: `Holding around ${target}` })
  else if (target) rows.push({ label: "Bank", value: `Charge target ${target}` })

  rows.push({ label: "Quattro", value: nativeSolarPriorityStatus(status) })
  return { headline, rows }
}
