import { DEFAULT_WEBGL_LIT_MATERIAL_SCENE } from "./webgl-lit-material.model"
import {
  releaseWebGlLitMaterialResources,
  renderWebGlLitMaterialScene,
} from "./webgl-lit-material.renderer"

describe("webgl-lit-material.renderer", () => {
  it("renders the lit orb material pass and releases resources", () => {
    const runtime = createLitMaterialRuntime()
    const canvas = document.createElement("canvas")

    renderWebGlLitMaterialScene(canvas, runtime as never, DEFAULT_WEBGL_LIT_MATERIAL_SCENE)

    expect(runtime.context.viewport).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height)
    expect(runtime.context.clearColor).toHaveBeenCalledWith(0.05, 0.07, 0.11, 1)
    expect(runtime.context.uniformMatrix3fv).toHaveBeenCalledWith(
      runtime.materialBlockLocation,
      false,
      expect.any(Float32Array),
    )
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(1, runtime.warmthLocation, 0.62)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(2, runtime.metalnessLocation, 0.46)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(3, runtime.roughnessLocation, 0.34)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(4, runtime.rimLocation, 0.38)
    expect(runtime.context.drawArrays).toHaveBeenCalledWith(runtime.context.TRIANGLES, 0, 6)

    expect(releaseWebGlLitMaterialResources(runtime as never)).toBe(true)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.vertexBuffer)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.program)
    expect(releaseWebGlLitMaterialResources(runtime as never)).toBe(false)
  })
})

function createLitMaterialRuntime() {
  const program = { id: "program" } as unknown as WebGLProgram
  const vertexBuffer = { id: "vertex" } as unknown as WebGLBuffer
  const vertexShader = { id: "vertex-shader" } as unknown as WebGLShader
  const fragmentShader = { id: "fragment-shader" } as unknown as WebGLShader
  const materialBlockLocation = { id: "u_materialBlock" } as unknown as WebGLUniformLocation
  const warmthLocation = { id: "u_warmth" } as unknown as WebGLUniformLocation
  const metalnessLocation = { id: "u_metalness" } as unknown as WebGLUniformLocation
  const roughnessLocation = { id: "u_roughness" } as unknown as WebGLUniformLocation
  const rimLocation = { id: "u_rim" } as unknown as WebGLUniformLocation
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
          return materialBlockLocation
        case "u_warmth":
          return warmthLocation
        case "u_metalness":
          return metalnessLocation
        case "u_roughness":
          return roughnessLocation
        default:
          return rimLocation
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
    materialBlockLocation,
    warmthLocation,
    metalnessLocation,
    roughnessLocation,
    rimLocation,
  }
}
