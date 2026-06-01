import { DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE } from "./webgl-uniform-transform.model"
import {
  releaseWebGlUniformTransformResources,
  renderWebGlUniformTransformScene,
} from "./webgl-uniform-transform.renderer"

describe("webgl-uniform-transform.renderer", () => {
  it("draws a transformed quad and releases cached resources", () => {
    const runtime = createUniformTransformRuntime()
    const canvas = document.createElement("canvas")

    renderWebGlUniformTransformScene(
      canvas,
      runtime as never,
      DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE,
    )

    expect(runtime.context.viewport).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height)
    expect(runtime.context.clearColor).toHaveBeenCalledWith(0.06, 0.1, 0.18, 1)
    expect(runtime.context.useProgram).toHaveBeenCalledWith(runtime.program)
    expect(runtime.context.bindBuffer).toHaveBeenCalledWith(
      runtime.context.ARRAY_BUFFER,
      runtime.buffer,
    )
    expect(runtime.context.uniform1f).toHaveBeenCalledWith(runtime.uniformAccent, 0.72)
    const matrix = runtime.context.uniformMatrix3fv.mock.calls[0][2] as Float32Array
    expect(matrix[0]).toBeCloseTo(0.796, 3)
    expect(matrix[1]).toBeCloseTo(0.198, 3)
    expect(matrix[6]).toBeCloseTo(0.06, 3)
    expect(matrix[7]).toBeCloseTo(-0.04, 3)
    expect(runtime.context.drawArrays).toHaveBeenCalledWith(runtime.context.TRIANGLES, 0, 6)

    expect(releaseWebGlUniformTransformResources(runtime as never)).toBe(true)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.buffer)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.program)
    expect(releaseWebGlUniformTransformResources(runtime as never)).toBe(false)
  })
})

function createUniformTransformRuntime() {
  const program = { id: "program" } as unknown as WebGLProgram
  const buffer = { id: "buffer" } as unknown as WebGLBuffer
  const vertexShader = { id: "vertex" } as unknown as WebGLShader
  const fragmentShader = { id: "fragment" } as unknown as WebGLShader
  const uniformTransform = { id: "u_transform" } as unknown as WebGLUniformLocation
  const uniformAccent = { id: "u_accent" } as unknown as WebGLUniformLocation
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
    getUniformLocation: jest.fn((_: unknown, name: string) =>
      name === "u_transform" ? uniformTransform : uniformAccent,
    ),
    viewport: jest.fn(),
    clearColor: jest.fn(),
    clear: jest.fn(),
    useProgram: jest.fn(),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
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
    buffer,
    uniformAccent,
  }
}
