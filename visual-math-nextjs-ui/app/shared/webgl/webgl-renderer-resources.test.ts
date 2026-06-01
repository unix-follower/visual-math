import {
  getOrCreateCachedWebGlResources,
  markWebGlRuntimeRendered,
  releaseCachedWebGlResources,
  releaseMarkedWebGlRuntime,
  syncWebGlCanvasSize,
} from "./webgl-renderer-resources"

describe("webgl-renderer-resources", () => {
  const originalDevicePixelRatio = globalThis.devicePixelRatio

  afterEach(() => {
    Object.defineProperty(globalThis, "devicePixelRatio", {
      configurable: true,
      value: originalDevicePixelRatio,
    })
  })

  it("sizes the canvas using device pixel ratio", () => {
    const canvas = document.createElement("canvas")

    Object.defineProperty(globalThis, "devicePixelRatio", {
      configurable: true,
      value: 2,
    })

    syncWebGlCanvasSize(canvas, 320, 180)

    expect(canvas.width).toBe(640)
    expect(canvas.height).toBe(360)
    expect(canvas.style.width).toBe("320px")
    expect(canvas.style.height).toBe("180px")
  })

  it("tracks whether a runtime has rendered", () => {
    const runtime = {} as never
    const cache = new WeakSet<object>()

    markWebGlRuntimeRendered(cache as never, runtime)

    expect(releaseMarkedWebGlRuntime(cache as never, runtime)).toBe(true)
    expect(releaseMarkedWebGlRuntime(cache as never, runtime)).toBe(false)
  })

  it("reuses cached resources for the same runtime", () => {
    const runtime = {} as never
    const cache = new WeakMap<object, { readonly id: string }>()
    const create = jest.fn(() => ({ id: "resources" }))

    const first = getOrCreateCachedWebGlResources(cache as never, runtime, create)
    const second = getOrCreateCachedWebGlResources(cache as never, runtime, create)

    expect(first).toBe(second)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it("releases cached resources only when present", () => {
    const runtime = {} as never
    const cache = new WeakMap<object, { readonly id: string }>()
    const resources = { id: "resources" }
    const release = jest.fn()

    cache.set(runtime, resources)

    expect(releaseCachedWebGlResources(cache as never, runtime, release)).toBe(true)
    expect(release).toHaveBeenCalledWith(resources)
    expect(releaseCachedWebGlResources(cache as never, runtime, release)).toBe(false)
    expect(release).toHaveBeenCalledTimes(1)
  })
})
