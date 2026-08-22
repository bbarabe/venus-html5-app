import React, { FC, ReactNode } from "react"
import classNames from "classnames"

/**
 * The Cerbo Touch overview draws its energy nodes as outlined cards joined by
 * short runs of "wire" with beads on them. These are those two pieces.
 */

interface CardProps {
  icon: ReactNode
  title: string
  className?: string
  children?: ReactNode
  /** Dimmed when the node has nothing flowing through it. */
  muted?: boolean
}

export const FlowCard: FC<CardProps> = ({ icon, title, className, children, muted }) => (
  <div
    className={classNames(
      "min-w-0 min-h-0 flex flex-col rounded-md border-px-1 overflow-hidden",
      muted ? "border-outline-secondary" : "border-content-victronBlue50",
      className,
    )}
    style={{ backgroundColor: "rgba(var(--c-victron-blue-rgb), 0.10)" }}
  >
    <div className="flex items-center gap-2 px-3 pt-2 shrink-0 min-w-0">
      <span className="shrink-0 text-content-victronBlue flex">{icon}</span>
      <span className="text-sm text-content-secondary truncate">{title}</span>
    </div>
    {children}
  </div>
)

/** A card's headline figure: big number, quieter unit. */
export const FlowValue: FC<{ value?: string; unit?: string; muted?: boolean; className?: string }> = ({
  value,
  unit,
  muted,
  className,
}) => (
  <div className={classNames("px-3 pb-2 flex items-baseline min-w-0", className)}>
    <span className={classNames("text-xxl tabular-nums truncate", muted && "text-content-tertiary")}>
      {value ?? "--"}
    </span>
    {unit && <span className="text-md text-content-secondary ml-1 shrink-0">{unit}</span>}
  </div>
)

const Bead = () => <span className="w-1.5 h-1.5 rounded-full bg-content-secondary shrink-0" />

/**
 * A run of wire between two nodes. Beads mark it as a path rather than a
 * border; the Cerbo animates them, this does not — an MFD webview has better
 * things to spend a repaint on.
 */
export const FlowLink: FC<{ orientation?: "horizontal" | "vertical"; active?: boolean }> = ({
  orientation = "horizontal",
  active = true,
}) => {
  const line = active ? "bg-content-victronBlue" : "bg-outline-secondary"
  if (orientation === "vertical") {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <div className={classNames("w-px-2 flex-1", line)} />
        <div className="flex flex-col gap-1 py-1">
          <Bead />
          <Bead />
        </div>
        <div className={classNames("w-px-2 flex-1", line)} />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className={classNames("h-px-2 flex-1", line)} />
      <div className="flex gap-1 px-1">
        <Bead />
        <Bead />
      </div>
      <div className={classNames("h-px-2 flex-1", line)} />
    </div>
  )
}
