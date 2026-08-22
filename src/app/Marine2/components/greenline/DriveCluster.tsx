import React, { FC } from "react"
import classNames from "classnames"
import { observer } from "mobx-react-lite"
import ClutchIndicator from "./ClutchIndicator"
import CurrentWing from "./CurrentWing"
import { DASH } from "./GreenlineReadout"
import { CHARGE_ICON_PATH, GREENLINE_COLORS, PROPULSION_ICON_PATH } from "./greenline-art"
import { driveToneFor, ENGINE_MODE_LABEL, engineModeFor, gearLabelFor, kw, TONE_COLOR } from "./engine-mode"
import { EDriveState, GAUGE_MAX, isDriveLive } from "../../modules/Greenline"

interface Props {
  port: EDriveState
  starboard: EDriveState
  className?: string
}

const WingIcon: FC<{ path: string; color: string }> = ({ path, color }) => (
  <svg viewBox="0 0 30 30" className="w-4 h-4 shrink-0" aria-hidden="true">
    <path d={path} fill={color} />
  </svg>
)

/** The outboard current wing with its propulsion / charge captions. */
const WingColumn: FC<{ drive: EDriveState; side: "port" | "starboard" }> = ({ drive, side }) => {
  const live = isDriveLive(drive)
  // Propulsion and charge keep the HMI's own two colours: these mark which way
  // the energy is going, not which prime mover is turning the shaft.
  const propulsion = live ? GREENLINE_COLORS.green : GREENLINE_COLORS.gray
  const charge = live ? GREENLINE_COLORS.cyan : GREENLINE_COLORS.gray

  return (
    <div className="w-16 shrink-0 h-full min-h-0 flex flex-col items-center">
      <WingIcon path={PROPULSION_ICON_PATH} color={propulsion} />
      {/* Absolutely-filled SVG so the art can never drive the box height. */}
      <div className="relative flex-1 min-h-0 w-full my-1">
        <CurrentWing
          side={side}
          current={drive.current}
          max={GAUGE_MAX.currentA}
          live={live}
          className="absolute inset-0 w-full h-full"
        />
      </div>
      <WingIcon path={CHARGE_ICON_PATH} color={charge} />
    </div>
  )
}

const SideColumn: FC<{ drive: EDriveState; side: "port" | "starboard" }> = ({ drive, side }) => {
  const live = isDriveLive(drive)
  const tone = TONE_COLOR[driveToneFor(drive)]
  // The kW dial is the electrical side of the drive, so it stays green while
  // there is anything to read — the HMI does not flip it with vehicle mode.
  const powerTone = live ? GREENLINE_COLORS.green : GREENLINE_COLORS.gray
  const power = kw(drive.power)
  const isPort = side === "port"

  return (
    <div
      className={classNames(
        "font-greenline flex flex-col justify-center min-w-0 leading-none",
        isPort ? "items-start text-left" : "items-end text-right",
      )}
    >
      <div className="text-2xs tracking-widest" style={{ color: tone }}>
        {isPort ? "PORT" : "STARBOARD"}
      </div>
      <div className="flex items-baseline gap-1 mt-1" style={{ color: tone }}>
        <span className="text-xl tabular-nums">
          {live && drive.rpm !== undefined ? Math.abs(Math.round(drive.rpm)) : DASH}
        </span>
        <span className="text-2xs">RPM</span>
      </div>
      <div className="flex items-baseline gap-1 mt-1" style={{ color: powerTone }}>
        <span className="text-md tabular-nums">{power === undefined ? DASH : Math.abs(power).toFixed(1)}</span>
        <span className="text-2xs">kW</span>
      </div>
      <div className="text-2xs mt-3 text-content-secondary">ENGINE MODE</div>
      <div className="text-sm truncate max-w-full" style={{ color: tone }}>
        {ENGINE_MODE_LABEL[engineModeFor(drive)]}
      </div>
      <div className="text-2xs mt-2 text-content-secondary">GEAR</div>
      <div className="text-sm truncate max-w-full" style={{ color: tone }}>
        {gearLabelFor(drive)}
      </div>
    </div>
  )
}

/**
 * The Greenline home cluster for a twin e-drive boat, laid out the way the
 * OPBOX lays it out: current wings outboard, shaft glyphs inboard of them and
 * centred on the wings, and the port / starboard readouts facing each other.
 *
 * Nothing hides when a drive goes quiet — dbus-edrive blanks its values six
 * seconds after the hybrid system is powered down, which is the normal state at
 * the dock, and the helm should not have the page reflow underneath it.
 */
const DriveCluster: FC<Props> = ({ port, starboard, className }) => (
  <div className={classNames("flex items-stretch h-full min-h-0 min-w-0 gap-2 overflow-hidden", className)}>
    <WingColumn drive={port} side="port" />
    <ClutchIndicator
      side="port"
      direction={port.direction}
      live={isDriveLive(port)}
      tone={driveToneFor(port)}
      className="w-8 h-24 shrink-0 self-center"
    />
    <div className="flex-1 min-w-0 flex items-stretch justify-between gap-2">
      <SideColumn drive={port} side="port" />
      <SideColumn drive={starboard} side="starboard" />
    </div>
    <ClutchIndicator
      side="starboard"
      direction={starboard.direction}
      live={isDriveLive(starboard)}
      tone={driveToneFor(starboard)}
      className="w-8 h-24 shrink-0 self-center"
    />
    <WingColumn drive={starboard} side="starboard" />
  </div>
)

export default observer(DriveCluster)
