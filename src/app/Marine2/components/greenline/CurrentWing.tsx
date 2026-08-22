import React, { FC } from "react"
import classNames from "classnames"
import {
  CURRENT_BAR_PORT_DOWN,
  CURRENT_BAR_PORT_UP,
  CURRENT_BAR_STARBOARD_DOWN,
  CURRENT_BAR_STARBOARD_UP,
  CURRENT_BAR_VIEWBOX,
  GREENLINE_COLORS,
} from "./greenline-art"

interface Props {
  side: "port" | "starboard"
  /** Drive DC current, A. Positive draws from the pack, negative charges it. */
  current?: number
  /** Full-scale current for the outermost segment. */
  max: number
  live?: boolean
  className?: string
}

const SEGMENTS = 13

/**
 * The OPBOX's segmented current wing: thirteen segments up from the middle for
 * propulsion, thirteen down for charge. Segments light from the hinge outward,
 * so the bar reads as thrust growing away from the waterline.
 */
const CurrentWing: FC<Props> = ({ side, current, max, live = true, className }) => {
  const up = side === "port" ? CURRENT_BAR_PORT_UP : CURRENT_BAR_STARBOARD_UP
  const down = side === "port" ? CURRENT_BAR_PORT_DOWN : CURRENT_BAR_STARBOARD_DOWN

  const value = live && typeof current === "number" ? current : 0
  const litUp = value > 0 ? Math.ceil(Math.min(value / max, 1) * SEGMENTS) : 0
  const litDown = value < 0 ? Math.ceil(Math.min(-value / max, 1) * SEGMENTS) : 0

  const segment = (d: string, index: number, lit: number, color: string, key: string) => (
    <path key={key} d={d} fill={index < lit ? color : GREENLINE_COLORS.gray} />
  )

  return (
    <svg
      viewBox={CURRENT_BAR_VIEWBOX}
      className={classNames("block", className)}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <g opacity={live ? 1 : 0.4}>
        {up.map((d, i) => segment(d, i, litUp, GREENLINE_COLORS.green, `u${i}`))}
        {down.map((d, i) => segment(d, i, litDown, GREENLINE_COLORS.cyan, `d${i}`))}
      </g>
    </svg>
  )
}

export default CurrentWing
