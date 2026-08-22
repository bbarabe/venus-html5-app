import React, { FC } from "react"

/**
 * A settings gear. The bundled `preferences` icon is an overflow menu (three
 * dots), which reads as "more" rather than "configure this panel".
 */
const GearIcon: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden="true">
    <circle cx="12" cy="12" r="3.2" strokeWidth="1.8" />
    <path
      strokeWidth="1.8"
      strokeLinejoin="round"
      d="M19.4 13.6a1.7 1.7 0 0 0 .35 1.86l.06.06a2 2 0 1 1-2.84 2.84l-.06-.06a1.7 1.7 0 0 0-1.86-.35 1.7 1.7 0 0 0-1.05 1.57V20a2 2 0 0 1-4 0v-.11a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.35l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .35-1.87 1.7 1.7 0 0 0-1.56-1.05H4a2 2 0 1 1 0-4h.11a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.35-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.35H10a1.7 1.7 0 0 0 1-1.56V4a2 2 0 1 1 4 0v.11a1.7 1.7 0 0 0 1.05 1.56 1.7 1.7 0 0 0 1.87-.35l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.35 1.87V10a1.7 1.7 0 0 0 1.56 1H20a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.56 1.05z"
    />
  </svg>
)

export default GearIcon
