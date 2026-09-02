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

/**
 * Amp-hours drawn from the pack, as a magnitude.
 *
 * Venus publishes `/ConsumedAmphours` as a negative delta from full, which is
 * the right convention for a signed reading but wrong under a label that
 * already says "Consumed" — "-580 consumed" reads as a credit rather than a
 * debit.
 */
export const consumedAh = (consumedAmphours?: number) =>
  typeof consumedAmphours === "number" ? Math.abs(consumedAmphours) : undefined

/**
 * "<drawn> of <pack size>".
 *
 * The pair has to come from `/InstalledCapacity`, **not** `/Capacity`:
 * `/Capacity` is what is *left*, so pairing it with consumed amp-hours states
 * a total that shrinks as the pack empties. On this boat that read
 * "580 of 860 Ah" — 67% gone — while the pack was 60% full. The two always
 * sum to the installed figure, which is the only fixed number of the three.
 *
 * Without an installed capacity there is no honest denominator, so the drawn
 * figure stands alone rather than borrowing the wrong one.
 */
export const consumedOfCapacity = (
  consumedAmphours: number | undefined,
  installedCapacity: number | undefined,
  format: (value?: number, decimals?: number) => string,
) => {
  const drawn = format(consumedAh(consumedAmphours), 0)
  return installedCapacity === undefined ? `${drawn} Ah` : `${drawn} of ${format(installedCapacity, 0)} Ah`
}
