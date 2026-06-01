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
  DEFAULT_WEBGL_VELOCITY_FIELD_SCENE,
  isWebGlVelocityFieldScene,
  type WebGlVelocityFieldScene,
  webGlVelocityFieldAccentColor,
  webGlVelocityFieldClearColor,
  webGlVelocityFieldFlowLabel,
  webGlVelocityFieldMemoryLabel,
  webGlVelocityFieldSummary,
} from "./webgl-velocity-field.model"
import {
  releaseWebGlVelocityFieldResources,
  renderWebGlVelocityFieldScene,
} from "./webgl-velocity-field.renderer"

const ROUTE_PATH = "/phase-6/webgl-velocity-field"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "swirl", label: "Swirl", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "shear", label: "Shear", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "injection", label: "Dye injection", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "dissipation", label: "Dissipation", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "mix", label: "Composite mix", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "speed", label: "Animation speed", min: 0.2, max: 2.4, step: 0.05 },
]
const PRESETS: readonly WorkbenchPreset<WebGlVelocityFieldScene>[] = [
  {
    label: "Balanced eddy",
    description: "A balanced swirl and shear profile with readable dye injection.",
    state: {
      red: 0.02,
      green: 0.05,
      blue: 0.1,
      alpha: 1,
      swirl: 0.62,
      shear: 0.38,
      injection: 0.74,
      dissipation: 0.56,
      mix: 0.64,
      speed: 0.98,
    },
  },
  {
    label: "Tight vortex",
    description: "Stronger swirl, lower shear, and hotter dye for a tighter core.",
    state: {
      red: 0.03,
      green: 0.05,
      blue: 0.08,
      alpha: 1,
      swirl: 0.86,
      shear: 0.2,
      injection: 0.88,
      dissipation: 0.48,
      mix: 0.78,
      speed: 1.34,
    },
  },
  {
    label: "Ribbon drift",
    description: "Higher shear and slower motion for stretched ribbon-like transport.",
    state: {
      red: 0.02,
      green: 0.06,
      blue: 0.14,
      alpha: 1,
      swirl: 0.34,
      shear: 0.72,
      injection: 0.56,
      dissipation: 0.7,
      mix: 0.46,
      speed: 0.62,
    },
  },
  {
    label: "Soft basin",
    description: "Gentler swirl, calmer dye, and softer persistence for a wider basin.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.14,
      alpha: 0.88,
      swirl: 0.28,
      shear: 0.32,
      injection: 0.34,
      dissipation: 0.44,
      mix: 0.32,
      speed: 0.54,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL velocity-field scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current animated velocity-field viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default velocity-field scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease swirl." },
  { keys: "S / Shift+S", description: "Increase or decrease shear." },
  { keys: "D / Shift+D", description: "Increase or decrease dye injection." },
  { keys: "F / Shift+F", description: "Increase or decrease dissipation." },
  { keys: "M / Shift+M", description: "Increase or decrease the composite mix." },
  { keys: "N / Shift+N", description: "Increase or decrease the animation speed." },
  { keys: "Escape", description: "Reset to the default animated scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGlVelocityFieldPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGlVelocityFieldScene>(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE)
  const [phase, setPhase] = useState(0)
  const [runtime, setRuntime] = useState<WebGlCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the WebGL velocity field route prepares animated advection across persistent feedback targets.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isWebGlVelocityFieldScene)

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        swirl: clampChannel(initialScene.swirl),
        shear: clampChannel(initialScene.shear),
        injection: clampChannel(initialScene.injection),
        dissipation: clampChannel(initialScene.dissipation),
        mix: clampChannel(initialScene.mix),
        speed: clampSpeed(initialScene.speed),
      })
      setStatusMessage("Loaded the WebGL velocity-field scene from the shared URL.")
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
      releaseWebGlVelocityFieldResources(runtime)
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

    renderWebGlVelocityFieldScene(canvas, runtime, scene, phase)
    setStatusMessage(`Submitted a velocity-field WebGL frame using ${runtime.version}.`)
  }, [runtime, scene, phase])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Context version", value: runtime?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlVelocityFieldClearColor(scene) },
    { label: "Accent color", value: webGlVelocityFieldAccentColor(scene) },
    { label: "Flow field", value: webGlVelocityFieldFlowLabel(scene) },
    { label: "Memory", value: webGlVelocityFieldMemoryLabel(scene) },
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgl-velocity-field.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE)
        setPhase(0)
        setStatusMessage("WebGL velocity-field scene reset to the default preset.")
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
      case "s":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          shear: stepNumericValue(current.shear, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "d":
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
      case "f":
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
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE)
        setPhase(0)
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 6"
      title="WebGL Velocity Field"
      description="A Next.js WebGL2 route that keeps two offscreen targets alive across animation frames, advects the prior texture through a synthetic velocity field, injects fresh dye, and composites the evolving surface onto the presentation canvas."
      highlights={[
        "First Next.js Phase 6 route that evolves the persistent feedback texture through an explicit synthetic velocity field instead of a direct relay step",
        "Extends the animated two-target feedback baseline into a fluid-like advection study without introducing new shared WebGL infrastructure",
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
          <WorkbenchControlSection heading="Velocity controls">
            {RANGE_CONTROLS.map((control) => {
              const sceneKey = control.id as keyof WebGlVelocityFieldScene
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
            ariaLabel="WebGL velocity field viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGL2 is unavailable in this environment, so the velocity-field route is showing a
                fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGL velocity-field scene"
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
            {webGlVelocityFieldSummary(
              scene,
              runtimeStatusLabel(runtimeState),
              phase,
              runtime?.version,
            )}
          </p>
          <p className="vm-copy">
            This route establishes the synthetic advection baseline that the later interactive dye
            and multi-obstacle flow slices can extend without replacing the broader Phase 6
            workbench shell.
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
