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
  DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE,
  isWebGlPingPongFeedbackScene,
  type WebGlPingPongFeedbackScene,
  webGlPingPongFeedbackAccentColor,
  webGlPingPongFeedbackClearColor,
  webGlPingPongFeedbackStageLabel,
  webGlPingPongFeedbackSummary,
} from "./webgl-ping-pong-feedback.model"
import {
  releaseWebGlPingPongFeedbackResources,
  renderWebGlPingPongFeedbackScene,
} from "./webgl-ping-pong-feedback.renderer"

const ROUTE_PATH = "/phase-6/webgl-ping-pong-feedback"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "energy", label: "Energy", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "drift", label: "Drift", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "feedback", label: "Feedback", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlPingPongFeedbackScene>[] = [
  {
    label: "Balanced loop",
    description: "Moderate energy, drift, and feedback for a readable ping-pong baseline.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.16,
      alpha: 1,
      energy: 0.72,
      drift: 0.34,
      feedback: 0.62,
    },
  },
  {
    label: "Wide smear",
    description: "Higher drift and feedback for a softer echoed trail between feedback passes.",
    state: {
      red: 0.03,
      green: 0.07,
      blue: 0.15,
      alpha: 1,
      energy: 0.84,
      drift: 0.62,
      feedback: 0.82,
    },
  },
  {
    label: "Tight return",
    description: "Lower drift and feedback for a more contained returned surface.",
    state: {
      red: 0.05,
      green: 0.09,
      blue: 0.18,
      alpha: 1,
      energy: 0.58,
      drift: 0.16,
      feedback: 0.34,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL ping-pong feedback scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGL ping-pong feedback viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default WebGL ping-pong feedback scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "E / Shift+E", description: "Increase or decrease energy." },
  { keys: "D / Shift+D", description: "Increase or decrease drift." },
  { keys: "F / Shift+F", description: "Increase or decrease feedback." },
  { keys: "Escape", description: "Reset to the default ping-pong feedback scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGlPingPongFeedbackPageClient(props: {
  readonly serializedScene: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGlPingPongFeedbackScene>(
    DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE,
  )
  const [runtime, setRuntime] = useState<WebGlCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the ping-pong feedback route checks browser support and prepares the first two-target feedback workflow.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(
      props.serializedScene,
      isWebGlPingPongFeedbackScene,
    )

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        energy: clampChannel(initialScene.energy),
        drift: clampChannel(initialScene.drift),
        feedback: clampChannel(initialScene.feedback),
      })
      setStatusMessage("Loaded the ping-pong feedback scene from the shared URL.")
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
      releaseWebGlPingPongFeedbackResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGlPingPongFeedbackScene(canvas, runtime, scene)
    setStatusMessage(`Rendered a ping-pong feedback WebGL composite using ${runtime.version}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Context version", value: runtime?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlPingPongFeedbackClearColor(scene) },
    { label: "Accent color", value: webGlPingPongFeedbackAccentColor(scene) },
    { label: "Feedback stages", value: webGlPingPongFeedbackStageLabel(scene) },
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgl-ping-pong-feedback.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE)
        setStatusMessage("Ping-pong feedback scene reset to the default preset.")
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
      case "e":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          energy: stepNumericValue(current.energy, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "d":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          drift: stepNumericValue(current.drift, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "f":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          feedback: stepNumericValue(current.feedback, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE)
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 6"
      title="WebGL Ping-Pong Feedback"
      description="A Next.js WebGL2 route that seeds one offscreen texture with emissive geometry, bounces that image through a second texture, and then samples the returned surface back onto the presentation canvas."
      highlights={[
        "Extends the bloom and dual-pass groundwork into the first explicit two-target feedback loop in the Next.js Phase 6 track",
        "Uses alternating offscreen render targets so later temporal and trail routes can build on the same feedback-loop contract",
        "Preserves the same serialized scene, unsupported fallback, export flow, and explicit teardown contract used by the completed Canvas and WebGPU surfaces",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Feedback controls">
            {RANGE_CONTROLS.map((control) => {
              const sceneKey = control.id as keyof WebGlPingPongFeedbackScene
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
                      [sceneKey]: clampChannel(nextValue),
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
            ariaLabel="WebGL ping-pong feedback viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGL2 is unavailable in this environment, so the ping-pong feedback route is
                showing a fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGL ping-pong feedback scene"
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
            {webGlPingPongFeedbackSummary(
              scene,
              runtimeStatusLabel(runtimeState),
              runtime?.version,
            )}
          </p>
          <p className="vm-copy">
            This route establishes the alternating render-target feedback pattern that the later
            temporal and trail slices can extend without changing the broader Phase 6 workbench
            shell.
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
