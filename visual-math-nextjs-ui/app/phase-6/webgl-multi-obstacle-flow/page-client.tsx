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
  DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE,
  isWebGlMultiObstacleFlowScene,
  type WebGlMultiObstacleFlowScene,
  webGlMultiObstacleFlowClearColor,
  webGlMultiObstacleFlowInjectionLabel,
  webGlMultiObstacleFlowLabel,
  webGlMultiObstacleFlowPrimaryLabel,
  webGlMultiObstacleFlowSecondaryLabel,
  webGlMultiObstacleFlowSummary,
} from "./webgl-multi-obstacle-flow.model"
import {
  releaseWebGlMultiObstacleFlowResources,
  renderWebGlMultiObstacleFlowScene,
} from "./webgl-multi-obstacle-flow.renderer"

const ROUTE_PATH = "/phase-6/webgl-multi-obstacle-flow"
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
    id: "injectionStrength",
    label: "Injection strength",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "primaryRadius",
    label: "Primary obstacle radius",
    min: 0.05,
    max: 0.3,
    step: 0.01,
  },
  {
    kind: "range",
    id: "secondaryRadius",
    label: "Secondary obstacle radius",
    min: 0.05,
    max: 0.3,
    step: 0.01,
  },
]
const PRESETS: readonly WorkbenchPreset<WebGlMultiObstacleFlowScene>[] = [
  {
    label: "Twin wake",
    description: "Two blockers split one bright injection wake into separate flow channels.",
    state: DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE,
  },
  {
    label: "Gate flow",
    description: "Primary and secondary obstacles form a narrow channel through the center.",
    state: {
      red: 0.04,
      green: 0.06,
      blue: 0.1,
      alpha: 1,
      swirl: 0.44,
      dissipation: 0.74,
      mix: 0.58,
      speed: 0.72,
      injectionX: 0.18,
      injectionY: 0.52,
      injectionStrength: 0.62,
      primaryX: 0.46,
      primaryY: 0.62,
      primaryRadius: 0.22,
      secondaryX: 0.62,
      secondaryY: 0.34,
      secondaryRadius: 0.2,
    },
  },
  {
    label: "Cross current",
    description: "Faster motion with smaller obstacles and a more central source.",
    state: {
      red: 0.05,
      green: 0.05,
      blue: 0.07,
      alpha: 1,
      swirl: 0.82,
      dissipation: 0.42,
      mix: 0.78,
      speed: 1.62,
      injectionX: 0.5,
      injectionY: 0.56,
      injectionStrength: 0.9,
      primaryX: 0.34,
      primaryY: 0.38,
      primaryRadius: 0.1,
      secondaryX: 0.74,
      secondaryY: 0.62,
      secondaryRadius: 0.08,
    },
  },
  {
    label: "Slow basin",
    description: "Longer persistence with a heavier secondary blocker.",
    state: {
      red: 0.06,
      green: 0.08,
      blue: 0.12,
      alpha: 0.92,
      swirl: 0.28,
      dissipation: 0.82,
      mix: 0.42,
      speed: 0.44,
      injectionX: 0.32,
      injectionY: 0.76,
      injectionStrength: 0.48,
      primaryX: 0.42,
      primaryY: 0.44,
      primaryRadius: 0.18,
      secondaryX: 0.78,
      secondaryY: 0.46,
      secondaryRadius: 0.24,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized multi-obstacle flow scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current multi-obstacle flow viewport as a PNG image.",
  },
  {
    id: "pulse-injection",
    label: "Pulse injection",
    description: "Temporarily boost the current injection source.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default multi-obstacle flow scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease swirl strength." },
  { keys: "D / Shift+D", description: "Increase or decrease history retention." },
  { keys: "M / Shift+M", description: "Increase or decrease composite mix." },
  { keys: "N / Shift+N", description: "Increase or decrease animation speed." },
  { keys: "I / Shift+I", description: "Increase or decrease injection strength." },
  { keys: "O / Shift+O", description: "Increase or decrease the primary obstacle radius." },
  { keys: "P / Shift+P", description: "Increase or decrease the secondary obstacle radius." },
  { keys: "Escape", description: "Reset to the default multi-obstacle flow scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGlMultiObstacleFlowPageClient(props: {
  readonly serializedScene: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pointerSurfaceRef = useRef<HTMLDivElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const initializationStarted = useRef(false)
  const draggingObstacleRef = useRef<"primary" | "secondary" | null>(null)
  const [scene, setScene] = useState<WebGlMultiObstacleFlowScene>(
    DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE,
  )
  const [phase, setPhase] = useState(0)
  const [runtime, setRuntime] = useState<WebGlCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the WebGL multi-obstacle flow route prepares a feedback field with two draggable blockers.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(
      props.serializedScene,
      isWebGlMultiObstacleFlowScene,
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
        injectionStrength: clampChannel(initialScene.injectionStrength),
        primaryX: clampChannel(initialScene.primaryX),
        primaryY: clampChannel(initialScene.primaryY),
        primaryRadius: clampRadius(initialScene.primaryRadius),
        secondaryX: clampChannel(initialScene.secondaryX),
        secondaryY: clampChannel(initialScene.secondaryY),
        secondaryRadius: clampRadius(initialScene.secondaryRadius),
      })
      setStatusMessage("Loaded the WebGL multi-obstacle flow scene from the shared URL.")
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
      releaseWebGlMultiObstacleFlowResources(runtime)
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

    renderWebGlMultiObstacleFlowScene(canvas, runtime, scene, phase)
    setStatusMessage(`Submitted a multi-obstacle flow frame using ${runtime.version}.`)
  }, [runtime, scene, phase])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Context version", value: runtime?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlMultiObstacleFlowClearColor(scene) },
    { label: "Injection target", value: webGlMultiObstacleFlowInjectionLabel(scene) },
    { label: "Primary obstacle", value: webGlMultiObstacleFlowPrimaryLabel(scene) },
    { label: "Secondary obstacle", value: webGlMultiObstacleFlowSecondaryLabel(scene) },
    { label: "Flow field", value: webGlMultiObstacleFlowLabel(scene) },
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgl-multi-obstacle-flow.png")
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
        setScene(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE)
        setPhase(0)
        setStatusMessage("WebGL multi-obstacle flow scene reset to the default preset.")
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
      case "o":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          primaryRadius: stepNumericValue(
            current.primaryRadius,
            event.shiftKey ? -0.02 : 0.02,
            clampRadius,
          ),
        }))
        break
      case "p":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          secondaryRadius: stepNumericValue(
            current.secondaryRadius,
            event.shiftKey ? -0.02 : 0.02,
            clampRadius,
          ),
        }))
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE)
        setPhase(0)
        break
      default:
        break
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    const point = readPointerPosition(event.clientX, event.clientY, pointerSurfaceRef.current)

    if (!point) {
      return
    }

    const target = pickClosestObstacle(point.x, point.y, scene)
    draggingObstacleRef.current = target
    setScene((current) => applyObstacleDrag(current, target, point.x, point.y))
    setStatusMessage(`Started dragging the ${target} obstacle.`)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>): void {
    const point = readPointerPosition(event.clientX, event.clientY, pointerSurfaceRef.current)

    if (!point) {
      return
    }

    if (draggingObstacleRef.current) {
      setScene((current) =>
        applyObstacleDrag(
          current,
          draggingObstacleRef.current as "primary" | "secondary",
          point.x,
          point.y,
        ),
      )
      setStatusMessage(
        `Dragging the ${draggingObstacleRef.current} obstacle through the flow field.`,
      )
      return
    }

    setScene((current) => ({ ...current, injectionX: point.x, injectionY: point.y }))
    setStatusMessage("Moved the flow injection source.")
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>): void {
    const point = readPointerPosition(event.clientX, event.clientY, pointerSurfaceRef.current)

    if (point && draggingObstacleRef.current) {
      setScene((current) =>
        applyObstacleDrag(
          current,
          draggingObstacleRef.current as "primary" | "secondary",
          point.x,
          point.y,
        ),
      )
    }

    draggingObstacleRef.current = null
    setStatusMessage("Released obstacle drag.")
  }

  function handlePointerLeave(): void {
    draggingObstacleRef.current = null
    setStatusMessage("Pointer left the multi-obstacle flow viewport.")
  }

  return (
    <MathWorkbench
      eyebrow="Phase 6"
      title="WebGL Multi-Obstacle Flow"
      description="A Next.js WebGL2 route that keeps a feedback texture alive across frames, injects dye into the evolving field, lets the nearest blocker snap under the pointer on drag, and composites the two-obstacle flow back onto the presentation canvas."
      highlights={[
        "Extends Interactive Dye into a stronger obstacle-aware simulation with two independently draggable blockers inside the same shared WebGL2 shell",
        "Chooses the nearest obstacle on pointer-down so the interaction stays direct without adding mode toggles or extra overlay controls",
        "Reuses the existing fullscreen post-process and render-target helpers while closing the last Angular-parity WebGL route gap",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Multi-obstacle flow controls">
            {RANGE_CONTROLS.map((control) => {
              const sceneKey = control.id as keyof WebGlMultiObstacleFlowScene
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
                          : control.id === "primaryRadius" || control.id === "secondaryRadius"
                            ? clampRadius(nextValue)
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
            ariaLabel="WebGL multi-obstacle flow viewport"
            surfaceRef={pointerSurfaceRef}
            onKeyDown={handleViewportKeydown}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGL2 is unavailable in this environment, so the multi-obstacle flow route is
                showing a fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGL multi-obstacle flow scene"
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
            {webGlMultiObstacleFlowSummary(
              scene,
              runtimeStatusLabel(runtimeState),
              runtime?.version,
            )}
          </p>
          <p className="vm-copy">
            Move the pointer to steer the dye source. Pointer-down snaps to the nearest obstacle,
            lets you reposition that blocker through the field, and pointer-up returns control to
            free injection steering.
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

function readPointerPosition(
  clientX: number,
  clientY: number,
  element: HTMLDivElement | null,
): { x: number; y: number } | null {
  if (!element) {
    return null
  }

  const rect = element.getBoundingClientRect()
  return {
    x: clampChannel((clientX - rect.left) / Math.max(1, rect.width)),
    y: clampChannel(1 - (clientY - rect.top) / Math.max(1, rect.height)),
  }
}

export function pickClosestObstacle(
  x: number,
  y: number,
  scene: WebGlMultiObstacleFlowScene,
): "primary" | "secondary" {
  const primaryDistance = Math.hypot(x - scene.primaryX, y - scene.primaryY)
  const secondaryDistance = Math.hypot(x - scene.secondaryX, y - scene.secondaryY)
  return primaryDistance <= secondaryDistance ? "primary" : "secondary"
}

export function applyObstacleDrag(
  scene: WebGlMultiObstacleFlowScene,
  obstacle: "primary" | "secondary",
  x: number,
  y: number,
): WebGlMultiObstacleFlowScene {
  if (obstacle === "secondary") {
    return { ...scene, secondaryX: x, secondaryY: y }
  }

  return { ...scene, primaryX: x, primaryY: y }
}

function clampChannel(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2))
}

function clampSpeed(value: number): number {
  return Number(Math.max(0.2, Math.min(2.4, value)).toFixed(2))
}

function clampRadius(value: number): number {
  return Number(Math.max(0.05, Math.min(0.3, value)).toFixed(2))
}
