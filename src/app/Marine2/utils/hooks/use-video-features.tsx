import { useEffect, useState } from "react"

/**
 * Probes what the browser could do with a live camera stream, so the answer can
 * be read off the Diagnostics page on an MFD that has no devtools.
 *
 * The camera question, in order of preference:
 *   1. WebCodecs            -> hardware H.264 decode straight from JavaScript
 *   2. MSE with H.264       -> remux raw H.264 into fMP4, hardware decode in <video>
 *   3. WebAssembly          -> software decoder in WASM, draw to canvas
 *   4. none of the above    -> asm.js decoder, or JPEG snapshots in <img>
 *
 * The benchmark measures the one cost every software path shares: converting a
 * 640x360 YUV 4:2:0 frame to RGBA in plain JavaScript and pushing it to a canvas.
 * It runs one frame per timer tick so the page stays responsive on a slow device.
 */

export interface VideoFeatures {
  isInitialized: boolean
  webCodecs: string
  mediaSource: string
  videoElement: string
  webAssembly: string
  workers: string
  websocket: string
  canvasBenchmark: string
}

const CODECS: [string, string][] = [
  ["H.264 baseline", 'video/mp4; codecs="avc1.42E01E"'],
  ["H.264 main", 'video/mp4; codecs="avc1.4D401E"'],
  ["H.264 high", 'video/mp4; codecs="avc1.64001E"'],
  ["H.265", 'video/mp4; codecs="hvc1.1.6.L93.B0"'],
  ["VP8", 'video/webm; codecs="vp8"'],
]

const BENCH_WIDTH = 640
const BENCH_HEIGHT = 360
const BENCH_FRAMES = 8

const win = window as any

function probeWebAssembly(): string {
  const wasm = win.WebAssembly
  if (!wasm || typeof wasm.instantiate !== "function") return "no"
  try {
    // The smallest valid module: magic number + version, nothing else.
    const bytes = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
    const mod = new wasm.Module(bytes)
    new wasm.Instance(mod)
    return "yes"
  } catch (e) {
    return `present but failed: ${String(e)}`
  }
}

function probeMediaSource(): string {
  const ms = win.MediaSource || win.WebKitMediaSource
  if (!ms || typeof ms.isTypeSupported !== "function") return "not available"
  return CODECS.map(([name, type]) => `${name}: ${ms.isTypeSupported(type) ? "yes" : "no"}`).join(", ")
}

function probeVideoElement(): string {
  const video = document.createElement("video")
  if (typeof video.canPlayType !== "function") return "not available"
  return CODECS.map(([name, type]) => `${name}: ${video.canPlayType(type) || "no"}`).join(", ")
}

function probeWebCodecs(): string {
  if (typeof win.VideoDecoder !== "function") return "no"
  return typeof win.EncodedVideoChunk === "function" ? "yes" : "VideoDecoder only"
}

function probeWorkers(): string {
  const cores = window.navigator.hardwareConcurrency
  const worker = typeof win.Worker === "function" ? "yes" : "no"
  const shared = typeof win.SharedArrayBuffer === "function" ? "yes" : "no"
  return `workers: ${worker}, SharedArrayBuffer: ${shared}, cores: ${cores || "unknown"}`
}

function probeWebSocket(): string {
  if (typeof win.WebSocket !== "function") return "no"
  const binary = "binaryType" in win.WebSocket.prototype ? "yes" : "no"
  return `yes, binaryType: ${binary}`
}

const now = () => (window.performance && typeof window.performance.now === "function" ? performance.now() : Date.now())

function clip(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v
}

/**
 * Runs BENCH_FRAMES conversions of a synthetic 4:2:0 frame, one per timer tick,
 * and resolves with the average milliseconds per frame. The arithmetic is the
 * fixed-point BT.601 conversion every software decoder ends with.
 */
function runCanvasBenchmark(): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas")
    canvas.width = BENCH_WIDTH
    canvas.height = BENCH_HEIGHT
    const ctx = canvas.getContext("2d")
    if (!ctx || typeof ctx.createImageData !== "function") {
      resolve("canvas 2d not available")
      return
    }
    const w = BENCH_WIDTH
    const h = BENCH_HEIGHT
    const img = ctx.createImageData(w, h)
    const rgba = img.data
    const yPlane = new Uint8Array(w * h)
    const uPlane = new Uint8Array((w * h) / 4)
    const vPlane = new Uint8Array((w * h) / 4)
    for (let i = 0; i < yPlane.length; i++) yPlane[i] = (i * 7) & 255
    for (let i = 0; i < uPlane.length; i++) {
      uPlane[i] = (i * 3) & 255
      vPlane[i] = (i * 5) & 255
    }

    let frame = 0
    let total = 0
    const step = () => {
      const t0 = now()
      const shift = frame * 3
      for (let row = 0; row < h; row++) {
        const cRow = (row >> 1) * (w >> 1)
        for (let col = 0; col < w; col++) {
          const c = yPlane[row * w + col] + shift - 16
          const ci = cRow + (col >> 1)
          const d = uPlane[ci] - 128
          const e = vPlane[ci] - 128
          const o = (row * w + col) * 4
          rgba[o] = clip((298 * c + 409 * e + 128) >> 8)
          rgba[o + 1] = clip((298 * c - 100 * d - 208 * e + 128) >> 8)
          rgba[o + 2] = clip((298 * c + 516 * d + 128) >> 8)
          rgba[o + 3] = 255
        }
      }
      ctx.putImageData(img, 0, 0)
      total += now() - t0
      frame++
      if (frame < BENCH_FRAMES) {
        window.setTimeout(step, 0)
      } else {
        const perFrame = total / BENCH_FRAMES
        const fps = perFrame > 0 ? Math.round(1000 / perFrame) : 0
        resolve(`${w}x${h} YUV to RGBA + draw: ${perFrame.toFixed(1)} ms/frame (~${fps} fps, one stream)`)
      }
    }
    window.setTimeout(step, 0)
  })
}

export const useVideoFeatures = (): VideoFeatures => {
  // The synchronous probes run once, in the state initialiser; only the benchmark is async.
  const [features, setFeatures] = useState<VideoFeatures>(() => ({
    isInitialized: true,
    webCodecs: probeWebCodecs(),
    mediaSource: probeMediaSource(),
    videoElement: probeVideoElement(),
    webAssembly: probeWebAssembly(),
    workers: probeWorkers(),
    websocket: probeWebSocket(),
    canvasBenchmark: "running...",
  }))

  useEffect(() => {
    let cancelled = false
    runCanvasBenchmark().then(
      (result) => {
        if (!cancelled) setFeatures((f) => ({ ...f, canvasBenchmark: result }))
      },
      (e) => {
        if (!cancelled) setFeatures((f) => ({ ...f, canvasBenchmark: `failed: ${String(e)}` }))
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  return features
}
