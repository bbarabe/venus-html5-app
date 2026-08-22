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
