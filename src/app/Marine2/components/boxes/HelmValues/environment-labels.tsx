import React from "react"
import { translate } from "react-i18nify"
import ThermometerIcon from "../../../images/icons/thermometer.svg"
import HumidityIcon from "../../../images/icons/humidity.svg"
import PressureIcon from "../../../images/icons/pressure.svg"
import { EnvironmentMeasurement } from "../../../modules/HelmValues"

/**
 * How each environment measurement is named and drawn. Keyed by the D-Bus
 * path the sensor publishes, so adding a measurement here is the only change
 * a new one would need — no sensor, model or boat is named.
 */
export const environmentIcon = (measurement: EnvironmentMeasurement, className: string) => {
  switch (measurement) {
    case "humidity":
      return <HumidityIcon className={className} />
    case "pressure":
      return <PressureIcon className={className} />
    default:
      return <ThermometerIcon className={className} />
  }
}

export const environmentMeasurementLabel = (measurement: EnvironmentMeasurement) => {
  switch (measurement) {
    case "humidity":
      return translate("boxes.humidity")
    case "pressure":
      return translate("boxes.pressure")
    default:
      return translate("boxes.temperature")
  }
}
