import { DEFAULT_WEBGL_TEXTURE_GRID_SCENE } from "./webgl-texture-grid.model"
import {
  releaseWebGlTextureGridResources,
  renderWebGlTextureGridScene,
} from "./webgl-texture-grid.renderer"

describe("webgl-texture-grid.renderer", () => {
  it("uploads a texture-backed quad and releases cached resources", () => {
    const runtime = createTextureGridRuntime()
    const canvas = document.createElement("canvas")

    renderWebGlTextureGridScene(canvas, runtime as never, DEFAULT_WEBGL_TEXTURE_GRID_SCENE)

    expect(runtime.context.viewport).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height)
    expect(runtime.context.clearColor).toHaveBeenCalledWith(0.08, 0.1, 0.22, 1)
    expect(runtime.context.useProgram).toHaveBeenCalledWith(runtime.program)
    expect(runtime.context.activeTexture).toHaveBeenCalledWith(runtime.context.TEXTURE0)
    expect(runtime.context.uniform1i).toHaveBeenCalledWith(runtime.textureLocation, 0)
    expect(runtime.context.texImage2D).toHaveBeenCalledWith(
      runtime.context.TEXTURE_2D,
      0,
      runtime.context.RGBA,
      4,
      4,
      0,
      runtime.context.RGBA,
      runtime.context.UNSIGNED_BYTE,
      expect.any(Uint8Array),
    )
    expect(runtime.context.drawArrays).toHaveBeenCalledWith(runtime.context.TRIANGLES, 0, 6)

    expect(releaseWebGlTextureGridResources(runtime as never)).toBe(true)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.vertexBuffer)
    expect(runtime.context.deleteTexture).toHaveBeenCalledWith(runtime.texture)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.program)
    expect(releaseWebGlTextureGridResources(runtime as never)).toBe(false)
  })
})

function createTextureGridRuntime() {
  const program = { id: "program" } as unknown as WebGLProgram
  const vertexBuffer = { id: "vertex" } as unknown as WebGLBuffer
  const texture = { id: "texture" } as unknown as WebGLTexture
  const vertexShader = { id: "vertex-shader" } as unknown as WebGLShader
  const fragmentShader = { id: "fragment-shader" } as unknown as WebGLShader
  const textureLocation = { id: "u_texture" } as unknown as WebGLUniformLocation
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
    TEXTURE0: 33984,
    TEXTURE_2D: 3553,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    NEAREST: 9728,
    CLAMP_TO_EDGE: 33071,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
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
    createTexture: jest.fn(() => texture),
    getAttribLocation: jest.fn((_: unknown, name: string) => (name === "a_position" ? 0 : 1)),
    getUniformLocation: jest.fn(() => textureLocation),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    bindTexture: jest.fn(),
    texParameteri: jest.fn(),
    texImage2D: jest.fn(),
    viewport: jest.fn(),
    clearColor: jest.fn(),
    clear: jest.fn(),
    useProgram: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    activeTexture: jest.fn(),
    uniform1i: jest.fn(),
    drawArrays: jest.fn(),
    deleteBuffer: jest.fn(),
    deleteTexture: jest.fn(),
    deleteProgram: jest.fn(),
  } as unknown as WebGL2RenderingContext

  return {
    context,
    version: "webgl2" as const,
    program,
    vertexBuffer,
    texture,
    textureLocation,
  }
}
