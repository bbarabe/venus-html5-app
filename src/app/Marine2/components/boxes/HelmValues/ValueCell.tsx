import React, { FC, ReactNode } from "react"
import classNames from "classnames"

interface Props {
  icon: ReactNode
  /** The device's own name, or the generic name for what it measures. */
  name: string
  /** Tanks fill the left of the reading line with their level bar. */
  bar?: ReactNode
  reading: ReactNode
}

/**
 * One pinned reading.
 *
 * Two lines, always: what it is, then what it says. Tanks and sensors share
 * the shape so six of them read as one block rather than as two lists that
 * happen to be adjacent, and so a cell keeps its size whichever kind of
 * reading lands in it.
 */
const ValueCell: FC<Props> = ({ icon, name, bar, reading }) => (
  <div className="min-w-0 min-h-0 rounded-md bg-surface-tertiary px-2 py-1 flex flex-col justify-center">
    <div className="flex items-center gap-1 min-w-0">
      <span className="shrink-0 flex items-center">{icon}</span>
      <span className="truncate text-xs text-content-secondary">{name}</span>
    </div>
    <div className="flex items-center gap-2 min-w-0">
      {bar ? <div className="flex-1 min-w-0">{bar}</div> : null}
      <div className={classNames("min-w-0 truncate tabular-nums text-base text-end", bar ? "shrink-0" : "flex-1")}>
        {reading}
      </div>
    </div>
  </div>
)

export default ValueCell
