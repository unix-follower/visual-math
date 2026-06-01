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
  DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE,
  isWebGlUniformTransformScene,
  type WebGlUniformTransformScene,
  webGlUniformTransformArea,
  webGlUniformTransformClearColor,
  webGlUniformTransformPeakColor,
  webGlUniformTransformSummary,
  webGlUniformTransformTranslation,
} from "./webgl-uniform-transform.model"
import {
  releaseWebGlUniformTransformResources,
  renderWebGlUniformTransformScene,
} from "./webgl-uniform-transform.renderer"

const WEBGL_UNIFORM_TRANSFORM_ROUTE_PATH = "/phase-6/webgl-uniform-transform"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "scale", label: "Scale", min: 0.4, max: 1.2, step: 0.01 },
  { kind: "range", id: "rotation", label: "Rotation", min: -180, max: 180, step: 1 },
  { kind: "range", id: "offsetX", label: "Offset X", min: -0.45, max: 0.45, step: 0.01 },
  { kind: "range", id: "offsetY", label: "Offset Y", min: -0.45, max: 0.45, step: 0.01 },
  { kind: "range", id: "accent", label: "Accent mix", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlUniformTransformScene>[] = [
  {
    label: "Card tilt",
    description: "Balanced transform showing rotation, slight offset, and a warm accent mix.",
    state: {
      red: 0.06,
      green: 0.1,
      blue: 0.18,
      alpha: 1,
      scale: 0.82,
      rotation: 14,
      offsetX: 0.06,
      offsetY: -0.04,
      accent: 0.72,
    },
  },
  {
    label: "Aligned",
    description: "Centered mesh with a cooler clear color and lighter accent blending.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.22,
      alpha: 1,
      scale: 0.9,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      accent: 0.42,
    },
  },
  {
    label: "Orbit corner",
    description: "Stronger translation and rotation to emphasize GPU-side transform control.",
    state: {
      red: 0.1,
      green: 0.14,
      blue: 0.12,
      alpha: 1,
      scale: 0.62,
      rotation: -34,
      offsetX: -0.18,
      offsetY: 0.16,
      accent: 0.82,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL uniform transform scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGL uniform transform viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default WebGL uniform transform scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "S / Shift+S", description: "Increase or decrease the scale." },
  { keys: "T / Shift+T", description: "Increase or decrease the rotation." },
  { keys: "X / Shift+X", description: "Increase or decrease the horizontal offset." },
  { keys: "Y / Shift+Y", description: "Increase or decrease the vertical offset." },
  { keys: "N / Shift+N", description: "Increase or decrease the accent mix." },
  { keys: "Escape", description: "Reset to the default uniform-transform scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGlUniformTransformPageClient(props: {
  readonly serializedScene: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGlUniformTransformScene>(
    DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE,
  )
  const [runtime, setRuntime] = useState<WebGlCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the uniform-transform route checks browser support and prepares GPU-side parameter updates.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(
      props.serializedScene,
      isWebGlUniformTransformScene,
    )

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        scale: clampScale(initialScene.scale),
        rotation: clampRotation(initialScene.rotation),
        offsetX: clampOffset(initialScene.offsetX),
        offsetY: clampOffset(initialScene.offsetY),
        accent: clampChannel(initialScene.accent),
      })
      setStatusMessage("Loaded the uniform-transform scene from the shared URL.")
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
      releaseWebGlUniformTransformResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGlUniformTransformScene(canvas, runtime, scene)
    setStatusMessage(`Rendered a WebGL uniform-transform scene using ${runtime.version}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Context version", value: runtime?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlUniformTransformClearColor(scene) },
    { label: "Peak color", value: webGlUniformTransformPeakColor(scene) },
    { label: "Surface area", value: webGlUniformTransformArea(scene) },
    { label: "Translation", value: webGlUniformTransformTranslation(scene) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(WEBGL_UNIFORM_TRANSFORM_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgl-uniform-transform.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE)
        setStatusMessage("WebGL uniform transform scene reset to the default preset.")
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
      case "s":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          scale: stepNumericValue(current.scale, event.shiftKey ? -0.04 : 0.04, clampScale),
        }))
        break
      case "t":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          rotation: stepNumericValue(current.rotation, event.shiftKey ? -6 : 6, clampRotation),
        }))
        break
      case "x":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          offsetX: stepNumericValue(current.offsetX, event.shiftKey ? -0.03 : 0.03, clampOffset),
        }))
        break
      case "y":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          offsetY: stepNumericValue(current.offsetY, event.shiftKey ? -0.03 : 0.03, clampOffset),
        }))
        break
      case "n":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          accent: stepNumericValue(current.accent, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE)
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 6"
      title="WebGL Uniform Transform"
      description="A Next.js WebGL2 route that keeps one static mesh on the GPU and updates transform uniforms for scale, rotation, translation, and accent blending."
      highlights={[
        "First Next.js Phase 6 route to keep static geometry on the GPU while uniforms drive the visible motion",
        "Adds matrix and scalar uniform updates on top of the shared shader, buffer, and attribute helpers already established by the earlier WebGL routes",
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
          <WorkbenchControlSection heading="Uniform controls">
            {RANGE_CONTROLS.map((control) => {
              const sceneKey = control.id as keyof WebGlUniformTransformScene
              const value = scene[sceneKey]

              return (
                <WorkbenchRangeControl
                  key={control.id}
                  control={control}
                  value={value}
                  displayValue={control.id === "rotation" ? value.toFixed(0) : value.toFixed(2)}
                  onChange={(nextValue) =>
                    setScene((current) => ({
                      ...current,
                      [sceneKey]: clampSceneValue(sceneKey, nextValue),
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
            ariaLabel="WebGL uniform transform viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGL2 is unavailable in this environment, so the uniform transform route is showing
                a fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGL uniform transform scene"
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
            {webGlUniformTransformSummary(
              scene,
              runtimeStatusLabel(runtimeState),
              runtime?.version,
            )}
          </p>
          <p className="vm-copy">
            This route extends the gradient-triangle baseline by keeping one static mesh on the GPU
            and moving all visible transforms into uniforms so later WebGL routes can add indexed
            geometry and richer scenes without rewriting vertex data for every interaction.
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

function clampSceneValue(key: keyof WebGlUniformTransformScene, value: number): number {
  switch (key) {
    case "scale":
      return clampScale(value)
    case "rotation":
      return clampRotation(value)
    case "offsetX":
    case "offsetY":
      return clampOffset(value)
    default:
      return clampChannel(value)
  }
}

function clampChannel(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2))
}

function clampScale(value: number): number {
  return Number(Math.max(0.4, Math.min(1.2, value)).toFixed(2))
}

function clampRotation(value: number): number {
  return Number(Math.max(-180, Math.min(180, value)).toFixed(0))
}

function clampOffset(value: number): number {
  return Number(Math.max(-0.45, Math.min(0.45, value)).toFixed(2))
}
