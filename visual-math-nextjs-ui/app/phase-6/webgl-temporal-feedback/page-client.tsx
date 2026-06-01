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
  DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE,
  isWebGlTemporalFeedbackScene,
  type WebGlTemporalFeedbackScene,
  webGlTemporalFeedbackAccentColor,
  webGlTemporalFeedbackClearColor,
  webGlTemporalFeedbackPersistence,
  webGlTemporalFeedbackStageLabel,
  webGlTemporalFeedbackSummary,
} from "./webgl-temporal-feedback.model"
import {
  releaseWebGlTemporalFeedbackResources,
  renderWebGlTemporalFeedbackScene,
} from "./webgl-temporal-feedback.renderer"

const ROUTE_PATH = "/phase-6/webgl-temporal-feedback"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "injection", label: "Pulse injection", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "drift", label: "Feedback drift", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "decay", label: "Persistence decay", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "mix", label: "Composite mix", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "speed", label: "Animation speed", min: 0.2, max: 2.4, step: 0.05 },
]
const PRESETS: readonly WorkbenchPreset<WebGlTemporalFeedbackScene>[] = [
  {
    label: "Signal bloom",
    description: "Balanced injection with moderate drift and a readable persistence rate.",
    state: {
      red: 0.02,
      green: 0.05,
      blue: 0.11,
      alpha: 1,
      injection: 0.74,
      drift: 0.34,
      decay: 0.62,
      mix: 0.68,
      speed: 0.92,
    },
  },
  {
    label: "Ribbon wake",
    description: "Broader ribbon injection with longer-lived trails.",
    state: {
      red: 0.03,
      green: 0.06,
      blue: 0.16,
      alpha: 1,
      injection: 0.58,
      drift: 0.22,
      decay: 0.78,
      mix: 0.52,
      speed: 0.7,
    },
  },
  {
    label: "Prism current",
    description: "Faster loop with hotter injected energy and sharper drift.",
    state: {
      red: 0.05,
      green: 0.05,
      blue: 0.09,
      alpha: 1,
      injection: 0.88,
      drift: 0.54,
      decay: 0.48,
      mix: 0.76,
      speed: 1.48,
    },
  },
  {
    label: "Calm haze",
    description: "Lower injection and lighter composite for a slower moving field.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.14,
      alpha: 0.88,
      injection: 0.36,
      drift: 0.18,
      decay: 0.56,
      mix: 0.34,
      speed: 0.54,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL temporal feedback scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current animated temporal-feedback viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default temporal-feedback scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease the pulse injection." },
  { keys: "S / Shift+S", description: "Increase or decrease the feedback drift." },
  { keys: "D / Shift+D", description: "Increase or decrease the persistence decay." },
  { keys: "F / Shift+F", description: "Increase or decrease the composite mix." },
  { keys: "N / Shift+N", description: "Increase or decrease the animation speed." },
  { keys: "Escape", description: "Reset to the default animated scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGlTemporalFeedbackPageClient(props: {
  readonly serializedScene: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGlTemporalFeedbackScene>(
    DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE,
  )
  const [phase, setPhase] = useState(0)
  const [runtime, setRuntime] = useState<WebGlCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the WebGL temporal feedback route prepares animated ping-pong persistence across frames.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(
      props.serializedScene,
      isWebGlTemporalFeedbackScene,
    )

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        injection: clampChannel(initialScene.injection),
        drift: clampChannel(initialScene.drift),
        decay: clampChannel(initialScene.decay),
        mix: clampChannel(initialScene.mix),
        speed: clampSpeed(initialScene.speed),
      })
      setStatusMessage("Loaded the WebGL temporal feedback scene from the shared URL.")
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
      releaseWebGlTemporalFeedbackResources(runtime)
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

    renderWebGlTemporalFeedbackScene(canvas, runtime, scene, phase)
    setStatusMessage(`Submitted a temporal-feedback WebGL frame using ${runtime.version}.`)
  }, [runtime, scene, phase])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Context version", value: runtime?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlTemporalFeedbackClearColor(scene) },
    { label: "Accent color", value: webGlTemporalFeedbackAccentColor(scene) },
    { label: "Stages", value: webGlTemporalFeedbackStageLabel(scene) },
    { label: "Persistence", value: webGlTemporalFeedbackPersistence(scene) },
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgl-temporal-feedback.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE)
        setPhase(0)
        setStatusMessage("WebGL temporal feedback scene reset to the default preset.")
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
          injection: stepNumericValue(
            current.injection,
            event.shiftKey ? -0.05 : 0.05,
            clampChannel,
          ),
        }))
        break
      case "s":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          drift: stepNumericValue(current.drift, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "d":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          decay: stepNumericValue(current.decay, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "f":
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
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE)
        setPhase(0)
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 6"
      title="WebGL Temporal Feedback"
      description="A Next.js WebGL2 route that keeps two offscreen targets alive across animation frames, advances one feedback relay per frame, injects a fresh procedural pulse, and composites the evolving field onto the presentation canvas."
      highlights={[
        "First Next.js Phase 6 route that turns feedback persistence into a time-based property instead of a fixed loop length inside one render call",
        "Keeps the same two offscreen targets alive across frames so later simulation-style routes can extend a verified animated feedback baseline",
        "Reuses the shared fullscreen post-process and render-target helpers without adding new global WebGL infrastructure",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Temporal controls">
            {RANGE_CONTROLS.map((control) => {
              const sceneKey = control.id as keyof WebGlTemporalFeedbackScene
              const value = scene[sceneKey]

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
                        control.id === "speed" ? clampSpeed(nextValue) : clampChannel(nextValue),
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
            ariaLabel="WebGL temporal feedback viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGL2 is unavailable in this environment, so the temporal feedback route is showing
                a fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGL temporal feedback scene"
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
            {webGlTemporalFeedbackSummary(
              scene,
              runtimeStatusLabel(runtimeState),
              phase,
              runtime?.version,
            )}
          </p>
          <p className="vm-copy">
            This route establishes the animated persistence baseline that the later velocity-field
            and interactive dye slices can extend without rebuilding the feedback contract.
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
