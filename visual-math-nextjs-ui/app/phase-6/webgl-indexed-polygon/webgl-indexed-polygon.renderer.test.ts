import { DEFAULT_WEBGL_INDEXED_POLYGON_SCENE } from "./webgl-indexed-polygon.model"
import {
  releaseWebGlIndexedPolygonResources,
  renderWebGlIndexedPolygonScene,
} from "./webgl-indexed-polygon.renderer"

describe("webgl-indexed-polygon.renderer", () => {
  it("draws indexed polygon geometry and releases cached resources", () => {
    const runtime = createIndexedPolygonRuntime()
    const canvas = document.createElement("canvas")

    renderWebGlIndexedPolygonScene(canvas, runtime as never, DEFAULT_WEBGL_INDEXED_POLYGON_SCENE)

    expect(runtime.context.viewport).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height)
    expect(runtime.context.clearColor).toHaveBeenCalledWith(0.06, 0.1, 0.18, 1)
    expect(runtime.context.useProgram).toHaveBeenCalledWith(runtime.program)
    expect(runtime.context.bindBuffer).toHaveBeenNthCalledWith(
      1,
      runtime.context.ARRAY_BUFFER,
      runtime.vertexBuffer,
    )
    expect(runtime.context.bindBuffer).toHaveBeenNthCalledWith(
      2,
      runtime.context.ELEMENT_ARRAY_BUFFER,
      runtime.indexBuffer,
    )
    const vertexData = runtime.context.bufferData.mock.calls[0][1] as Float32Array
    const indexData = runtime.context.bufferData.mock.calls[1][1] as Uint16Array
    expect(vertexData.length).toBe(42)
    expect(indexData.length).toBe(18)
    expect(indexData[0]).toBe(0)
    expect(indexData[1]).toBe(1)
    expect(indexData[2]).toBe(2)
    expect(runtime.context.drawElements).toHaveBeenCalledWith(
      runtime.context.TRIANGLES,
      18,
      runtime.context.UNSIGNED_SHORT,
      0,
    )

    expect(releaseWebGlIndexedPolygonResources(runtime as never)).toBe(true)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.vertexBuffer)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.indexBuffer)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.program)
    expect(releaseWebGlIndexedPolygonResources(runtime as never)).toBe(false)
  })
})

function createIndexedPolygonRuntime() {
  const program = { id: "program" } as unknown as WebGLProgram
  const vertexBuffer = { id: "vertex" } as unknown as WebGLBuffer
  const indexBuffer = { id: "index" } as unknown as WebGLBuffer
  const vertexShader = { id: "vertex-shader" } as unknown as WebGLShader
  const fragmentShader = { id: "fragment-shader" } as unknown as WebGLShader
  let shaderCallCount = 0
  let bufferCallCount = 0

  const context = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    ELEMENT_ARRAY_BUFFER: 34963,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    TRIANGLES: 4,
    UNSIGNED_SHORT: 5123,
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
    createBuffer: jest.fn(() => {
      bufferCallCount += 1
      return bufferCallCount === 1 ? vertexBuffer : indexBuffer
    }),
    getAttribLocation: jest.fn((_: unknown, name: string) => (name === "a_position" ? 0 : 1)),
    viewport: jest.fn(),
    clearColor: jest.fn(),
    clear: jest.fn(),
    useProgram: jest.fn(),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    drawElements: jest.fn(),
    deleteBuffer: jest.fn(),
    deleteProgram: jest.fn(),
  } as unknown as WebGL2RenderingContext

  return {
    context,
    version: "webgl2" as const,
    program,
    vertexBuffer,
    indexBuffer,
  }
}
