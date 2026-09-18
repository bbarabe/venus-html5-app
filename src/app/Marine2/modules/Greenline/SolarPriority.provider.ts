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
  controllerState?: string
  controllerStatus?: string
  oneWay?: string
}

const SYSTEM_STATE_SUSTAIN = 244

/** Native firmware feedback and the boat controller are independent observations. */
export function useSolarPriorityStatus(vebusInstance: number, switchInstance: number): SolarPriorityStatus {
  const { portalId } = useMqtt()
  const topics = useMemo(
    () => ({
      quattroConnected: `N/${portalId}/vebus/${vebusInstance}/Connected`,
      systemState: `N/${portalId}/system/0/SystemState/State`,
      preferRenewableEnergy: `N/${portalId}/vebus/${vebusInstance}/Dc/0/PreferRenewableEnergy`,
      generatorSelected: `N/${portalId}/vebus/${vebusInstance}/Ac/State/RemoteGeneratorSelected`,
      controllerState: `N/${portalId}/switch/${switchInstance}/SolarPriority/State`,
      controllerStatus: `N/${portalId}/switch/${switchInstance}/SolarPriority/Status`,
      oneWay: `N/${portalId}/switch/${switchInstance}/SolarPriority/OneWay`,
    }),
    [portalId, vebusInstance, switchInstance],
  )
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
  if (status.generatorSelected === 1) return "Overridden by generator input"
  if (status.preferRenewableEnergy === 2) return "Charging to 100 % — in progress"
  if (status.preferRenewableEnergy === 0) return "Charge now — charging the battery to 100 %"
  if (status.preferRenewableEnergy === 1) {
    return status.systemState === SYSTEM_STATE_SUSTAIN
      ? "Prioritising renewable energy — sustain"
      : "Prioritising renewable energy"
  }
  return "Not configured"
}
