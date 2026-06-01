import { getWebGlContext, hasWebGlSupport, initializeWebGlCanvas } from "./webgl-bootstrap"

describe("webgl-bootstrap", () => {
  const originalContext = globalThis.WebGL2RenderingContext

  afterEach(() => {
    if (originalContext === undefined) {
      // @ts-expect-error test cleanup for optional global
      delete globalThis.WebGL2RenderingContext
    } else {
      Object.defineProperty(globalThis, "WebGL2RenderingContext", {
        configurable: true,
        value: originalContext,
      })
    }

    jest.restoreAllMocks()
  })

  it("detects WebGL2 support from the global context constructor", () => {
    // @ts-expect-error test setup for optional global
    delete globalThis.WebGL2RenderingContext
    expect(hasWebGlSupport()).toBe(false)

    Object.defineProperty(globalThis, "WebGL2RenderingContext", {
      configurable: true,
      value: function WebGL2RenderingContext() {},
    })

    expect(hasWebGlSupport()).toBe(true)
  })

  it("returns null when the canvas throws while requesting a WebGL2 context", () => {
    const canvas = document.createElement("canvas")
    jest.spyOn(canvas, "getContext").mockImplementation(() => {
      throw new Error("unsupported")
    })

    expect(getWebGlContext(canvas)).toBeNull()
  })

  it("reports missing WebGL2 support", () => {
    // @ts-expect-error test setup for optional global
    delete globalThis.WebGL2RenderingContext

    expect(initializeWebGlCanvas(document.createElement("canvas"))).toEqual({
      ok: false,
      reason: "WebGL2 is unavailable in this browser or test environment.",
    })
  })

  it("reports when the browser does not provide a WebGL2 context", () => {
    const canvas = document.createElement("canvas")

    Object.defineProperty(globalThis, "WebGL2RenderingContext", {
      configurable: true,
      value: function WebGL2RenderingContext() {},
    })
    jest.spyOn(canvas, "getContext").mockReturnValue(null)

    expect(initializeWebGlCanvas(canvas)).toEqual({
      ok: false,
      reason: "WebGL2 is unavailable in this browser or test environment.",
    })
  })

  it("returns a ready WebGL2 runtime when the browser provides a context", () => {
    const canvas = document.createElement("canvas")
    const context = { clear: jest.fn() } as unknown as WebGL2RenderingContext

    Object.defineProperty(globalThis, "WebGL2RenderingContext", {
      configurable: true,
      value: function WebGL2RenderingContext() {},
    })
    jest.spyOn(canvas, "getContext").mockReturnValue(context)

    expect(initializeWebGlCanvas(canvas)).toEqual({
      ok: true,
      runtime: {
        context,
        version: "webgl2",
      },
    })
  })
})
