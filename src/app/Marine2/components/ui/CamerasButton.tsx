import React from "react"
import { translate } from "react-i18nify"

/**
 * One tap from Home to the camera page. The page is not part of this app: the
 * camera relay on the GX serves it on port 8095 (Boat NMEA/camera-relay), so
 * this is a plain navigation, the same one the Diagnostics page offers.
 */
const CamerasButton = () => {
  const open = () => {
    window.location.href = `${window.location.protocol}//${window.location.hostname}:8095/`
  }
  return (
    <button
      type="button"
      onClick={open}
      aria-label={translate("diagnostics.video.cameraTest")}
      className="p-1 -mt-1 rounded-md text-content-secondary active:text-content-primary"
    >
      <svg
        viewBox="0 0 24 24"
        className="w-7 h-7 md-m:w-8 md-m:h-8"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeWidth="1.8"
          strokeLinejoin="round"
          d="M4 8.5h3.2l1.5-2.5h6.6l1.5 2.5H20a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1z"
        />
        <circle cx="12" cy="13.5" r="3.4" strokeWidth="1.8" />
      </svg>
    </button>
  )
}

export default CamerasButton
