import type { PointerEventHandler, ReactNode, Ref } from "react"

import type {
  RangeControlSchema,
  ToggleControlSchema,
  WorkbenchAction,
  WorkbenchKeyboardShortcut,
  WorkbenchMetric,
  WorkbenchPreset,
} from "./workbench.models"

export function MathWorkbench(props: {
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly highlights: readonly string[]
  readonly actions: readonly WorkbenchAction[]
  readonly keyboardShortcuts: readonly WorkbenchKeyboardShortcut[]
  readonly statusMessage: string
  readonly onAction: (actionId: string) => void
  readonly controls: ReactNode
  readonly viewport: ReactNode
  readonly notes: ReactNode
}) {
  return (
    <main className="vm-shell">
      <section className="vm-hero">
        <p className="vm-eyebrow">{props.eyebrow}</p>
        <h1>{props.title}</h1>
        <p className="vm-copy">{props.description}</p>
        <ul className="vm-highlights">
          {props.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
        <WorkbenchActions actions={props.actions} onAction={props.onAction} />
        <p className="vm-status" aria-live="polite">
          {props.statusMessage}
        </p>
      </section>

      <section className="vm-layout">
        <div className="vm-column">{props.controls}</div>
        <div className="vm-column vm-column--wide">{props.viewport}</div>
      </section>

      <section className="vm-panel">
        <h2>Keyboard shortcuts</h2>
        <ul className="vm-shortcuts">
          {props.keyboardShortcuts.map((shortcut) => (
            <li key={shortcut.keys}>
              <strong>{shortcut.keys}</strong>
              <span>{shortcut.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="vm-panel">{props.notes}</section>
    </main>
  )
}

export function WorkbenchControlSection(props: {
  readonly heading: string
  readonly children: ReactNode
}) {
  return (
    <section className="vm-panel vm-controls-section">
      <h2>{props.heading}</h2>
      <div className="vm-controls-stack">{props.children}</div>
    </section>
  )
}

export function WorkbenchRangeControl(props: {
  readonly control: RangeControlSchema
  readonly value: number
  readonly displayValue: string
  readonly onChange: (nextValue: number) => void
}) {
  return (
    <label className="vm-control" htmlFor={props.control.id}>
      <span className="vm-control__header">
        <span>{props.control.label}</span>
        <strong>{props.displayValue}</strong>
      </span>
      <input
        id={props.control.id}
        type="range"
        min={props.control.min}
        max={props.control.max}
        step={props.control.step}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
    </label>
  )
}

export function WorkbenchToggleControl(props: {
  readonly control: ToggleControlSchema
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
}) {
  return (
    <label className="vm-toggle" htmlFor={props.control.id}>
      <input
        id={props.control.id}
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <span>{props.control.label}</span>
    </label>
  )
}

export function WorkbenchPresetGrid<TScene>(props: {
  readonly presets: readonly WorkbenchPreset<TScene>[]
  readonly onPreset: (preset: WorkbenchPreset<TScene>) => void
}) {
  return (
    <div className="vm-preset-grid">
      {props.presets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          className="vm-preset"
          onClick={() => props.onPreset(preset)}
        >
          <strong>{preset.label}</strong>
          <span>{preset.description}</span>
        </button>
      ))}
    </div>
  )
}

export function WorkbenchMetricGrid(props: { readonly metrics: readonly WorkbenchMetric[] }) {
  return (
    <section className="vm-panel vm-metrics">
      <h2>Metrics</h2>
      <div className="vm-metric-grid">
        {props.metrics.map((metric) => (
          <div key={metric.label} className="vm-metric">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

export function WorkbenchViewportSurface(props: {
  readonly ariaLabel: string
  readonly onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
  readonly surfaceRef?: Ref<HTMLDivElement>
  readonly onPointerDown?: PointerEventHandler<HTMLDivElement>
  readonly onPointerMove?: PointerEventHandler<HTMLDivElement>
  readonly onPointerUp?: PointerEventHandler<HTMLDivElement>
  readonly onPointerLeave?: PointerEventHandler<HTMLDivElement>
  readonly children: ReactNode
}) {
  return (
    <div className="vm-panel vm-viewport">
      <div
        ref={props.surfaceRef}
        tabIndex={0}
        aria-label={props.ariaLabel}
        className="vm-viewport__surface"
        onKeyDown={props.onKeyDown}
        onPointerDown={props.onPointerDown}
        onPointerMove={props.onPointerMove}
        onPointerUp={props.onPointerUp}
        onPointerLeave={props.onPointerLeave}
      >
        {props.children}
      </div>
    </div>
  )
}

function WorkbenchActions(props: {
  readonly actions: readonly WorkbenchAction[]
  readonly onAction: (actionId: string) => void
}) {
  return (
    <div className="vm-actions">
      {props.actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className="vm-button"
          onClick={() => props.onAction(action.id)}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}
