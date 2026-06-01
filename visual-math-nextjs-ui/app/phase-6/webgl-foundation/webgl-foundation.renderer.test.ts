import { DEFAULT_WEBGL_FOUNDATION_SCENE } from "./webgl-foundation.model"
import {
  releaseWebGlFoundationResources,
  renderWebGlFoundationScene,
} from "./webgl-foundation.renderer"

describe("webgl-foundation.renderer", () => {
  it("clears the canvas and tracks the runtime", () => {
    const runtime = createFoundationRuntime()
    const canvas = document.createElement("canvas")

    renderWebGlFoundationScene(canvas, runtime, DEFAULT_WEBGL_FOUNDATION_SCENE)

    expect(runtime.context.viewport).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height)
    expect(runtime.context.clearColor).toHaveBeenCalledWith(0.09, 0.14, 0.22, 1)
    expect(runtime.context.clear).toHaveBeenCalledWith(runtime.context.COLOR_BUFFER_BIT)
    expect(releaseWebGlFoundationResources(runtime)).toBe(true)
    expect(releaseWebGlFoundationResources(runtime)).toBe(false)
  })
})

function createFoundationRuntime() {
  return {
    context: {
      COLOR_BUFFER_BIT: 16384,
      viewport: jest.fn(),
      clearColor: jest.fn(),
      clear: jest.fn(),
    } as unknown as WebGL2RenderingContext,
    version: "webgl2" as const,
  }
}
