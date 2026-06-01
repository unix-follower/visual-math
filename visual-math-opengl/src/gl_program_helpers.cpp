#include "visual_math_opengl/gl_program_helpers.hpp"

#include <algorithm>
#include <fstream>
#include <sstream>
#include <stdexcept>
#include <string>

namespace visual_math::opengl {
namespace {

constexpr std::size_t to_index(ProgramSlot slot) {
	return static_cast<std::size_t>(slot);
}

std::string read_text_file(const std::filesystem::path& path) {
	std::ifstream file(path, std::ios::binary);
	if (!file.is_open()) {
		throw std::runtime_error("Unable to open OpenGL shader file: " + path.string());
	}

	std::ostringstream stream;
	stream << file.rdbuf();
	return stream.str();
}

GLuint compile_shader(GLenum type, const std::string& source) {
	const GLuint shader = glCreateShader(type);
	const GLchar* text = source.data();
	const GLint length = static_cast<GLint>(source.size());
	glShaderSource(shader, 1, &text, &length);
	glCompileShader(shader);

	GLint compiled = GL_FALSE;
	glGetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
	if (compiled == GL_TRUE) {
		return shader;
	}

	GLint log_length = 0;
	glGetShaderiv(shader, GL_INFO_LOG_LENGTH, &log_length);
	std::string log(static_cast<std::size_t>(std::max(log_length, 1)), '\0');
	glGetShaderInfoLog(shader, log_length, nullptr, log.data());
	glDeleteShader(shader);
	throw std::runtime_error("Failed to compile OpenGL shader: " + log);
}

GLuint create_program(
	const std::filesystem::path& shader_directory,
	std::string_view vertex_shader_name,
	std::string_view fragment_shader_name) {
	const std::string vertex_source = read_text_file(shader_directory / vertex_shader_name);
	const std::string fragment_source = read_text_file(shader_directory / fragment_shader_name);
	const GLuint vertex_shader = compile_shader(GL_VERTEX_SHADER, vertex_source);
	const GLuint fragment_shader = compile_shader(GL_FRAGMENT_SHADER, fragment_source);
	const GLuint program = glCreateProgram();
	glAttachShader(program, vertex_shader);
	glAttachShader(program, fragment_shader);
	glLinkProgram(program);
	glDeleteShader(vertex_shader);
	glDeleteShader(fragment_shader);

	GLint linked = GL_FALSE;
	glGetProgramiv(program, GL_LINK_STATUS, &linked);
	if (linked == GL_TRUE) {
		return program;
	}

	GLint log_length = 0;
	glGetProgramiv(program, GL_INFO_LOG_LENGTH, &log_length);
	std::string log(static_cast<std::size_t>(std::max(log_length, 1)), '\0');
	glGetProgramInfoLog(program, log_length, nullptr, log.data());
	glDeleteProgram(program);
	throw std::runtime_error("Failed to link OpenGL program: " + log);
}

ProgramUniformState resolve_uniforms(GLuint program, bool uses_indexed_material) {
	ProgramUniformState uniforms;
	uniforms.transform = glGetUniformLocation(program, "uTransform");
	if (uniforms.transform < 0) {
		throw std::runtime_error("Failed to locate the OpenGL transform uniform.");
	}
	if (uses_indexed_material) {
		uniforms.indexed_material = glGetUniformLocation(program, "uIndexedMaterial");
		uniforms.indexed_material_tuning = glGetUniformLocation(program, "uIndexedMaterialTuning");
		if (uniforms.indexed_material < 0 || uniforms.indexed_material_tuning < 0) {
			throw std::runtime_error("Failed to locate the OpenGL indexed material uniforms.");
		}
	}
	return uniforms;
}

}  // namespace

void create_renderer_programs(
	const std::filesystem::path& shader_directory,
	const RendererConfiguration& renderer_configuration,
	std::array<ProgramRuntimeState, 2>& programs) {
	for (const auto& specification : renderer_configuration.programs) {
		auto& program = programs[to_index(specification.slot)];
		program.handle = create_program(
			shader_directory,
			specification.vertex_shader_name,
			specification.fragment_shader_name);
		program.uniforms = resolve_uniforms(program.handle, specification.uses_indexed_material);
	}
}

void destroy_renderer_programs(std::array<ProgramRuntimeState, 2>& programs) noexcept {
	for (auto& program : programs) {
		if (program.handle != 0) {
			glDeleteProgram(program.handle);
			program.handle = 0;
		}
		program.uniforms = {};
	}
}

void bind_program_uniforms(
	const ProgramRuntimeState& program,
	const SceneTransformUniform& transform,
	bool uses_indexed_material) {
	glUniformMatrix4fv(program.uniforms.transform, 1, GL_FALSE, transform.transform.data());
	if (uses_indexed_material) {
		glUniform4fv(program.uniforms.indexed_material, 1, transform.indexed_material.data());
		glUniform4fv(program.uniforms.indexed_material_tuning, 1, transform.indexed_material_tuning.data());
	}
}

}  // namespace visual_math::opengl