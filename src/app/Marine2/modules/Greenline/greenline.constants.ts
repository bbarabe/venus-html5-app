/**
 * Fixed device instances for this boat's hard-coded panels.
 *
 * The Greenline Helm views bind to known services rather than enumerating the
 * bus, so every panel keeps its place even while a service is silent. These
 * are the instances pinned by the boat's own drivers:
 *
 *   dbus-edrive   -> motordrive/210 (port), motordrive/211 (starboard)
 *   dbus-recbms   -> battery/200    (REC-BMS main bank)
 *
 * Change them here if the drivers are ever repinned; nothing else hard-codes
 * an instance number.
 */
export const GREENLINE_INSTANCES = {
  drivePort: 210,
  driveStarboard: 211,
  driveBattery: 200,
  /** The Quattro. Solar Priority steers shore input through this service. */
  vebus: 276,
  /** dbus-recbms' "Max Charge" slider. */
  maxChargeSwitch: 220,
  /** dbus-solarpriority's enable toggle. */
  solarPrioritySwitch: 221,
}

/**
 * Service ids (as they appear in system/0/Batteries) that must not show up in
 * the "12 V Batteries" panel: the drive bank has its own hero panel, and the
 * Quattro reports the same bank a second time.
 */
export const DRIVE_BANK_BATTERY_IDS = ["com.victronenergy.battery.recbms", "com.victronenergy.vebus.ttyS4"]

/** Full-scale values for the Greenline gauges. The OPBOX uses the same. */
export const GAUGE_MAX = {
  rpm: 4200,
  /** Per-motor propulsion power, kW. */
  powerKw: 25,
  /**
   * Per-motor DC current, A — the segmented propulsion/charge wings.
   * The HMI scales these from a live BattCurrent/MX tag that is not on
   * D-Bus, so full scale is derived instead: 25 kW at the pack's ~55 V.
   */
  currentA: 450,
}
