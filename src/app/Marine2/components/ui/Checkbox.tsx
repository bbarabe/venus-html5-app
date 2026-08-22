import React, { FC } from "react"
import classNames from "classnames"

/**
 * The tick used by the Home panels' pickers. Drawn rather than bundled: the
 * icon set has no checkbox, and the pickers need the three states — checked,
 * available, out of reach because the cap is full — to be told apart at a
 * glance on a helm display.
 */
const Checkbox: FC<{ checked: boolean; disabled?: boolean }> = ({ checked, disabled }) => (
  <span
    className={classNames(
      "w-7 h-7 shrink-0 rounded-sm border-px-2 flex items-center justify-center",
      checked
        ? "border-content-victronBlue bg-surface-victronBlue"
        : disabled
          ? "border-content-victronGray50"
          : "border-content-victronGray",
    )}
  >
    {checked && (
      <svg viewBox="0 0 16 16" className="w-4 h-4 text-content-victronBlue" aria-hidden="true">
        <path d="M2 8.5 6 12.5 14 4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )}
  </span>
)

export default Checkbox
