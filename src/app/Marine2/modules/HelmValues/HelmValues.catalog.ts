import { useMemo } from "react"
import { TankState, TemperatureState, useTanks, useTemperatures } from "@victronenergy/mfd-modules"
import { sortTanks } from "../../utils/helpers/devices/tanks/sort-tanks"
import { ENVIRONMENT_MEASUREMENTS, HelmValueRef, capPerKind } from "./HelmValues.store"

export interface HelmValueCatalog {
  /** Tank instances on the bus, in the same order the stock Tanks page uses. */
  tankInstances: number[]
  /** Environment sensor instances on the bus, lowest first. */
  sensorInstances: number[]
  /** What the panel shows before anyone has chosen. */
  defaultSelection: HelmValueRef[]
}

/**
 * Everything on this bus that can be pinned to the panel.
 *
 * Both trees are discovered from their `+/DeviceInstance` wildcard by the
 * stock providers, so the catalogue is simply whatever the GX is publishing.
 * There is no list of expected devices anywhere.
 */
export const useHelmValueCatalog = (): HelmValueCatalog => {
  const { tanks } = useTanks()
  const { temperatures } = useTemperatures()

  return useMemo(() => {
    const sortedTanks = sortTanks(tanks ?? [])
    const sortedSensors = (temperatures ?? []).slice().sort((a, b) => a.instance - b.instance)

    // A tank service with neither a level nor a capacity has nothing to draw —
    // the stock Tank row declines to render it too — so it stays out of the
    // opening hand. It is still pinnable by hand from the picker.
    const tankDefaults = sortedTanks
      .filter((tank: TankState) => tank.level !== undefined || tank.capacity !== undefined)
      .map((tank: TankState): HelmValueRef => ({ kind: "tank", instance: tank.instance, measurement: "level" }))

    // Breadth first: every sensor's primary reading before any sensor's
    // second. Three rooms each showing a temperature tells a helm more than
    // one room shown three ways, and the rule needs to know nothing about the
    // rooms to produce it.
    const sensorDefaults = ENVIRONMENT_MEASUREMENTS.flatMap((measurement) =>
      sortedSensors
        .filter((sensor: TemperatureState) => sensor[measurement] !== undefined)
        .map(
          (sensor: TemperatureState): HelmValueRef => ({ kind: "environment", instance: sensor.instance, measurement }),
        ),
    )

    return {
      tankInstances: sortedTanks.map((tank: TankState) => tank.instance),
      sensorInstances: sortedSensors.map((sensor: TemperatureState) => sensor.instance),
      // Each column simply fills with the first devices the bus offers, which
      // is as close to "no opinion" as a default can get.
      defaultSelection: capPerKind([...tankDefaults, ...sensorDefaults]),
    }
  }, [tanks, temperatures])
}
