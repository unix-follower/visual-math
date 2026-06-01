import { DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE } from "./webgl-textured-material.model"
import {
  releaseWebGlTexturedMaterialResources,
  renderWebGlTexturedMaterialScene,
} from "./webgl-textured-material.renderer"

describe("webgl-textured-material.renderer", () => {
  it("renders the textured material pass and releases resources", () => {
    const runtime = createTexturedMaterialRuntime()
    const canvas = document.createElement("canvas")

    renderWebGlTexturedMaterialScene(
      canvas,
      runtime as never,
      DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE,
    )

    expect(runtime.context.viewport).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height)
    expect(runtime.context.clearColor).toHaveBeenCalledWith(0.04, 0.06, 0.1, 1)
    expect(runtime.context.activeTexture).toHaveBeenCalledWith(runtime.context.TEXTURE0)
    expect(runtime.context.uniformMatrix3fv).toHaveBeenCalledWith(
      runtime.materialLocation,
      false,
      expect.any(Float32Array),
    )
    expect(runtime.context.uniform1i).toHaveBeenCalledWith(runtime.textureLocation, 0)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(1, runtime.warmthLocation, 0.58)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(2, runtime.textureMixLocation, 0.74)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(3, runtime.reliefLocation, 0.46)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(4, runtime.glossLocation, 0.52)
    expect(runtime.context.drawArrays).toHaveBeenCalledWith(runtime.context.TRIANGLES, 0, 6)

    expect(releaseWebGlTexturedMaterialResources(runtime as never)).toBe(true)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.vertexBuffer)
    expect(runtime.context.deleteTexture).toHaveBeenCalledWith(runtime.texture)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.program)
    expect(releaseWebGlTexturedMaterialResources(runtime as never)).toBe(false)
  })
})

function createTexturedMaterialRuntime() {
  const program = { id: "program" } as unknown as WebGLProgram
  const vertexBuffer = { id: "vertex" } as unknown as WebGLBuffer
  const texture = { id: "texture" } as unknown as WebGLTexture
  const vertexShader = { id: "vertex-shader" } as unknown as WebGLShader
  const fragmentShader = { id: "fragment-shader" } as unknown as WebGLShader
  const materialLocation = { id: "u_materialBlock" } as unknown as WebGLUniformLocation
  const textureLocation = { id: "u_texture" } as unknown as WebGLUniformLocation
  const warmthLocation = { id: "u_warmth" } as unknown as WebGLUniformLocation
  const textureMixLocation = { id: "u_textureMix" } as unknown as WebGLUniformLocation
  const reliefLocation = { id: "u_relief" } as unknown as WebGLUniformLocation
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
    TEXTURE0: 33984,
    TEXTURE_2D: 3553,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    CLAMP_TO_EDGE: 33071,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    LINEAR: 9729,
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
    getUniformLocation: jest.fn((_: unknown, name: string) => {
      switch (name) {
        case "u_materialBlock":
          return materialLocation
        case "u_texture":
          return textureLocation
        case "u_warmth":
          return warmthLocation
        case "u_textureMix":
          return textureMixLocation
        case "u_relief":
          return reliefLocation
        default:
          return glossLocation
      }
    }),
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
    uniformMatrix3fv: jest.fn(),
    uniform1i: jest.fn(),
    uniform1f: jest.fn(),
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
    materialLocation,
    textureLocation,
    warmthLocation,
    textureMixLocation,
    reliefLocation,
    glossLocation,
  }
}
