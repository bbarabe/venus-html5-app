import React, { FC, ReactNode } from "react"
import classNames from "classnames"
import { GREENLINE_COLORS } from "./greenline-art"

export const DASH = "- - -"

interface ReadoutProps {
  value?: number | string
  unit?: string
  /** Decimals when value is numeric. */
  decimals?: number
  caption?: string
  live?: boolean
  tone?: "cyan" | "green"
  className?: string
  valueClassName?: string
}

const toneColor = (tone: "cyan" | "green", live: boolean) =>
  live ? (tone === "green" ? GREENLINE_COLORS.green : GREENLINE_COLORS.cyan) : GREENLINE_COLORS.gray

/** A single OPBOX numeral: big value, small unit, small caption underneath. */
export const GreenlineReadout: FC<ReadoutProps> = ({
  value,
  unit,
  decimals = 0,
  caption,
  live = true,
  tone = "cyan",
  className,
  valueClassName,
}) => {
  const color = toneColor(tone, live)
  const shown =
    value === undefined || value === null || (typeof value === "number" && !isFinite(value))
      ? DASH
      : typeof value === "number"
        ? value.toFixed(decimals)
        : value

  return (
    <div className={classNames("font-greenline leading-none", className)} style={{ color }}>
      <div className={classNames("tabular-nums", valueClassName ?? "text-xl")}>
        {shown}
        {unit && <span className="text-base ml-1">{unit}</span>}
      </div>
      {caption && <div className="text-xs mt-1 opacity-80">{caption}</div>}
    </div>
  )
}

interface RowProps {
  label: string
  value?: number | string
  unit?: string
  decimals?: number
  live?: boolean
  tone?: "cyan" | "green"
  children?: ReactNode
}

/**
 * One row of the OPBOX extended-data column. The label stays at full contrast
 * whatever the drive is doing, so the shape of the column never changes; only
 * the value greys out.
 */
export const GreenlineRow: FC<RowProps> = ({ label, value, unit, decimals = 0, live = true, tone = "cyan" }) => {
  const color = toneColor(tone, live)
  const shown =
    value === undefined || value === null || (typeof value === "number" && !isFinite(value))
      ? DASH
      : typeof value === "number"
        ? value.toFixed(decimals)
        : value

  return (
    <div className="flex items-baseline justify-between border-b border-outline-secondary py-0.5 last:border-b-0">
      <span className="text-sm text-content-secondary truncate pr-2">{label}</span>
      <span className="font-greenline text-base tabular-nums whitespace-nowrap" style={{ color }}>
        {shown}
        {unit && <span className="text-xs ml-1 opacity-80">{unit}</span>}
      </span>
    </div>
  )
}
