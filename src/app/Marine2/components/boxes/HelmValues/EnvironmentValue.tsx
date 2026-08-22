import React, { FC } from "react"
import { observer } from "mobx-react-lite"
import { useAppStore } from "@victronenergy/mfd-modules"
import ValueCell from "./ValueCell"
import { environmentIcon, environmentMeasurementLabel } from "./environment-labels"
import { EnvironmentMeasurement, useEnvironmentSensor } from "../../../modules/HelmValues"
import { formatValue } from "../../../utils/formatters/generic"
import { temperatureValueFor } from "../../../utils/formatters/temperature/temperature-value-for"

interface Props {
  instance: number
  measurement: EnvironmentMeasurement
  /**
   * True when this sensor has more than one of its readings on the panel, so
   * its name alone no longer says which cell is which.
   */
  showMeasurement?: boolean
}

/**
 * One reading off one environment sensor.
 *
 * Bound to the instance alone, like the tank cell, so a sensor that stops
 * publishing leaves an em-dash in its slot rather than a hole in the grid.
 */
const EnvironmentValue: FC<Props> = ({ instance, measurement, showMeasurement }) => {
  const sensor = useEnvironmentSensor(instance)
  const { temperatureUnit, temperatureUnitToHumanReadable } = useAppStore()
  const raw = sensor[measurement]

  // Temperature follows the app's own unit setting, as everywhere else.
  // Humidity and pressure are published as read, and read with more precision
  // than a helm has any use for — a Ruuvi reports humidity to twelve decimal
  // places — so they are rounded to what the eye can act on.
  const { value, unit } =
    measurement === "temperature"
      ? {
          value: raw === undefined ? undefined : temperatureValueFor(raw, temperatureUnit),
          unit: temperatureUnitToHumanReadable,
        }
      : { value: raw === undefined ? undefined : formatValue(raw, 0), unit: measurement === "humidity" ? "%" : "hPa" }

  const measurementLabel = environmentMeasurementLabel(measurement)
  const name = !sensor.customName
    ? measurementLabel
    : showMeasurement
      ? `${sensor.customName} · ${measurementLabel}`
      : sensor.customName

  return (
    <ValueCell
      icon={environmentIcon(measurement, "w-5 h-5 text-content-victronGray")}
      name={name}
      reading={
        value === undefined ? (
          <span className="text-content-tertiary">—</span>
        ) : (
          <>
            {value}
            <span className="text-content-secondary opacity-70"> {unit}</span>
          </>
        )
      }
    />
  )
}

export default observer(EnvironmentValue)
