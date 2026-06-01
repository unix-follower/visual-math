import {
  createRequiredWebGlAttributeLocation,
  enableInterleavedWebGlAttributes,
} from "./webgl-binding-resources"

describe("webgl-binding-resources", () => {
  it("returns a required attribute location", () => {
    const context = createBindingContext()

    expect(
      createRequiredWebGlAttributeLocation(context as never, {} as WebGLProgram, "a_position"),
    ).toBe(3)
  })

  it("throws when an attribute location is missing", () => {
    const context = createBindingContext({ getAttribLocation: () => -1 })

    expect(() =>
      createRequiredWebGlAttributeLocation(context as never, {} as WebGLProgram, "a_position"),
    ).toThrow("WebGL attribute lookup failed for a_position.")
  })

  it("enables and configures interleaved attributes", () => {
    const context = createBindingContext()

    enableInterleavedWebGlAttributes(context as never, 6, [
      { location: 0, size: 2, offsetFloats: 0 },
      { location: 1, size: 4, offsetFloats: 2 },
    ])

    expect(context.enableVertexAttribArray).toHaveBeenNthCalledWith(1, 0)
    expect(context.vertexAttribPointer).toHaveBeenNthCalledWith(1, 0, 2, 5126, false, 24, 0)
    expect(context.vertexAttribPointer).toHaveBeenNthCalledWith(2, 1, 4, 5126, false, 24, 8)
  })
})

function createBindingContext(overrides?: Partial<ReturnType<typeof baseBindingContext>>) {
  return { ...baseBindingContext(), ...overrides }
}

function baseBindingContext() {
  return {
    FLOAT: 5126,
    getAttribLocation: jest.fn(() => 3),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
  }
}
