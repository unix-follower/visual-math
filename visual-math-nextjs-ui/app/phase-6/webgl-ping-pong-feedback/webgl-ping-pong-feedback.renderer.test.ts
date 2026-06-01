import { DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE } from "./webgl-ping-pong-feedback.model"
import {
  releaseWebGlPingPongFeedbackResources,
  renderWebGlPingPongFeedbackScene,
} from "./webgl-ping-pong-feedback.renderer"

describe("webgl-ping-pong-feedback.renderer", () => {
  it("renders the ping-pong feedback passes and releases resources", () => {
    const runtime = createPingPongFeedbackRuntime()
    const canvas = document.createElement("canvas")

    renderWebGlPingPongFeedbackScene(
      canvas,
      runtime as never,
      DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE,
    )

    expect(runtime.context.bindFramebuffer).toHaveBeenCalledWith(
      runtime.context.FRAMEBUFFER,
      runtime.firstFramebuffer,
    )
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(1, runtime.energyLocation, 0.72)
    expect(runtime.context.bindFramebuffer).toHaveBeenCalledWith(
      runtime.context.FRAMEBUFFER,
      runtime.secondFramebuffer,
    )
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(2, runtime.driftLocation, 0.34)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(3, runtime.feedbackLocation, 0.5084)
    expect(runtime.context.bindFramebuffer).toHaveBeenCalledWith(
      runtime.context.FRAMEBUFFER,
      runtime.firstFramebuffer,
    )
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(4, runtime.driftLocation, 0.17)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(5, runtime.feedbackLocation, 0.62)
    expect(runtime.context.bindFramebuffer).toHaveBeenCalledWith(runtime.context.FRAMEBUFFER, null)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(6, runtime.driftLocation, 0)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(7, runtime.feedbackLocation, 0.2852)
    expect(runtime.context.drawArrays).toHaveBeenCalledTimes(4)

    expect(releaseWebGlPingPongFeedbackResources(runtime as never)).toBe(true)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.geometryBuffer)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.quadBuffer)
    expect(runtime.context.deleteFramebuffer).toHaveBeenCalledWith(runtime.firstFramebuffer)
    expect(runtime.context.deleteFramebuffer).toHaveBeenCalledWith(runtime.secondFramebuffer)
    expect(runtime.context.deleteTexture).toHaveBeenCalledWith(runtime.firstTexture)
    expect(runtime.context.deleteTexture).toHaveBeenCalledWith(runtime.secondTexture)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.seedProgram)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.feedbackProgram)
    expect(releaseWebGlPingPongFeedbackResources(runtime as never)).toBe(false)
  })
})

function createPingPongFeedbackRuntime() {
  const seedProgram = { id: "seed-program" } as unknown as WebGLProgram
  const feedbackProgram = { id: "feedback-program" } as unknown as WebGLProgram
  const geometryBuffer = { id: "geometry-buffer" } as unknown as WebGLBuffer
  const quadBuffer = { id: "quad-buffer" } as unknown as WebGLBuffer
  const firstTexture = { id: "first-texture" } as unknown as WebGLTexture
  const secondTexture = { id: "second-texture" } as unknown as WebGLTexture
  const firstFramebuffer = { id: "first-framebuffer" } as unknown as WebGLFramebuffer
  const secondFramebuffer = { id: "second-framebuffer" } as unknown as WebGLFramebuffer
  const vertexShader1 = { id: "vertex-shader-1" } as unknown as WebGLShader
  const fragmentShader1 = { id: "fragment-shader-1" } as unknown as WebGLShader
  const vertexShader2 = { id: "vertex-shader-2" } as unknown as WebGLShader
  const fragmentShader2 = { id: "fragment-shader-2" } as unknown as WebGLShader
  const energyLocation = { id: "u_energy" } as unknown as WebGLUniformLocation
  const textureLocation = { id: "u_texture" } as unknown as WebGLUniformLocation
  const driftLocation = { id: "u_drift" } as unknown as WebGLUniformLocation
  const feedbackLocation = { id: "u_feedback" } as unknown as WebGLUniformLocation
  let shaderCallCount = 0
  let programCallCount = 0
  let bufferCallCount = 0
  let textureCallCount = 0
  let framebufferCallCount = 0

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
      if (shaderCallCount === 1) return vertexShader1
      if (shaderCallCount === 2) return fragmentShader1
      if (shaderCallCount === 3) return vertexShader2
      return fragmentShader2
    }),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    getShaderParameter: jest.fn(() => true),
    getShaderInfoLog: jest.fn(() => null),
    deleteShader: jest.fn(),
    createProgram: jest.fn(() => {
      programCallCount += 1
      return programCallCount === 1 ? seedProgram : feedbackProgram
    }),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    getProgramParameter: jest.fn(() => true),
    getProgramInfoLog: jest.fn(() => null),
    createBuffer: jest.fn(() => {
      bufferCallCount += 1
      return bufferCallCount === 1 ? geometryBuffer : quadBuffer
    }),
    createTexture: jest.fn(() => {
      textureCallCount += 1
      return textureCallCount === 1 ? firstTexture : secondTexture
    }),
    createFramebuffer: jest.fn(() => {
      framebufferCallCount += 1
      return framebufferCallCount === 1 ? firstFramebuffer : secondFramebuffer
    }),
    getAttribLocation: jest.fn((program: unknown, name: string) => {
      if (program === seedProgram) return name === "a_position" ? 0 : 1
      return name === "a_position" ? 0 : 1
    }),
    getUniformLocation: jest.fn((program: unknown, name: string) => {
      if (program === seedProgram) return energyLocation
      if (name === "u_texture") return textureLocation
      if (name === "u_drift") return driftLocation
      return feedbackLocation
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
    seedProgram,
    feedbackProgram,
    geometryBuffer,
    quadBuffer,
    firstTexture,
    secondTexture,
    firstFramebuffer,
    secondFramebuffer,
    energyLocation,
    textureLocation,
    driftLocation,
    feedbackLocation,
  }
}
