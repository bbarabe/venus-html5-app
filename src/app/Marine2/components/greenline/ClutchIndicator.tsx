import React, { FC } from "react"
import classNames from "classnames"
import { CLUTCH_PATHS_PORT, CLUTCH_PATHS_STARBOARD, CLUTCH_VIEWBOX } from "./greenline-art"
import { DriveTone, TONE_COLOR } from "./engine-mode"
import { MotorDirection } from "../../modules/Greenline"

/**
 * The shaft glyph the OPBOX shows outboard of each drive: three curved bands
 * with an arrow at each end for the direction of thrust.
 *
 * The HMI picks between the four drawings with its own ClutchState tag, which
 * is not on D-Bus, so they are indexed from /Motor/Direction instead. Reading
 * the artwork, the engaged states are the ones with a *solid* arrow — state 3
 * solid ahead, state 1 solid astern — while state 0 leaves both arrows hollow,
 * which is neutral. A drive that is not publishing is shown in neutral too: a
 * silent drive is not in gear, and showing anything else at a helm would be a
 * lie. The gear is always printed in words next to this, and the word is the
 * authority.
 */
const stateForDirection = (direction?: number) => {
  switch (direction) {
    case MotorDirection.FORWARD:
      return 3
    case MotorDirection.REVERSE:
      return 1
    default:
      return 0
  }
}

interface Props {
  side: "port" | "starboard"
  direction?: number
  live?: boolean
  tone?: DriveTone
  className?: string
}

const ClutchIndicator: FC<Props> = ({ side, direction, live = true, tone = "cyan", className }) => {
  const paths = side === "port" ? CLUTCH_PATHS_PORT : CLUTCH_PATHS_STARBOARD

  return (
    <svg
      viewBox={CLUTCH_VIEWBOX}
      className={classNames("block", className)}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <path
        d={paths[stateForDirection(live ? direction : undefined)]}
        fill={TONE_COLOR[live ? tone : "gray"]}
        opacity={live ? 1 : 0.5}
      />
    </svg>
  )
}

export default ClutchIndicator
