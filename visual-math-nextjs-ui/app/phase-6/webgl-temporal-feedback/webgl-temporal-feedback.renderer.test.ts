import { DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE } from "./webgl-temporal-feedback.model"
import {
  releaseWebGlTemporalFeedbackResources,
  renderWebGlTemporalFeedbackScene,
} from "./webgl-temporal-feedback.renderer"

describe("webgl-temporal-feedback.renderer", () => {
  it("renders persistent feedback across frames and releases resources", () => {
    const runtime = createTemporalFeedbackRuntime()
    const canvas = document.createElement("canvas")

    renderWebGlTemporalFeedbackScene(
      canvas,
      runtime as never,
      DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE,
      0.25,
    )
    renderWebGlTemporalFeedbackScene(
      canvas,
      runtime as never,
      DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE,
      0.5,
    )

    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(1, runtime.driftLocation, 0.34)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(2, runtime.decayLocation, 0.62)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(3, runtime.injectionLocation, 0.74)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(4, runtime.phaseLocation, 0.25)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(5, runtime.mixLocation, 0.68)
    expect(runtime.context.uniform1f).toHaveBeenNthCalledWith(9, runtime.phaseLocation, 0.5)
    expect(runtime.context.drawArrays).toHaveBeenCalledTimes(4)
    expect(runtime.context.bindFramebuffer).toHaveBeenCalledWith(
      runtime.context.FRAMEBUFFER,
      runtime.firstFramebuffer,
    )
    expect(runtime.context.bindFramebuffer).toHaveBeenCalledWith(
      runtime.context.FRAMEBUFFER,
      runtime.secondFramebuffer,
    )
    expect(runtime.context.bindFramebuffer).toHaveBeenCalledWith(runtime.context.FRAMEBUFFER, null)

    expect(releaseWebGlTemporalFeedbackResources(runtime as never)).toBe(true)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.feedbackQuadBuffer)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.compositeQuadBuffer)
    expect(runtime.context.deleteFramebuffer).toHaveBeenCalledWith(runtime.firstFramebuffer)
    expect(runtime.context.deleteFramebuffer).toHaveBeenCalledWith(runtime.secondFramebuffer)
    expect(runtime.context.deleteTexture).toHaveBeenCalledWith(runtime.firstTexture)
    expect(runtime.context.deleteTexture).toHaveBeenCalledWith(runtime.secondTexture)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.feedbackProgram)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.compositeProgram)
    expect(releaseWebGlTemporalFeedbackResources(runtime as never)).toBe(false)
  })
})

function createTemporalFeedbackRuntime() {
  const feedbackProgram = { id: "feedback-program" } as unknown as WebGLProgram
  const compositeProgram = { id: "composite-program" } as unknown as WebGLProgram
  const feedbackQuadBuffer = { id: "feedback-quad-buffer" } as unknown as WebGLBuffer
  const compositeQuadBuffer = { id: "composite-quad-buffer" } as unknown as WebGLBuffer
  const firstTexture = { id: "first-texture" } as unknown as WebGLTexture
  const secondTexture = { id: "second-texture" } as unknown as WebGLTexture
  const firstFramebuffer = { id: "first-framebuffer" } as unknown as WebGLFramebuffer
  const secondFramebuffer = { id: "second-framebuffer" } as unknown as WebGLFramebuffer
  const shaders = Array.from(
    { length: 4 },
    (_, index) => ({ id: `shader-${index}` }) as unknown as WebGLShader,
  )
  const feedbackTextureLocation = { id: "feedback-u_texture" } as unknown as WebGLUniformLocation
  const driftLocation = { id: "u_drift" } as unknown as WebGLUniformLocation
  const decayLocation = { id: "u_decay" } as unknown as WebGLUniformLocation
  const injectionLocation = { id: "u_injection" } as unknown as WebGLUniformLocation
  const phaseLocation = { id: "u_phase" } as unknown as WebGLUniformLocation
  const compositeTextureLocation = { id: "composite-u_texture" } as unknown as WebGLUniformLocation
  const mixLocation = { id: "u_mix" } as unknown as WebGLUniformLocation
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
    createShader: jest.fn(() => shaders[shaderCallCount++]),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    getShaderParameter: jest.fn(() => true),
    getShaderInfoLog: jest.fn(() => null),
    deleteShader: jest.fn(),
    createProgram: jest.fn(() => {
      programCallCount += 1
      return programCallCount === 1 ? feedbackProgram : compositeProgram
    }),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    getProgramParameter: jest.fn(() => true),
    getProgramInfoLog: jest.fn(() => null),
    createBuffer: jest.fn(() => {
      bufferCallCount += 1
      return bufferCallCount === 1 ? feedbackQuadBuffer : compositeQuadBuffer
    }),
    createTexture: jest.fn(() => {
      textureCallCount += 1
      return textureCallCount === 1 ? firstTexture : secondTexture
    }),
    createFramebuffer: jest.fn(() => {
      framebufferCallCount += 1
      return framebufferCallCount === 1 ? firstFramebuffer : secondFramebuffer
    }),
    getAttribLocation: jest.fn(() => 0),
    getUniformLocation: jest.fn((program: unknown, name: string) => {
      if (program === feedbackProgram) {
        if (name === "u_texture") return feedbackTextureLocation
        if (name === "u_drift") return driftLocation
        if (name === "u_decay") return decayLocation
        if (name === "u_injection") return injectionLocation
        return phaseLocation
      }
      if (name === "u_texture") return compositeTextureLocation
      return mixLocation
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
    feedbackProgram,
    compositeProgram,
    feedbackQuadBuffer,
    compositeQuadBuffer,
    firstTexture,
    secondTexture,
    firstFramebuffer,
    secondFramebuffer,
    driftLocation,
    decayLocation,
    injectionLocation,
    phaseLocation,
    mixLocation,
  }
}
