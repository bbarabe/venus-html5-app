import React, { useEffect, useState } from "react"
import MainLayout from "../ui/MainLayout"
import DiagnosticsTable from "../ui/DiagnosticsTable"
import { MqttStore, useMqtt } from "@victronenergy/mfd-modules"
import { translate } from "react-i18nify"
import { observer } from "mobx-react-lite"
import { useWindowSize } from "../../utils/hooks/use-window-size"
import Paginator from "../ui/Paginator"
import { useBrowserFeatures, WebGLDiagnostics } from "../../utils/hooks/use-browser-features"
import { useVideoFeatures, VideoFeatures } from "../../utils/hooks/use-video-features"
import Button from "../ui/Button"
import { reloadApp } from "../../utils/reload-app"
import { prefsStatus, relayBase } from "../../modules/Greenline/prefs.client"

const DiagnosticsView = () => {
  const mqtt = useMqtt()
  const windowSize = useWindowSize()
  const browserFeatures = useBrowserFeatures()
  const videoFeatures = useVideoFeatures()
  // Re-render to sync button label when diagConsole visibility changes (including [Close])
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    if (window.diagConsole) {
      window.diagConsole.onVisibilityChange(() => forceUpdate((n) => n + 1))
      return () => window.diagConsole?.onVisibilityChange(null)
    }
  }, [])

  const toggleDiagConsole = () => {
    if (window.diagConsole) {
      window.diagConsole.toggle()
    }
  }

  // The camera relay (Boat NMEA/camera-relay) serves its test page on port 8095 of
  // the same host; the MFD cannot type a URL, so this is the way in. Same-page
  // navigation on purpose: the test page links back to /app/.
  const openCameraTest = () => {
    window.location.href = `${window.location.protocol}//${window.location.hostname}:8095/`
  }

  const connectionDiagnostics = (
    <DiagnosticsTable
      title={translate("diagnostics.connection.connection")}
      diagnostics={getConnectionDiagnostics(mqtt)}
    />
  )

  const deviceDiagnostics = (
    <DiagnosticsTable
      title={translate("diagnostics.device.device")}
      diagnostics={[
        ...getDeviceDiagnostics(windowSize, browserFeatures),
        {
          property: translate("diagnostics.device.prefs"),
          value: formatPrefsStatus(),
        },
        {
          property: translate("diagnostics.device.reloadApp"),
          value: (
            <Button onClick={() => void reloadApp()} size="md">
              {translate("diagnostics.device.reloadAppButton")}
            </Button>
          ),
        },
        {
          property: translate("diagnostics.device.diagConsole"),
          value: (
            <Button onClick={toggleDiagConsole} size="md">
              {window.diagConsole?.isVisible()
                ? translate("diagnostics.device.hideDiagConsole")
                : translate("diagnostics.device.showDiagConsole")}
            </Button>
          ),
        },
      ]}
    />
  )

  const videoDiagnostics = (
    <DiagnosticsTable
      title={translate("diagnostics.video.video")}
      diagnostics={[
        ...getVideoDiagnostics(videoFeatures),
        {
          property: translate("diagnostics.video.cameraTest"),
          value: (
            <Button onClick={openCameraTest} size="md">
              {translate("diagnostics.video.openCameraTest")}
            </Button>
          ),
        },
      ]}
    />
  )

  return (
    <MainLayout title={translate("diagnostics.diagnostics")}>
      <div className={"h-full w-full overflow-hidden"}>
        <Paginator orientation={"vertical"}>
          <div className={"container mx-auto max-w-screen-md mb-4"}>{connectionDiagnostics}</div>
          <div className={"container mx-auto max-w-screen-md mb-4"}>{deviceDiagnostics}</div>
          <div className={"container mx-auto max-w-screen-md"}>{videoDiagnostics}</div>
        </Paginator>
      </div>
    </MainLayout>
  )
}

const getColorSchemePreferences = () => {
  const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches
  const prefersLightMode = window.matchMedia("(prefers-color-scheme: light)").matches
  const prefersHighContrast = window.matchMedia("(prefers-contrast: high)").matches
  const prefersLowContrast = window.matchMedia("(prefers-contrast: low)").matches

  const preferences = [
    prefersDarkMode ? translate("diagnostics.device.prefersDarkMode") : undefined,
    prefersLightMode ? translate("diagnostics.device.prefersLightMode") : undefined,
    prefersHighContrast ? translate("diagnostics.device.prefersHighContrast") : undefined,
    prefersLowContrast ? translate("diagnostics.device.prefersLowContrast") : undefined,
  ]
    .filter((str) => str !== undefined)
    .join(", ")

  return preferences || translate("diagnostics.device.unspecified")
}

