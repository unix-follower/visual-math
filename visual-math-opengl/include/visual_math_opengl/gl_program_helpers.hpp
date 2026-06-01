#pragma once

#include "visual_math_opengl/gradient_triangle_scene.hpp"
#include "visual_math_opengl/renderer_configuration.hpp"

#include <OpenGL/gl3.h>

#include <array>
#include <filesystem>

namespace visual_math::opengl {

struct ProgramUniformState {
	GLint transform = -1;
	GLint indexed_material = -1;
	GLint indexed_material_tuning = -1;
};

struct ProgramRuntimeState {
	GLuint handle = 0;
	ProgramUniformState uniforms;
};

void create_renderer_programs(
	const std::filesystem::path& shader_directory,
	const RendererConfiguration& renderer_configuration,
	std::array<ProgramRuntimeState, 2>& programs);
void destroy_renderer_programs(std::array<ProgramRuntimeState, 2>& programs) noexcept;
void bind_program_uniforms(
	const ProgramRuntimeState& program,
	const SceneTransformUniform& transform,
	bool uses_indexed_material);

}  // namespace visual_math::opengl