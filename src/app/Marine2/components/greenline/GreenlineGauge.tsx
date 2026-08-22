import React, { FC, useMemo } from "react"
import classNames from "classnames"
import {
  BEZEL_PATH,
  GAUGE_CENTER,
  GREENLINE_COLORS,
  INNER_RING_PATH,
  NEEDLE_HUB,
  NEEDLE_SHORT_PATH,
  RPM_POINTER_POINTS,
} from "./greenline-art"
import { angleForFraction, arcTo, clampFraction, DIAL, dialLabels, minorTicksPath, ticksPath } from "./geometry"
import { DriveTone, TONE_COLOR } from "./engine-mode"

interface Props {
  /** Shaft speed, rpm. undefined renders the dial at rest with dashes. */
  rpm?: number
  rpmMax: number
  /** Drive power, kW — the inner dial. Absolute value is shown. */
  powerKw?: number
  powerMax: number
  /** Caption under the readout, e.g. "PORT". */
  label?: string
  /** Greyed out when the drive is not publishing. */
  live?: boolean
  /** Colour of the rpm dial: green under electric drive, cyan otherwise. */
  tone?: DriveTone
  className?: string
}

const dash = "- - -"

/**
 * The Greenline drive dial: rpm on the outer ring in cyan, kW on the inner
 * ring in green, exactly as the OPBOX draws it. Both dials share the 270 deg
 * sweep and the bottom gap that holds the two numerals.
 */
const GreenlineGauge: FC<Props> = ({
  rpm,
  rpmMax,
  powerKw,
  powerMax,
  label,
  live = true,
  tone = "cyan",
  className,
}) => {
  // The HMI flips its whole rpm dial with vehicle mode but leaves the inner
  // kW dial green, since that one is always the electrical side.
  const rpmColor = TONE_COLOR[live ? tone : "gray"]
  const powerColor = live ? GREENLINE_COLORS.green : GREENLINE_COLORS.gray

  const rpmFraction = clampFraction(Math.abs(rpm ?? 0), rpmMax)
  const powerFraction = clampFraction(Math.abs(powerKw ?? 0), powerMax)

  const rpmLabels = useMemo(() => dialLabels(rpmMax, DIAL.rpm.labelRadius), [rpmMax])
  const powerLabels = useMemo(() => dialLabels(powerMax, DIAL.power.labelRadius), [powerMax])

  const rpmTicks = useMemo(() => ticksPath(DIAL.rpm.tickOuter, DIAL.rpm.tickMajorInner, DIAL.majorTicks), [])
  const rpmMinor = useMemo(() => minorTicksPath(DIAL.rpm.tickOuter, DIAL.rpm.tickMinorInner), [])
  const powerTicks = useMemo(() => ticksPath(DIAL.power.tickOuter, DIAL.power.tickMajorInner, DIAL.majorTicks), [])
  const powerMinor = useMemo(() => minorTicksPath(DIAL.power.tickOuter, DIAL.power.tickMinorInner), [])

  return (
    <div className={classNames("font-greenline relative w-full", className)}>
      <svg viewBox={`0 0 ${DIAL.size} 410`} className="w-full h-full block">
        {/* Bezel and inner separator ring, straight off the HMI. */}
        <g transform={`scale(${DIAL.size / 395.9})`}>
          <path d={BEZEL_PATH} fill={rpmColor} opacity={live ? 1 : 0.4} />
          <path d={INNER_RING_PATH} fill={powerColor} opacity={live ? 1 : 0.4} />
        </g>

        {/* rpm dial */}
        <path d={rpmMinor} stroke={rpmColor} strokeWidth={1} opacity={live ? 1 : 0.5} fill="none" />
        <path d={rpmTicks} stroke={rpmColor} strokeWidth={1} opacity={live ? 1 : 0.5} fill="none" />
        {arcTo(rpmFraction, DIAL.rpm.ringRadius) && (
          <path
            d={arcTo(rpmFraction, DIAL.rpm.ringRadius)}
            stroke={rpmColor}
            strokeWidth={DIAL.rpm.ringWidth}
            fill="none"
            opacity={0.5}
          />
        )}
        {rpmLabels.map((l) => (
          <text
            key={`r${l.key}`}
            x={l.x}
            y={l.y}
            fill={rpmColor}
            fontSize={14}
            textAnchor="middle"
            dy="0.35em"
            opacity={live ? 1 : 0.6}
          >
            {l.text}
          </text>
        ))}

        {/* kW dial */}
        <path d={powerMinor} stroke={powerColor} strokeWidth={1} opacity={live ? 1 : 0.5} fill="none" />
        <path d={powerTicks} stroke={powerColor} strokeWidth={1} opacity={live ? 1 : 0.5} fill="none" />
        {arcTo(powerFraction, DIAL.power.ringRadius) && (
          <path
            d={arcTo(powerFraction, DIAL.power.ringRadius)}
            stroke={powerColor}
            strokeWidth={DIAL.power.ringWidth}
            fill="none"
            opacity={0.5}
          />
        )}
        {powerLabels.map((l) => (
          <text
            key={`p${l.key}`}
            x={l.x}
            y={l.y}
            fill={powerColor}
            fontSize={9}
            textAnchor="middle"
            dy="0.35em"
            opacity={live ? 1 : 0.6}
          >
            {l.text}
          </text>
        ))}

        {/* Pointers. The rpm hand is the triangle riding the outer ring, the
            kW hand is the short needle — same two symbols the HMI uses. */}
        <g transform={`rotate(${-(angleForFraction(rpmFraction) - 90)} ${GAUGE_CENTER} ${GAUGE_CENTER})`}>
          <polygon points={RPM_POINTER_POINTS} fill={rpmColor} opacity={live ? 1 : 0.45} />
        </g>
        <g transform={`rotate(${-(angleForFraction(powerFraction) - 90)} ${GAUGE_CENTER} ${GAUGE_CENTER})`}>
          <path d={NEEDLE_SHORT_PATH} fill={powerColor} opacity={live ? 1 : 0.45} />
        </g>
        <circle cx={NEEDLE_HUB.cx} cy={NEEDLE_HUB.cy} r={NEEDLE_HUB.r} fill={GREENLINE_COLORS.gray} />

        {/* Readouts, in the bottom gap where the OPBOX puts them. */}
        <text x={198} y={296} fill={powerColor} fontSize={19} textAnchor="middle" dy="0.35em">
          {powerKw === undefined ? dash : Math.abs(powerKw).toFixed(1)}
        </text>
        <text x={198} y={317} fill={powerColor} fontSize={11} textAnchor="middle" dy="0.35em">
          kW
        </text>
        <text x={198} y={363} fill={rpmColor} fontSize={30} textAnchor="middle" dy="0.35em">
          {rpm === undefined ? dash : Math.round(Math.abs(rpm))}
        </text>
        <text x={198} y={387} fill={rpmColor} fontSize={12} textAnchor="middle" dy="0.35em">
          {label ? `${label} · RPM` : "RPM"}
        </text>
      </svg>
    </div>
  )
}

export default GreenlineGauge
