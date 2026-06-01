import {
  compileWebGlShader,
  createLinkedWebGlProgram,
  createRequiredWebGlBuffer,
} from "./webgl-program-resources"

describe("webgl-program-resources", () => {
  it("creates a required buffer", () => {
    const context = createProgramContext()

    expect(createRequiredWebGlBuffer(context as never)).toBe(context.buffer)
  })

  it("throws when a buffer cannot be created", () => {
    const context = createProgramContext({ createBuffer: () => null })

    expect(() => createRequiredWebGlBuffer(context as never)).toThrow(
      "WebGL buffer creation failed.",
    )
  })

  it("compiles and links a program while releasing temporary shaders", () => {
    const context = createProgramContext()

    const program = createLinkedWebGlProgram(context as never, "vertex", "fragment")

    expect(program).toBe(context.program)
    expect(context.attachShader).toHaveBeenCalledTimes(2)
    expect(context.linkProgram).toHaveBeenCalledWith(context.program)
    expect(context.deleteShader).toHaveBeenCalledWith(context.vertexShader)
    expect(context.deleteShader).toHaveBeenCalledWith(context.fragmentShader)
  })

  it("throws on shader compile failure and deletes the failed shader", () => {
    const context = createProgramContext({
      getShaderParameter: (_shader: unknown, param: number) => param !== 35713,
      getShaderInfoLog: () => "compile failed",
    })

    expect(() => compileWebGlShader(context as never, context.VERTEX_SHADER, "vertex")).toThrow(
      "compile failed",
    )
    expect(context.deleteShader).toHaveBeenCalledWith(context.vertexShader)
  })
})

function createProgramContext(overrides?: Partial<ReturnType<typeof baseProgramContext>>) {
  return { ...baseProgramContext(), ...overrides }
}

function baseProgramContext() {
  const vertexShader = { id: "vertex" } as unknown as WebGLShader
  const fragmentShader = { id: "fragment" } as unknown as WebGLShader
  const program = { id: "program" } as unknown as WebGLProgram
  const buffer = { id: "buffer" } as unknown as WebGLBuffer
  let shaderCallCount = 0

  return {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    vertexShader,
    fragmentShader,
    program,
    buffer,
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
  }
}
