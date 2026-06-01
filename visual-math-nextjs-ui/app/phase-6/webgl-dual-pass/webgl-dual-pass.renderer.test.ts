import { DEFAULT_WEBGL_DUAL_PASS_SCENE } from "./webgl-dual-pass.model"
import { releaseWebGlDualPassResources, renderWebGlDualPassScene } from "./webgl-dual-pass.renderer"

describe("webgl-dual-pass.renderer", () => {
  it("renders the offscreen and composite passes and releases resources", () => {
    const runtime = createDualPassRuntime()
    const canvas = document.createElement("canvas")

    renderWebGlDualPassScene(canvas, runtime as never, DEFAULT_WEBGL_DUAL_PASS_SCENE)

    expect(runtime.context.bindFramebuffer).toHaveBeenNthCalledWith(
      1,
      runtime.context.FRAMEBUFFER,
      runtime.framebuffer,
    )
    expect(runtime.context.viewport).toHaveBeenNthCalledWith(1, 0, 0, 512, 512)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(1, runtime.skewLocation, 0.42)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(2, runtime.glowLocation, 0.68)
    expect(runtime.context.bindFramebuffer).toHaveBeenNthCalledWith(
      2,
      runtime.context.FRAMEBUFFER,
      null,
    )
    expect(runtime.context.clearColor).toHaveBeenLastCalledWith(0.06, 0.1, 0.2, 1)
    expect(runtime.context.uniform1i).toHaveBeenCalledWith(runtime.textureLocation, 0)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(3, runtime.mixLocation, 0.58)
    expect(runtime.context.drawArrays).toHaveBeenNthCalledWith(1, runtime.context.TRIANGLES, 0, 6)
    expect(runtime.context.drawArrays).toHaveBeenNthCalledWith(2, runtime.context.TRIANGLES, 0, 6)

    expect(releaseWebGlDualPassResources(runtime as never)).toBe(true)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.geometryBuffer)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.quadBuffer)
    expect(runtime.context.deleteFramebuffer).toHaveBeenCalledWith(runtime.framebuffer)
    expect(runtime.context.deleteTexture).toHaveBeenCalledWith(runtime.renderTexture)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.firstProgram)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.secondProgram)
    expect(releaseWebGlDualPassResources(runtime as never)).toBe(false)
  })
})

function createDualPassRuntime() {
  const firstProgram = { id: "first-program" } as unknown as WebGLProgram
  const secondProgram = { id: "second-program" } as unknown as WebGLProgram
  const geometryBuffer = { id: "geometry-buffer" } as unknown as WebGLBuffer
  const quadBuffer = { id: "quad-buffer" } as unknown as WebGLBuffer
  const renderTexture = { id: "render-texture" } as unknown as WebGLTexture
  const framebuffer = { id: "framebuffer" } as unknown as WebGLFramebuffer
  const vertexShader1 = { id: "vertex-shader-1" } as unknown as WebGLShader
  const fragmentShader1 = { id: "fragment-shader-1" } as unknown as WebGLShader
  const vertexShader2 = { id: "vertex-shader-2" } as unknown as WebGLShader
  const fragmentShader2 = { id: "fragment-shader-2" } as unknown as WebGLShader
  const skewLocation = { id: "u_skew" } as unknown as WebGLUniformLocation
  const glowLocation = { id: "u_glow" } as unknown as WebGLUniformLocation
  const textureLocation = { id: "u_texture" } as unknown as WebGLUniformLocation
  const mixLocation = { id: "u_mix" } as unknown as WebGLUniformLocation
  let shaderCallCount = 0
  let programCallCount = 0
  let bufferCallCount = 0

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
    FRAMEBUFFER: 36160,
    COLOR_ATTACHMENT0: 36064,
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
      if (shaderCallCount === 1) {
        return vertexShader1
      }
      if (shaderCallCount === 2) {
        return fragmentShader1
      }
      if (shaderCallCount === 3) {
        return vertexShader2
      }
      return fragmentShader2
    }),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    getShaderParameter: jest.fn(() => true),
    getShaderInfoLog: jest.fn(() => null),
    deleteShader: jest.fn(),
    createProgram: jest.fn(() => {
      programCallCount += 1
      return programCallCount === 1 ? firstProgram : secondProgram
    }),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    getProgramParameter: jest.fn(() => true),
    getProgramInfoLog: jest.fn(() => null),
    createBuffer: jest.fn(() => {
      bufferCallCount += 1
      return bufferCallCount === 1 ? geometryBuffer : quadBuffer
    }),
    createTexture: jest.fn(() => renderTexture),
    createFramebuffer: jest.fn(() => framebuffer),
    getAttribLocation: jest.fn((program: unknown, name: string) => {
      if (program === firstProgram) {
        return name === "a_position" ? 0 : 1
      }
      return name === "a_position" ? 0 : 1
    }),
    getUniformLocation: jest.fn((program: unknown, name: string) => {
      if (program === firstProgram) {
        return name === "u_skew" ? skewLocation : glowLocation
      }
      return name === "u_texture" ? textureLocation : mixLocation
    }),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    bindTexture: jest.fn(),
    texParameteri: jest.fn(),
    texImage2D: jest.fn(),
    bindFramebuffer: jest.fn(),
    framebufferTexture2D: jest.fn(),
    viewport: jest.fn(),
    clearColor: jest.fn(),
    clear: jest.fn(),
    useProgram: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    activeTexture: jest.fn(),
    uniform1i: jest.fn(),
    uniform1f: jest.fn(),
    drawArrays: jest.fn(),
    deleteBuffer: jest.fn(),
    deleteTexture: jest.fn(),
    deleteFramebuffer: jest.fn(),
    deleteProgram: jest.fn(),
  } as unknown as WebGL2RenderingContext

  return {
    context,
    version: "webgl2" as const,
    firstProgram,
    secondProgram,
    geometryBuffer,
    quadBuffer,
    renderTexture,
    framebuffer,
    skewLocation,
    glowLocation,
    textureLocation,
    mixLocation,
  }
}
