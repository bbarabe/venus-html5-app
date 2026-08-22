import { EDriveState, isDriveLive, MotorDirection } from "../../modules/Greenline"
import { GREENLINE_COLORS } from "./greenline-art"

export type EngineMode = "off" | "idle" | "electric" | "diesel"

/** The HMI's three data states: silent, diesel/idle, electric. */
export type DriveTone = "gray" | "green" | "cyan"

/**
 * The OPBOX shows an engine mode word (IDLE / EL. MOTOR / DIESEL-GEN / ERROR)
 * from a tag the Greenline HMI owns. That tag is not on D-Bus, so the word is
 * derived from what dbus-edrive does publish.
 *
 * The diesel case is an inference, and the only one available on this boat: on
 * a parallel hybrid the diesel turns the same shaft, so a shaft that is turning
 * while the e-motor is not drawing from the pack is being turned by the diesel.
 * Below that, `power` has to be a real number — an absent reading is not
 * evidence of anything.
 */
export const engineModeFor = (drive: EDriveState): EngineMode => {
  if (!isDriveLive(drive)) return "off"
  if (Math.abs(drive.rpm ?? 0) < 1) return "idle"
  if (typeof drive.power === "number" && drive.power <= 0) return "diesel"
  return "electric"
}

export const ENGINE_MODE_LABEL: Record<EngineMode, string> = {
  off: "DRIVE OFF",
  idle: "IDLE",
  electric: "EL. MOTOR",
  diesel: "DIESEL/GEN",
}

/**
 * Colour for a side's readouts, following the HMI's own palette: grey while
 * the drive is silent, green under electric drive, cyan otherwise. The HMI
 * flips the whole rpm dial this way from its VehicleMode tag.
 */
export const driveToneFor = (drive: EDriveState): DriveTone => {
  switch (engineModeFor(drive)) {
    case "off":
      return "gray"
    case "electric":
      return "green"
    default:
      return "cyan"
  }
}

export const TONE_COLOR: Record<DriveTone, string> = {
  gray: GREENLINE_COLORS.gray,
  green: GREENLINE_COLORS.green,
  cyan: GREENLINE_COLORS.cyan,
}

/**
 * The gear in words. A silent drive reads as no data rather than NEUTRAL:
 * the glyph beside this shows the shaft at rest, but asserting a gear
 * position nobody is reporting is not something to do at a helm.
 */
export const gearLabelFor = (drive: EDriveState): string => {
  if (!isDriveLive(drive)) return "- - -"
  switch (drive.direction) {
    case MotorDirection.FORWARD:
      return "FWD"
    case MotorDirection.REVERSE:
      return "REV"
    case MotorDirection.NEUTRAL:
      return "NEUTRAL"
    default:
      return "- - -"
  }
}

/** Watts to kilowatts, keeping undefined undefined so readouts show dashes. */
export const kw = (watts?: number) => (typeof watts === "number" ? watts / 1000 : undefined)
