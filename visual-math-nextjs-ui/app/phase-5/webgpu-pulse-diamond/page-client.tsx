"use client"

import { useEffect, useRef, useState } from "react"

import {
  MathWorkbench,
  WorkbenchControlSection,
  WorkbenchMetricGrid,
  WorkbenchPresetGrid,
  WorkbenchRangeControl,
  WorkbenchViewportSurface,
} from "@/app/shared/workbench/workbench"
import { stepNumericValue } from "@/app/shared/workbench/workbench-keyboard"
import type {
  RangeControlSchema,
  WorkbenchAction,
  WorkbenchKeyboardShortcut,
  WorkbenchPreset,
} from "@/app/shared/workbench/workbench.models"
import {
  buildWorkbenchShareUrl,
  copyWorkbenchText,
  deserializeWorkbenchScene,
  downloadWorkbenchCanvas,
} from "@/app/shared/workbench/workbench-state"
import {
  hasWebGpuSupport,
  initializeWebGpuCanvas,
  type WebGpuCanvasRuntime,
} from "@/app/shared/webgpu/webgpu-bootstrap"

import {
  DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE,
  isWebGpuPulseDiamondScene,
  pulseDiamondArea,
  pulseDiamondClearColor,
  pulseDiamondPeakColor,
  pulseDiamondScale,
  type WebGpuPulseDiamondScene,
  webGpuPulseDiamondSummary,
} from "./webgpu-pulse-diamond.model"
import {
  releaseWebGpuPulseDiamondResources,
  renderWebGpuPulseDiamondScene,
} from "./webgpu-pulse-diamond.renderer"

