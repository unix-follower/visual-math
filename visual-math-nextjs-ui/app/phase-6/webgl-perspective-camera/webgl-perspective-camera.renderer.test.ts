import { DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE } from "./webgl-perspective-camera.model"
import {
  releaseWebGlPerspectiveCameraResources,
  renderWebGlPerspectiveCameraScene,
} from "./webgl-perspective-camera.renderer"

describe("webgl-perspective-camera.renderer", () => {
  it("uploads layered geometry, updates perspective uniforms, and releases resources", () => {
    const runtime = createPerspectiveCameraRuntime()
    const canvas = document.createElement("canvas")

    renderWebGlPerspectiveCameraScene(
      canvas,
      runtime as never,
      DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE,
    )

    expect(runtime.context.viewport).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height)
    expect(runtime.context.clearColor).toHaveBeenCalledWith(0.04, 0.07, 0.12, 1)
    expect(runtime.context.useProgram).toHaveBeenCalledWith(runtime.program)
    expect(runtime.context.uniformMatrix4fv).toHaveBeenCalledWith(
      runtime.viewProjectionLocation,
      false,
      expect.any(Float32Array),
    )
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(1, runtime.depthLocation, 0.56)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(2, runtime.accentLocation, 0.62)
    expect(runtime.context.drawArrays).toHaveBeenCalledWith(runtime.context.TRIANGLES, 0, 18)

    expect(releaseWebGlPerspectiveCameraResources(runtime as never)).toBe(true)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.vertexBuffer)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.program)
    expect(releaseWebGlPerspectiveCameraResources(runtime as never)).toBe(false)
  })
})

function createPerspectiveCameraRuntime() {
  const program = { id: "program" } as unknown as WebGLProgram
  const vertexBuffer = { id: "vertex" } as unknown as WebGLBuffer
  const vertexShader = { id: "vertex-shader" } as unknown as WebGLShader
  const fragmentShader = { id: "fragment-shader" } as unknown as WebGLShader
  const viewProjectionLocation = { id: "u_viewProjection" } as unknown as WebGLUniformLocation
  const depthLocation = { id: "u_depth" } as unknown as WebGLUniformLocation
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
        case "u_viewProjection":
          return viewProjectionLocation
        case "u_depth":
          return depthLocation
        default:
          return accentLocation
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
    depthLocation,
    accentLocation,
  }
}
