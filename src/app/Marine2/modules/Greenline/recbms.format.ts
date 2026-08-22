import { translate } from "react-i18nify"
import { timeAsStringFormatter } from "../../utils/formatters/generic"

/**
 * A time-to-go of days is the BMS saying "not really going anywhere". The
 * driver publishes a raw seconds figure that runs to months when the current
 * is near zero, which is noise rather than information at a helm.
 */
const TIME_SANITY_LIMIT_S = 100 * 3600

export const formatDuration = (seconds?: number) => {
  if (typeof seconds !== "number" || seconds <= 0 || seconds > TIME_SANITY_LIMIT_S) return "—"
  return timeAsStringFormatter(translate, seconds)
}

export const chargeStateLabel = (current?: number) => {
  if (typeof current !== "number") return "—"
  if (current > 0.5) return "Charging"
  if (current < -0.5) return "Discharging"
  return "Idle"
}
