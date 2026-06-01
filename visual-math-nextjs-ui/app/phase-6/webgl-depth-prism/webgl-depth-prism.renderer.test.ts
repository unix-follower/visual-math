import { DEFAULT_WEBGL_DEPTH_PRISM_SCENE } from "./webgl-depth-prism.model"
import {
  releaseWebGlDepthPrismResources,
  renderWebGlDepthPrismScene,
} from "./webgl-depth-prism.renderer"

describe("webgl-depth-prism.renderer", () => {
  it("enables depth testing, renders prism faces, and releases resources", () => {
    const runtime = createDepthPrismRuntime()
    const canvas = document.createElement("canvas")

    renderWebGlDepthPrismScene(canvas, runtime as never, DEFAULT_WEBGL_DEPTH_PRISM_SCENE)

    expect(runtime.context.viewport).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height)
    expect(runtime.context.enable).toHaveBeenCalledWith(runtime.context.DEPTH_TEST)
    expect(runtime.context.depthFunc).toHaveBeenCalledWith(runtime.context.LESS)
    expect(runtime.context.clearDepth).toHaveBeenCalledWith(1)
    expect(runtime.context.clearColor).toHaveBeenCalledWith(0.04, 0.06, 0.1, 1)
    expect(runtime.context.uniformMatrix4fv).toHaveBeenCalledWith(
      runtime.viewProjectionLocation,
      false,
      expect.any(Float32Array),
    )
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(1, runtime.liftLocation, 0.46)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(2, runtime.spreadLocation, 0.58)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(3, runtime.accentLocation, 0.42)
    expect(runtime.context.drawArrays).toHaveBeenCalledWith(runtime.context.TRIANGLES, 0, 36)

    expect(releaseWebGlDepthPrismResources(runtime as never)).toBe(true)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.vertexBuffer)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.program)
    expect(releaseWebGlDepthPrismResources(runtime as never)).toBe(false)
  })
})

function createDepthPrismRuntime() {
  const program = { id: "program" } as unknown as WebGLProgram
  const vertexBuffer = { id: "vertex" } as unknown as WebGLBuffer
  const vertexShader = { id: "vertex-shader" } as unknown as WebGLShader
  const fragmentShader = { id: "fragment-shader" } as unknown as WebGLShader
  const viewProjectionLocation = { id: "u_viewProjection" } as unknown as WebGLUniformLocation
  const liftLocation = { id: "u_lift" } as unknown as WebGLUniformLocation
  const spreadLocation = { id: "u_spread" } as unknown as WebGLUniformLocation
  const accentLocation = { id: "u_accent" } as unknown as WebGLUniformLocation
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
    DEPTH_BUFFER_BIT: 256,
    DEPTH_TEST: 2929,
    LESS: 513,
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
    getAttribLocation: jest.fn((_: unknown, name: string) => {
      switch (name) {
        case "a_position":
          return 0
        case "a_normal":
          return 1
        default:
          return 2
      }
    }),
    getUniformLocation: jest.fn((_: unknown, name: string) => {
      switch (name) {
        case "u_viewProjection":
          return viewProjectionLocation
        case "u_lift":
          return liftLocation
        case "u_spread":
          return spreadLocation
        default:
          return accentLocation
      }
    }),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    viewport: jest.fn(),
    enable: jest.fn(),
    depthFunc: jest.fn(),
    clearDepth: jest.fn(),
    clearColor: jest.fn(),
    clear: jest.fn(),
    useProgram: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    uniformMatrix4fv: jest.fn(),
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
    viewProjectionLocation,
    liftLocation,
    spreadLocation,
    accentLocation,
  }
}