const getConnectionDiagnostics = (mqtt: MqttStore) => {
  return [
    {
      property: translate("diagnostics.connection.portalId"),
      value: mqtt.portalId ?? "-",
    },
    {
      property: translate("diagnostics.connection.status"),
      value: mqtt.status,
    },
    {
      property: translate("diagnostics.connection.error"),
      value: mqtt.error ? `${mqtt.error}` : translate("diagnostics.connection.none"),
    },
    {
      property: translate("diagnostics.connection.host"),
      value: mqtt.client?.options?.host ?? "-",
    },
  ]
}

function formatWebGLDiagnostics(webgl: WebGLDiagnostics | null): string {
  if (!webgl || !webgl.contextType) return translate("diagnostics.device.webglNotSupported")

  const parts: string[] = [webgl.contextType]

  if (webgl.renderer) parts.push(webgl.renderer)
  if (webgl.maxTextureSize) parts.push(`tex=${webgl.maxTextureSize}`)
  if (webgl.maxRenderbufferSize) parts.push(`rb=${webgl.maxRenderbufferSize}`)
  if (webgl.maxVertexAttribs) parts.push(`attribs=${webgl.maxVertexAttribs}`)
  if (webgl.maxVaryingVectors) parts.push(`varyings=${webgl.maxVaryingVectors}`)
  if (webgl.maxTextureImageUnits) parts.push(`texUnits=${webgl.maxTextureImageUnits}`)
  parts.push(`${webgl.supportedExtensions.length} extensions`)

  if (webgl.missingQtExtensions.length > 0) {
    parts.push(`${translate("diagnostics.device.missing")} ${webgl.missingQtExtensions.join(", ")}`)
  }

  return parts.join(", ")
}

const getDeviceDiagnostics = (
  windowSize: { width?: number; height?: number },
  browserFeatures: {
    isGuiV2Supported: boolean
    missingFeatures: string[]
    webglDiagnostics: WebGLDiagnostics | null
  },
) => {
  return [
    {
      property: translate("diagnostics.device.userAgent"),
      value: window.navigator.userAgent,
    },
    {
      property: translate("diagnostics.device.viewport"),
      value: `${windowSize.width ?? window.innerWidth} x ${windowSize.height ?? window.innerHeight} (${window.screen.width} x ${window.screen.height}) [${window.devicePixelRatio ?? 1}px/pt]`,
    },
    {
      property: translate("diagnostics.device.colorScheme"),
      value: getColorSchemePreferences(),
    },
    {
      property: translate("diagnostics.device.isGuiV2Supported"),
      value: `${browserFeatures.isGuiV2Supported ? translate("common.yes") : translate("common.no")}${browserFeatures.isGuiV2Supported === false ? ", " + translate("diagnostics.device.missing") + " " + browserFeatures.missingFeatures.join(", ") : ""}`,
    },
    {
      property: translate("diagnostics.device.webgl"),
      value: formatWebGLDiagnostics(browserFeatures.webglDiagnostics),
    },
  ]
}

// Where the pins and the theme came from (the GX via the camera relay, or this
// browser alone), and whether the last write landed. Read this aboard after a
// reboot: "GX" with a time means roaming works.
const formatPrefsStatus = () => {
  const at = (d?: Date) => (d ? d.toLocaleTimeString() : "")
  const source =
    prefsStatus.source === "cerbo"
      ? `${translate("diagnostics.device.prefsCerbo")} ${relayBase()} ${at(prefsStatus.loadedAt)}`
      : prefsStatus.source === "unavailable"
        ? `${translate("diagnostics.device.prefsLocal")} (${relayBase()})`
        : translate("diagnostics.device.prefsLoading")
  const saved =
    prefsStatus.lastSaveOk === undefined
      ? ""
      : `, ${translate(prefsStatus.lastSaveOk ? "diagnostics.device.prefsSaved" : "diagnostics.device.prefsSaveFailed")} ${at(prefsStatus.lastSaveAt)}`
  return source + saved
}

// What the browser could do with a live camera stream; see use-video-features.tsx.
const getVideoDiagnostics = (video: VideoFeatures) => {
  if (!video.isInitialized) return [{ property: translate("diagnostics.video.webCodecs"), value: "..." }]
  return [
    { property: translate("diagnostics.video.webCodecs"), value: video.webCodecs },
    { property: translate("diagnostics.video.mediaSource"), value: video.mediaSource },
    { property: translate("diagnostics.video.videoElement"), value: video.videoElement },
    { property: translate("diagnostics.video.webAssembly"), value: video.webAssembly },
    { property: translate("diagnostics.video.workers"), value: video.workers },
    { property: translate("diagnostics.video.websocket"), value: video.websocket },
    { property: translate("diagnostics.video.canvasBenchmark"), value: video.canvasBenchmark },
  ]
}

export default observer(DiagnosticsView)