const WEBGPU_PULSE_DIAMOND_ROUTE_PATH = "/phase-5/webgpu-pulse-diamond"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  {
    kind: "range",
    id: "red",
    label: "Red channel",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "green",
    label: "Green channel",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "blue",
    label: "Blue channel",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "alpha",
    label: "Alpha channel",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "pulseAmplitude",
    label: "Pulse amplitude",
    min: 0.05,
    max: 0.32,
    step: 0.01,
  },
  {
    kind: "range",
    id: "speed",
    label: "Animation speed",
    min: 0.2,
    max: 2.4,
    step: 0.05,
  },
  {
    kind: "range",
    id: "skew",
    label: "Diamond skew",
    min: -0.28,
    max: 0.28,
    step: 0.01,
  },
  {
    kind: "range",
    id: "glow",
    label: "Glow strength",
    min: 0,
    max: 1,
    step: 0.01,
  },
]
const PRESETS: readonly WorkbenchPreset<WebGpuPulseDiamondScene>[] = [
  {
    label: "Signal",
    description: "Balanced pulse with a moderate glow and a gentle forward lean.",
    state: {
      red: 0.05,
      green: 0.08,
      blue: 0.18,
      alpha: 1,
      pulseAmplitude: 0.22,
      speed: 1.1,
      skew: 0.14,
      glow: 0.72,
    },
  },
  {
    label: "Prism",
    description: "Slower motion with a broader pulse and colder backdrop.",
    state: {
      red: 0.04,
      green: 0.06,
      blue: 0.2,
      alpha: 1,
      pulseAmplitude: 0.28,
      speed: 0.65,
      skew: -0.08,
      glow: 0.84,
    },
  },
  {
    label: "Beacon",
    description: "Faster loop and sharper skew for a more mechanical pulse.",
    state: {
      red: 0.12,
      green: 0.08,
      blue: 0.1,
      alpha: 1,
      pulseAmplitude: 0.16,
      speed: 1.9,
      skew: 0.22,
      glow: 0.58,
    },
  },
  {
    label: "Glass pulse",
    description: "Softer alpha and reduced glow for a lighter animated surface.",
    state: {
      red: 0.1,
      green: 0.16,
      blue: 0.24,
      alpha: 0.7,
      pulseAmplitude: 0.14,
      speed: 0.85,
      skew: -0.16,
      glow: 0.42,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized animated pulse-diamond scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current animated WebGPU pulse-diamond viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default pulse-diamond scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  {
    keys: "G / Shift+G",
    description: "Increase or decrease the green channel.",
  },
  {
    keys: "B / Shift+B",
    description: "Increase or decrease the blue channel.",
  },
  {
    keys: "A / Shift+A",
    description: "Increase or decrease the alpha channel.",
  },
  {
    keys: "P / Shift+P",
    description: "Increase or decrease the pulse amplitude.",
  },
  {
    keys: "S / Shift+S",
    description: "Increase or decrease the animation speed.",
  },
  { keys: "K / Shift+K", description: "Increase or decrease the skew." },
  {
    keys: "N / Shift+N",
    description: "Increase or decrease the glow strength.",
  },
  { keys: "Escape", description: "Reset to the default animated scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGpuPulseDiamondPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const animationFrameRef = useRef<number | null>(null)
  const animationStartRef = useRef<number | null>(null)
  const [scene, setScene] = useState<WebGpuPulseDiamondScene>(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE)
  const [phase, setPhase] = useState(0)
  const [runtime, setRuntime] = useState<WebGpuCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the animated pulse-diamond route checks browser support and prepares per-frame WebGPU updates.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isWebGpuPulseDiamondScene)

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        pulseAmplitude: clampPulseAmplitude(initialScene.pulseAmplitude),
        speed: clampSpeed(initialScene.speed),
        skew: clampSkew(initialScene.skew),
        glow: clampChannel(initialScene.glow),
      })
      setStatusMessage("Loaded the animated pulse-diamond scene from the shared URL.")
    }

    setHasLoadedSearchState(true)
  }, [hasLoadedSearchState, props.serializedScene])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || runtime || initializationStarted.current) {
      return
    }

    initializationStarted.current = true
    let isActive = true

    void initializeWebGpuCanvas(canvas).then((result) => {
      if (!isActive) {
        return
      }

      if (!result.ok) {
        setRuntimeState("unsupported")
        setStatusMessage(result.reason)
        return
      }

      setRuntime(result.runtime)
      setRuntimeState("ready")
      setStatusMessage(`WebGPU runtime ready with ${result.runtime.format}.`)
    })

    return () => {
      isActive = false
    }
  }, [runtime])

  useEffect(() => {
    if (!runtime) {
      return
    }

    return () => {
      releaseWebGpuPulseDiamondResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    if (!runtime) {
      return
    }

    function animate(timestamp: number): void {
      if (animationStartRef.current === null) {
        animationStartRef.current = timestamp
      }

      const elapsedSeconds = (timestamp - animationStartRef.current) / 1000
      const nextPhase = (elapsedSeconds * scene.speed) % 1
      setPhase(Number(nextPhase.toFixed(3)))
      animationFrameRef.current = window.requestAnimationFrame(animate)
    }

    animationFrameRef.current = window.requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }

      animationFrameRef.current = null
      animationStartRef.current = null
    }
  }, [runtime, scene.speed])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGpuPulseDiamondScene(canvas, runtime, scene, phase)
    setStatusMessage(`Submitted an animated WebGPU pulse-diamond draw using ${runtime.format}.`)
  }, [runtime, scene, phase])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Canvas format", value: runtime?.format ?? "Unavailable" },
    { label: "Clear color", value: pulseDiamondClearColor(scene) },
    { label: "Peak color", value: pulseDiamondPeakColor(scene) },
    {
      label: "Pulse scale",
      value: `${pulseDiamondScale(scene, phase).toFixed(2)}`,
    },
    { label: "Area", value: pulseDiamondArea(scene, phase) },
    { label: "Phase", value: phase.toFixed(2) },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(WEBGPU_PULSE_DIAMOND_ROUTE_PATH, scene),
        )
        setStatusMessage(
          wasCopied
            ? "Share link copied to the clipboard."
            : "Clipboard copy is unavailable in this environment.",
        )
        break
      }
      case "export-png": {
        const didDownload = canvasRef.current
          ? downloadWorkbenchCanvas(canvasRef.current, "webgpu-pulse-diamond.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE)
        setStatusMessage("Animated pulse-diamond scene reset to the default preset.")
        break
    }
  }

  function handleViewportKeydown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const key = event.key.toLowerCase()

    switch (key) {
      case "r":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          red: stepNumericValue(current.red, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the red channel.")
        break
      case "g":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          green: stepNumericValue(current.green, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the green channel.")
        break
      case "b":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          blue: stepNumericValue(current.blue, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the blue channel.")
        break
      case "a":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          alpha: stepNumericValue(current.alpha, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the alpha channel.")
        break
      case "p":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          pulseAmplitude: stepNumericValue(
            current.pulseAmplitude,
            event.shiftKey ? -0.02 : 0.02,
            clampPulseAmplitude,
          ),
        }))
        setStatusMessage("Updated the pulse amplitude.")
        break
      case "s":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          speed: stepNumericValue(current.speed, event.shiftKey ? -0.1 : 0.1, clampSpeed),
        }))
        setStatusMessage("Updated the animation speed.")
        break
      case "k":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          skew: stepNumericValue(current.skew, event.shiftKey ? -0.03 : 0.03, clampSkew),
        }))
        setStatusMessage("Updated the diamond skew.")
        break
      case "n":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          glow: stepNumericValue(current.glow, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the glow strength.")
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE)
        setStatusMessage("Animated pulse-diamond scene reset to the default preset.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 5"
      title="WebGPU Pulse Diamond"
      description="A Next.js WebGPU route for introducing requestAnimationFrame-driven vertex updates, animated pulse scaling, and glow-tinted diamond geometry on top of the shared Phase 5 runtime."
      highlights={[
        "Fifth Next.js Phase 5 route introducing requestAnimationFrame-driven per-frame GPU buffer updates",
        "Animated six-vertex diamond with pulse amplitude, skew, glow, and speed controls",
        "Same shared bootstrap, caching, export, and teardown pattern with a route-local animation loop",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Pulse controls">
            {RANGE_CONTROLS.map((control) => {
              const value =
                scene[
                  control.id as keyof Pick<
                    WebGpuPulseDiamondScene,
                    | "red"
                    | "green"
                    | "blue"
                    | "alpha"
                    | "pulseAmplitude"
                    | "speed"
                    | "skew"
                    | "glow"
                  >
                ]

              return (
                <WorkbenchRangeControl
                  key={control.id}
                  control={control}
                  value={value}
                  displayValue={value.toFixed(2)}
                  onChange={(nextValue) =>
                    setScene((current) => ({
                      ...current,
                      [control.id]:
                        control.id === "pulseAmplitude"
                          ? clampPulseAmplitude(nextValue)
                          : control.id === "speed"
                            ? clampSpeed(nextValue)
                            : control.id === "skew"
                              ? clampSkew(nextValue)
                              : clampChannel(nextValue),
                    }))
                  }
                />
              )
            })}
          </WorkbenchControlSection>

          <WorkbenchControlSection heading="Presets">
            <WorkbenchPresetGrid
              presets={PRESETS}
              onPreset={(preset) => {
                setScene(preset.state)
                setStatusMessage(`Applied preset: ${preset.label}.`)
              }}
            />
          </WorkbenchControlSection>
        </>
      }
      viewport={
        <>
          <WorkbenchViewportSurface
            ariaLabel="WebGPU pulse diamond viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGPU is unavailable in this environment, so the pulse diamond route is showing a
                fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGPU pulse diamond scene"
              />
            )}
          </WorkbenchViewportSurface>
          <WorkbenchMetricGrid metrics={metrics} />
        </>
      }
      notes={
        <>
          <h2>Route notes</h2>
          <p className="vm-copy">
            {webGpuPulseDiamondSummary(
              scene,
              runtimeStatusLabel(runtimeState),
              phase,
              runtime?.format,
            )}
          </p>
          <p className="vm-copy">
            This route extends Phase 5 from static GPU submissions to animated per-frame vertex
            updates while keeping the same browser guards, shared WebGPU bootstrap, and route-local
            workbench contract.
          </p>
        </>
      }
    />
  )
}

function runtimeStatusLabel(state: RuntimeState): string {
  switch (state) {
    case "ready":
      return "Ready"
    case "unsupported":
      return "Unsupported"
    default:
      return "Checking"
  }
}

function clampChannel(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2))
}

function clampPulseAmplitude(value: number): number {
  return Number(Math.max(0.05, Math.min(0.32, value)).toFixed(2))
}

function clampSpeed(value: number): number {
  return Number(Math.max(0.2, Math.min(2.4, value)).toFixed(2))
}

function clampSkew(value: number): number {
  return Number(Math.max(-0.28, Math.min(0.28, value)).toFixed(2))
}
