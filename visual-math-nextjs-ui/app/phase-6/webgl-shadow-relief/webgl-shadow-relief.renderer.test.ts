import { DEFAULT_WEBGL_SHADOW_RELIEF_SCENE } from "./webgl-shadow-relief.model"
import {
  releaseWebGlShadowReliefResources,
  renderWebGlShadowReliefScene,
} from "./webgl-shadow-relief.renderer"

describe("webgl-shadow-relief.renderer", () => {
  it("renders the relief material pass and releases resources", () => {
    const runtime = createShadowReliefRuntime()
    const canvas = document.createElement("canvas")

    renderWebGlShadowReliefScene(canvas, runtime as never, DEFAULT_WEBGL_SHADOW_RELIEF_SCENE)

    expect(runtime.context.viewport).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height)
    expect(runtime.context.clearColor).toHaveBeenCalledWith(0.04, 0.06, 0.1, 1)
    expect(runtime.context.uniformMatrix3fv).toHaveBeenCalledWith(
      runtime.materialLocation,
      false,
      expect.any(Float32Array),
    )
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(1, runtime.warmthLocation, 0.64)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(2, runtime.reliefLocation, 0.58)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(3, runtime.shadowLocation, 0.52)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(4, runtime.glossLocation, 0.44)
    expect(runtime.context.drawArrays).toHaveBeenCalledWith(runtime.context.TRIANGLES, 0, 6)

    expect(releaseWebGlShadowReliefResources(runtime as never)).toBe(true)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.vertexBuffer)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.program)
    expect(releaseWebGlShadowReliefResources(runtime as never)).toBe(false)
  })
})

function createShadowReliefRuntime() {
  const program = { id: "program" } as unknown as WebGLProgram
  const vertexBuffer = { id: "vertex" } as unknown as WebGLBuffer
  const vertexShader = { id: "vertex-shader" } as unknown as WebGLShader
  const fragmentShader = { id: "fragment-shader" } as unknown as WebGLShader
  const materialLocation = { id: "u_materialBlock" } as unknown as WebGLUniformLocation
  const warmthLocation = { id: "u_warmth" } as unknown as WebGLUniformLocation
  const reliefLocation = { id: "u_relief" } as unknown as WebGLUniformLocation
  const shadowLocation = { id: "u_shadow" } as unknown as WebGLUniformLocation
  const glossLocation = { id: "u_gloss" } as unknown as WebGLUniformLocation
  let shaderCallCount = 0

  const context = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    TRIANGLES: 4,
    COLOR_BUFFER_BIT: 16384,
    createShader: jest.fn(() => {
      shaderCallCount += 1
      return shaderCallCount === 1 ? vertexShader : fragmentShader
    }),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    getShaderParameter: jest.fn(() => true),
    getShaderInfoLog: jest.fn(() => null),
    deleteShader: jest.fn(),
    createProgram: jest.fn(() => program),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    getProgramParameter: jest.fn(() => true),
    getProgramInfoLog: jest.fn(() => null),
    createBuffer: jest.fn(() => vertexBuffer),
    getAttribLocation: jest.fn((_: unknown, name: string) => (name === "a_position" ? 0 : 1)),
    getUniformLocation: jest.fn((_: unknown, name: string) => {
      switch (name) {
        case "u_materialBlock":
          return materialLocation
        case "u_warmth":
          return warmthLocation
        case "u_relief":
          return reliefLocation
        case "u_shadow":
          return shadowLocation
        default:
          return glossLocation
      }
    }),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    viewport: jest.fn(),
    clearColor: jest.fn(),
    clear: jest.fn(),
    useProgram: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    uniformMatrix3fv: jest.fn(),
    uniform1f: jest.fn(),
    drawArrays: jest.fn(),
    deleteBuffer: jest.fn(),
    deleteProgram: jest.fn(),
  } as unknown as WebGL2RenderingContext

  return {
    context,
    version: "webgl2" as const,
    program,
    vertexBuffer,
    materialLocation,
    warmthLocation,
    reliefLocation,
    shadowLocation,
    glossLocation,
  }
}
