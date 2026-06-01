import { DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE } from "./webgl-gradient-triangle.model"
import {
  releaseWebGlGradientTriangleResources,
  renderWebGlGradientTriangleScene,
} from "./webgl-gradient-triangle.renderer"

describe("webgl-gradient-triangle.renderer", () => {
  it("draws a gradient triangle and releases cached resources", () => {
    const runtime = createGradientTriangleRuntime()
    const canvas = document.createElement("canvas")

    renderWebGlGradientTriangleScene(
      canvas,
      runtime as never,
      DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE,
    )

    expect(runtime.context.viewport).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height)
    expect(runtime.context.clearColor).toHaveBeenCalledWith(0.08, 0.12, 0.18, 1)
    expect(runtime.context.useProgram).toHaveBeenCalledWith(runtime.program)
    expect(runtime.context.bindBuffer).toHaveBeenCalledWith(
      runtime.context.ARRAY_BUFFER,
      runtime.buffer,
    )
    expect(runtime.context.bufferData).toHaveBeenCalledWith(
      runtime.context.ARRAY_BUFFER,
      expect.any(Float32Array),
      runtime.context.STATIC_DRAW,
    )
    const vertexData = runtime.context.bufferData.mock.calls[0][1] as Float32Array
    expect(vertexData[0]).toBeCloseTo(-0.473, 3)
    expect(vertexData[1]).toBeCloseTo(-0.361, 3)
    expect(vertexData[2]).toBeCloseTo(0.408, 3)
    expect(runtime.context.drawArrays).toHaveBeenCalledWith(runtime.context.TRIANGLES, 0, 3)

    expect(releaseWebGlGradientTriangleResources(runtime as never)).toBe(true)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.buffer)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.program)
    expect(releaseWebGlGradientTriangleResources(runtime as never)).toBe(false)
  })
})

function createGradientTriangleRuntime() {
  const program = { id: "program" } as unknown as WebGLProgram
  const buffer = { id: "buffer" } as unknown as WebGLBuffer
  const vertexShader = { id: "vertex" } as unknown as WebGLShader
  const fragmentShader = { id: "fragment" } as unknown as WebGLShader
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
    createBuffer: jest.fn(() => buffer),
    getAttribLocation: jest.fn((_: unknown, name: string) => (name === "a_position" ? 0 : 1)),
    viewport: jest.fn(),
    clearColor: jest.fn(),
    clear: jest.fn(),
    useProgram: jest.fn(),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    drawArrays: jest.fn(),
    deleteBuffer: jest.fn(),
    deleteProgram: jest.fn(),
  } as unknown as WebGL2RenderingContext

  return {
    context,
    version: "webgl2" as const,
    program,
    buffer,
  }
}
