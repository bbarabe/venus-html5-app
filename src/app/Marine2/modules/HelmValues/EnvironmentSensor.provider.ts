import { useMemo } from "react"
import { PortalId, useMqtt, useTopicsState } from "@victronenergy/mfd-modules"
import { ENVIRONMENT_MEASUREMENTS, EnvironmentMeasurement } from "./HelmValues.store"

export interface EnvironmentSensorState {
  customName?: string
  temperature?: number
  humidity?: number
  pressure?: number
}

export const getEnvironmentSensorTopics = (portalId: PortalId, instance: number) => ({
  customName: `N/${portalId}/temperature/${instance}/CustomName`,
  temperature: `N/${portalId}/temperature/${instance}/Temperature`,
  humidity: `N/${portalId}/temperature/${instance}/Humidity`,
  pressure: `N/${portalId}/temperature/${instance}/Pressure`,
})

/**
 * One environment sensor, live.
 *
 * The stock `useTemperature` / `useHumidity` / `usePressure` hooks each read a
 * slice of the same service. A sensor is one device on the bus, so this reads
 * the whole service once and lets the caller pick the measurement — which
 * means "what can this sensor show" is answered by which fields came back
 * defined, rather than by anything the code was told in advance.
 */
export function useEnvironmentSensor(instance: number): EnvironmentSensorState {
  const { portalId } = useMqtt()
  const topics = useMemo(() => getEnvironmentSensorTopics(portalId, instance), [portalId, instance])
  return useTopicsState<EnvironmentSensorState>(topics)
}

/** The measurements this sensor is publishing right now. */
export const measurementsPresent = (sensor: EnvironmentSensorState): EnvironmentMeasurement[] =>
  ENVIRONMENT_MEASUREMENTS.filter((measurement) => sensor[measurement] !== undefined)
