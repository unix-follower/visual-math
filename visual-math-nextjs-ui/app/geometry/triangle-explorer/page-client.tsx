"use client"

import { useEffect, useRef, useState } from "react"

import {
  MathWorkbench,
  WorkbenchControlSection,
  WorkbenchMetricGrid,
  WorkbenchPresetGrid,
  WorkbenchRangeControl,
  WorkbenchToggleControl,
  WorkbenchViewportSurface,
} from "@/app/shared/workbench/workbench"
import { stepNumericValue } from "@/app/shared/workbench/workbench-keyboard"
import type {
  RangeControlSchema,
  ToggleControlSchema,
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
  DEFAULT_TRIANGLE_SCENE,
  isTriangleScene,
  triangleArea,
  triangleCentroid,
  trianglePerimeter,
  triangleSummary,
  type TriangleScene,
} from "./triangle-explorer.model"
import { renderTriangleScene } from "./triangle-explorer.renderer"

const TRIANGLE_ROUTE_PATH = "/geometry/triangle-explorer"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  {
    kind: "range",
    id: "base",
    label: "Base length",
    min: 2,
    max: 10,
    step: 0.5,
  },
  { kind: "range", id: "height", label: "Height", min: 2, max: 8, step: 0.5 },
  {
    kind: "range",
    id: "rotationDegrees",
    label: "Rotation",
    min: -180,
    max: 180,
    step: 5,
  },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showCentroid", label: "Show centroid" },
  { kind: "toggle", id: "showSideLengths", label: "Show side lengths" },
]
const PRESETS: readonly WorkbenchPreset<TriangleScene>[] = [
  {
    label: "Balanced triangle",
    description: "Readable baseline for area and centroid intuition.",
    state: {
      base: 6,
      height: 4,
      rotationDegrees: 0,
      showCentroid: true,
      showSideLengths: true,
    },
  },
  {
    label: "Tall triangle",
    description: "Pushes centroid upward and changes perimeter.",
    state: {
      base: 4,
      height: 7,
      rotationDegrees: 0,
      showCentroid: true,
      showSideLengths: true,
    },
  },
  {
    label: "Wide rotated",
    description: "Highlights rigid rotation and unchanged area.",
    state: {
      base: 9,
      height: 3.5,
      rotationDegrees: 35,
      showCentroid: true,
      showSideLengths: true,
    },
  },
  {
    label: "Minimal labels",
    description: "Focuses on shape alone.",
    state: {
      base: 5,
      height: 4.5,
      rotationDegrees: -25,
      showCentroid: false,
      showSideLengths: false,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized triangle scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current geometry viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default triangle scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  {
    keys: "Arrow Left/Right",
    description: "Adjust the base length while the viewport is focused.",
  },
  { keys: "Arrow Up/Down", description: "Adjust the height." },
  { keys: "[ and ]", description: "Rotate the triangle by five degrees." },
  { keys: "C", description: "Toggle centroid visibility." },
  { keys: "L", description: "Toggle side-length labels." },
  { keys: "R", description: "Reset to the default triangle preset." },
]

export function TriangleExplorerPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [scene, setScene] = useState<TriangleScene>(DEFAULT_TRIANGLE_SCENE)
  const [statusMessage, setStatusMessage] = useState(
    "Focus the graph area for keyboard geometry controls.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isTriangleScene)

    if (initialScene) {
      setScene(initialScene)
      setStatusMessage("Loaded the triangle scene from the shared URL.")
    }

    setHasLoadedSearchState(true)
  }, [hasLoadedSearchState, props.serializedScene])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    renderTriangleScene(canvas, scene)
  }, [scene])

  const centroid = triangleCentroid(scene)
  const metrics = [
    { label: "Area", value: triangleArea(scene).toFixed(2) },
    { label: "Perimeter", value: trianglePerimeter(scene).toFixed(2) },
    {
      label: "Centroid",
      value: `(${centroid.x.toFixed(2)}, ${centroid.y.toFixed(2)})`,
    },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(TRIANGLE_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "triangle-explorer.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_TRIANGLE_SCENE)
        setStatusMessage("Triangle scene reset to the default preset.")
        break
    }
  }

  function handleViewportKeydown(event: React.KeyboardEvent<HTMLDivElement>): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          base: stepNumericValue(current.base, -0.5, (value) => clamp(value, 2, 10)),
        }))
        setStatusMessage("Base length decreased.")
        break
      case "ArrowRight":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          base: stepNumericValue(current.base, 0.5, (value) => clamp(value, 2, 10)),
        }))
        setStatusMessage("Base length increased.")
        break
      case "ArrowUp":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          height: stepNumericValue(current.height, 0.5, (value) => clamp(value, 2, 8)),
        }))
        setStatusMessage("Height increased.")
        break
      case "ArrowDown":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          height: stepNumericValue(current.height, -0.5, (value) => clamp(value, 2, 8)),
        }))
        setStatusMessage("Height decreased.")
        break
      case "[":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          rotationDegrees: stepNumericValue(current.rotationDegrees, -5, (value) =>
            clamp(value, -180, 180),
          ),
        }))
        setStatusMessage("Triangle rotated counterclockwise.")
        break
      case "]":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          rotationDegrees: stepNumericValue(current.rotationDegrees, 5, (value) =>
            clamp(value, -180, 180),
          ),
        }))
        setStatusMessage("Triangle rotated clockwise.")
        break
      case "c":
      case "C":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          showCentroid: !current.showCentroid,
        }))
        setStatusMessage("Centroid visibility toggled.")
        break
      case "l":
      case "L":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          showSideLengths: !current.showSideLengths,
        }))
        setStatusMessage("Side-length labels toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        setScene(DEFAULT_TRIANGLE_SCENE)
        setStatusMessage("Triangle scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Geometry"
      title="Triangle Explorer"
      description="A Next.js Canvas route for exploring triangle area, centroid, side lengths, and rigid rotation using the shared Phase 4 workbench surface."
      highlights={[
        "Third live Next.js Canvas route and the second daily-math slice",
        "Area, perimeter, centroid, and side labels in one geometry view",
        "Reuses the shared workbench without new Phase 4 infrastructure",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Triangle controls">
            {RANGE_CONTROLS.map((control) => (
              <WorkbenchRangeControl
                key={control.id}
                control={control}
                value={
                  scene[
                    control.id as keyof Pick<TriangleScene, "base" | "height" | "rotationDegrees">
                  ]
                }
                displayValue={
                  control.id === "rotationDegrees"
                    ? scene.rotationDegrees.toFixed(0)
                    : scene[control.id as keyof Pick<TriangleScene, "base" | "height">].toFixed(1)
                }
                onChange={(nextValue) =>
                  setScene((current) => ({
                    ...current,
                    [control.id]: nextValue,
                  }))
                }
              />
            ))}
          </WorkbenchControlSection>

          <WorkbenchControlSection heading="Display options">
            {TOGGLE_CONTROLS.map((control) => (
              <WorkbenchToggleControl
                key={control.id}
                control={control}
                checked={
                  scene[control.id as keyof Pick<TriangleScene, "showCentroid" | "showSideLengths">]
                }
                onChange={(checked) =>
                  setScene((current) => ({ ...current, [control.id]: checked }))
                }
              />
            ))}
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
            ariaLabel="Triangle explorer viewport"
            onKeyDown={handleViewportKeydown}
          >
            <canvas
              ref={canvasRef}
              width={720}
              height={480}
              className="vm-canvas"
              aria-label="Canvas showing the current triangle scene"
            />
          </WorkbenchViewportSurface>
          <WorkbenchMetricGrid metrics={metrics} />
        </>
      }
      notes={
        <>
          <h2>Route notes</h2>
          <p className="vm-copy">{triangleSummary(scene)}</p>
          <p className="vm-copy">
            This geometry slice broadens Phase 4 across a second daily-math category while keeping
            the same serialized URL, export, reset, preset, and keyboard contracts used by the
            earlier routes.
          </p>
        </>
      }
    />
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
