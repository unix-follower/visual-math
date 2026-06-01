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
  hasWebGlSupport,
  initializeWebGlCanvas,
  type WebGlCanvasRuntime,
} from "@/app/shared/webgl/webgl-bootstrap"

import {
  DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE,
  isWebGlInteractiveDyeScene,
  type WebGlInteractiveDyeScene,
  webGlInteractiveDyeClearColor,
  webGlInteractiveDyeFlowLabel,
  webGlInteractiveDyeInjectionLabel,
  webGlInteractiveDyeObstacleLabel,
  webGlInteractiveDyeSummary,
} from "./webgl-interactive-dye.model"
import {
  releaseWebGlInteractiveDyeResources,
  renderWebGlInteractiveDyeScene,
} from "./webgl-interactive-dye.renderer"

const ROUTE_PATH = "/phase-6/webgl-interactive-dye"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "swirl", label: "Swirl strength", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "dissipation", label: "History retention", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "mix", label: "Composite mix", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "speed", label: "Animation speed", min: 0.2, max: 2.4, step: 0.05 },
  {
    kind: "range",
    id: "obstacleRadius",
    label: "Obstacle radius",
    min: 0.05,
    max: 0.3,
    step: 0.01,
  },
  {
    kind: "range",
    id: "injectionStrength",
    label: "Injection strength",
    min: 0,
    max: 1,
    step: 0.01,
  },
]
const PRESETS: readonly WorkbenchPreset<WebGlInteractiveDyeScene>[] = [
  {
    label: "Counterflow",
    description: "A left-side injection point with a central blocker and moderate retention.",
    state: {
      red: 0.03,
      green: 0.05,
      blue: 0.08,
      alpha: 1,
      swirl: 0.54,
      dissipation: 0.62,
      mix: 0.68,
      speed: 1.02,
      injectionX: 0.28,
      injectionY: 0.62,
      obstacleX: 0.68,
      obstacleY: 0.42,
      obstacleRadius: 0.16,
      injectionStrength: 0.78,
    },
  },
  {
    label: "Center pulse",
    description: "Central injection with a larger obstacle offset downward.",
    state: {
      red: 0.04,
      green: 0.06,
      blue: 0.1,
      alpha: 1,
      swirl: 0.72,
      dissipation: 0.54,
      mix: 0.82,
      speed: 1.18,
      injectionX: 0.5,
      injectionY: 0.5,
      obstacleX: 0.56,
      obstacleY: 0.3,
      obstacleRadius: 0.22,
      injectionStrength: 0.92,
    },
  },
  {
    label: "Top spill",
    description: "Higher injection position with slower movement and tighter obstacle radius.",
    state: {
      red: 0.05,
      green: 0.08,
      blue: 0.12,
      alpha: 0.92,
      swirl: 0.34,
      dissipation: 0.76,
      mix: 0.52,
      speed: 0.66,
      injectionX: 0.4,
      injectionY: 0.78,
      obstacleX: 0.74,
      obstacleY: 0.46,
      obstacleRadius: 0.1,
      injectionStrength: 0.62,
    },
  },
  {
    label: "Dual wake",
    description: "Warm background with a right-side source and a wider obstacle shadow.",
    state: {
      red: 0.06,
      green: 0.05,
      blue: 0.06,
      alpha: 1,
      swirl: 0.84,
      dissipation: 0.44,
      mix: 0.74,
      speed: 1.52,
      injectionX: 0.74,
      injectionY: 0.54,
      obstacleX: 0.36,
      obstacleY: 0.46,
      obstacleRadius: 0.24,
      injectionStrength: 0.86,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized interactive-dye scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current interactive-dye viewport as a PNG image.",
  },
  {
    id: "pulse-injection",
    label: "Pulse injection",
    description: "Temporarily boost the injection strength at the current pointer target.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default interactive-dye scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease swirl strength." },
  { keys: "D / Shift+D", description: "Increase or decrease history retention." },
  { keys: "M / Shift+M", description: "Increase or decrease the composite mix." },
  { keys: "N / Shift+N", description: "Increase or decrease animation speed." },
  { keys: "O / Shift+O", description: "Increase or decrease the obstacle radius." },
  { keys: "I / Shift+I", description: "Increase or decrease the injection strength." },
  { keys: "Escape", description: "Reset to the default interactive-dye scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGlInteractiveDyePageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pointerSurfaceRef = useRef<HTMLDivElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const initializationStarted = useRef(false)
  const draggingObstacleRef = useRef(false)
  const [scene, setScene] = useState<WebGlInteractiveDyeScene>(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE)
  const [phase, setPhase] = useState(0)
  const [runtime, setRuntime] = useState<WebGlCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the WebGL interactive-dye route prepares a feedback field with live pointer injection.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(
      props.serializedScene,
      isWebGlInteractiveDyeScene,
    )

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        swirl: clampChannel(initialScene.swirl),
        dissipation: clampChannel(initialScene.dissipation),
        mix: clampChannel(initialScene.mix),
        speed: clampSpeed(initialScene.speed),
        injectionX: clampChannel(initialScene.injectionX),
        injectionY: clampChannel(initialScene.injectionY),
        obstacleX: clampChannel(initialScene.obstacleX),
        obstacleY: clampChannel(initialScene.obstacleY),
        obstacleRadius: clampObstacleRadius(initialScene.obstacleRadius),
        injectionStrength: clampChannel(initialScene.injectionStrength),
      })
      setStatusMessage("Loaded the WebGL interactive-dye scene from the shared URL.")
    }

    setHasLoadedSearchState(true)
  }, [hasLoadedSearchState, props.serializedScene])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || runtime || initializationStarted.current) {
      return
    }

    initializationStarted.current = true
    const result = initializeWebGlCanvas(canvas)

    if (!result.ok) {
      setRuntimeState("unsupported")
      setStatusMessage(result.reason)
      return
    }

    setRuntime(result.runtime)
    setRuntimeState("ready")
    setStatusMessage(`WebGL runtime ready with ${result.runtime.version}.`)
  }, [runtime])

  useEffect(() => {
    if (!runtime) {
      return
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      releaseWebGlInteractiveDyeResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    if (!runtime) {
      return
    }

    const animate = () => {
      setPhase((current) => Number(((current + scene.speed * 0.01) % 1).toFixed(2)))
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [runtime, scene.speed])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGlInteractiveDyeScene(canvas, runtime, scene, phase)
    setStatusMessage(`Submitted an interactive dye frame using ${runtime.version}.`)
  }, [runtime, scene, phase])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Context version", value: runtime?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlInteractiveDyeClearColor(scene) },
    { label: "Injection target", value: webGlInteractiveDyeInjectionLabel(scene) },
    { label: "Obstacle", value: webGlInteractiveDyeObstacleLabel(scene) },
    { label: "Flow field", value: webGlInteractiveDyeFlowLabel(scene) },
    { label: "Phase", value: phase.toFixed(2) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(buildWorkbenchShareUrl(ROUTE_PATH, scene))
        setStatusMessage(
          wasCopied
            ? "Share link copied to the clipboard."
            : "Clipboard copy is unavailable in this environment.",
        )
        break
      }
      case "export-png": {
        const didDownload = canvasRef.current
          ? downloadWorkbenchCanvas(canvasRef.current, "webgl-interactive-dye.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      case "pulse-injection": {
        setScene((current) => ({
          ...current,
          injectionStrength: clampChannel(current.injectionStrength + 0.12),
        }))
        setStatusMessage("Boosted the current injection source.")
        break
      }
      default:
        setScene(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE)
        setPhase(0)
        setStatusMessage("WebGL interactive-dye scene reset to the default preset.")
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
        break
      case "g":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          green: stepNumericValue(current.green, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "b":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          blue: stepNumericValue(current.blue, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "a":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          alpha: stepNumericValue(current.alpha, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "w":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          swirl: stepNumericValue(current.swirl, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "d":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          dissipation: stepNumericValue(
            current.dissipation,
            event.shiftKey ? -0.05 : 0.05,
            clampChannel,
          ),
        }))
        break
      case "m":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          mix: stepNumericValue(current.mix, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "n":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          speed: stepNumericValue(current.speed, event.shiftKey ? -0.1 : 0.1, clampSpeed),
        }))
        break
      case "o":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          obstacleRadius: stepNumericValue(
            current.obstacleRadius,
            event.shiftKey ? -0.02 : 0.02,
            clampObstacleRadius,
          ),
        }))
        break
      case "i":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          injectionStrength: stepNumericValue(
            current.injectionStrength,
            event.shiftKey ? -0.05 : 0.05,
            clampChannel,
          ),
        }))
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE)
        setPhase(0)
        break
      default:
        break
    }
  }

  function updatePointerState(clientX: number, clientY: number, dragObstacle: boolean): void {
    const element = pointerSurfaceRef.current

    if (!element) {
      return
    }

    const rect = element.getBoundingClientRect()
    const normalizedX = clampChannel((clientX - rect.left) / rect.width)
    const normalizedY = clampChannel((clientY - rect.top) / rect.height)

    setScene((current) => ({
      ...current,
      injectionX: normalizedX,
      injectionY: normalizedY,
      obstacleX: dragObstacle ? normalizedX : current.obstacleX,
      obstacleY: dragObstacle ? normalizedY : current.obstacleY,
    }))
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    draggingObstacleRef.current = event.shiftKey
    updatePointerState(event.clientX, event.clientY, event.shiftKey)
    setStatusMessage(
      event.shiftKey
        ? "Dragging the obstacle through the dye field."
        : "Moved the dye injection source to the current pointer position.",
    )
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>): void {
    if ((event.buttons & 1) === 0) {
      return
    }

    updatePointerState(event.clientX, event.clientY, draggingObstacleRef.current)
  }

  function handlePointerUp(): void {
    draggingObstacleRef.current = false
  }

  return (
    <MathWorkbench
      eyebrow="Phase 6"
      title="WebGL Interactive Dye"
      description="A Next.js WebGL2 route that keeps a feedback texture alive across frames, injects dye at a user-selected position, bends the field around a draggable obstacle, and composites the evolving surface onto the presentation canvas."
      highlights={[
        "First Next.js Phase 6 route that lets pointer input steer the evolving WebGL field instead of relying only on procedural motion",
        "Extends the persistent two-target feedback baseline with direct dye injection and obstacle interaction without introducing new shared infrastructure",
        "Keeps the same serialized scene, unsupported fallback, export flow, and explicit teardown contract used by the completed Canvas and WebGPU surfaces",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Interactive dye controls">
            {RANGE_CONTROLS.map((control) => {
              const sceneKey = control.id as keyof WebGlInteractiveDyeScene
              const value = scene[sceneKey] as number

              return (
                <WorkbenchRangeControl
                  key={control.id}
                  control={control}
                  value={value}
                  displayValue={value.toFixed(2)}
                  onChange={(nextValue) =>
                    setScene((current) => ({
                      ...current,
                      [sceneKey]:
                        control.id === "speed"
                          ? clampSpeed(nextValue)
                          : control.id === "obstacleRadius"
                            ? clampObstacleRadius(nextValue)
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
            ariaLabel="WebGL interactive dye viewport"
            onKeyDown={handleViewportKeydown}
          >
            <div
              ref={pointerSurfaceRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {runtimeState === "unsupported" ? (
                <div className="vm-copy" role="status">
                  WebGL2 is unavailable in this environment, so the interactive-dye route is showing
                  a fallback message instead of a GPU-backed viewport.
                </div>
              ) : (
                <canvas
                  ref={canvasRef}
                  width={720}
                  height={480}
                  className="vm-canvas"
                  aria-label="Canvas showing the current WebGL interactive-dye scene"
                />
              )}
            </div>
          </WorkbenchViewportSurface>
          <WorkbenchMetricGrid metrics={metrics} />
        </>
      }
      notes={
        <>
          <h2>Route notes</h2>
          <p className="vm-copy">
            {webGlInteractiveDyeSummary(scene, runtimeStatusLabel(runtimeState), runtime?.version)}
          </p>
          <p className="vm-copy">
            Drag inside the viewport to move the dye source. Hold Shift while dragging to reposition
            the obstacle and bend the flow around a new blocker.
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

function clampSpeed(value: number): number {
  return Number(Math.max(0.2, Math.min(2.4, value)).toFixed(2))
}

function clampObstacleRadius(value: number): number {
  return Number(Math.max(0.05, Math.min(0.3, value)).toFixed(2))
}
