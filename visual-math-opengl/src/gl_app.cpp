#include "visual_math_opengl/gl_app.hpp"
#include "visual_math_opengl/gl_program_helpers.hpp"
#include "visual_math_opengl/gl_resource_helpers.hpp"
#include "visual_math_opengl/renderer_configuration.hpp"
#include "visual_math_opengl/scene_catalog.hpp"
#include "visual_math_opengl/shader_assets.hpp"

#include "visual_math_opengl/gradient_triangle_scene.hpp"

#define GLFW_INCLUDE_NONE
#include <GLFW/glfw3.h>

#include <OpenGL/gl3.h>

#include <chrono>
#include <filesystem>
#include <iomanip>
#include <memory>
#include <sstream>
#include <stdexcept>
#include <utility>

namespace visual_math::opengl {

struct GLAppImpl {
	GradientTriangleScene scene = kDefaultGradientTriangleScene;
	OpenGLSceneKind scene_kind = OpenGLSceneKind::GradientTriangle;
	std::filesystem::path executable_path;
	GLFWwindow* window = nullptr;
	RendererConfiguration renderer_config;
	std::array<ProgramRuntimeState, 2> programs;
	GLGeometryRuntime geometry_runtime;
	std::filesystem::path shader_directory;
	std::string renderer = "pending initialization";
	std::string context_version = "pending initialization";
	std::uint32_t last_rendered_frames = 0;
	double last_run_seconds = 0.0;
	bool has_runtime_stats = false;
	bool glfw_initialized = false;
};

namespace {

constexpr int kWindowWidth = 960;
constexpr int kWindowHeight = 720;

constexpr std::size_t to_index(ProgramSlot slot) {
	return static_cast<std::size_t>(slot);
}

[[nodiscard]] GLenum gl_primitive(DrawPrimitive primitive) {
	switch (primitive) {
	case DrawPrimitive::Triangles:
		return GL_TRIANGLES;
	case DrawPrimitive::LineStrip:
		return GL_LINE_STRIP;
	}
	return GL_TRIANGLES;
}

constexpr std::size_t kVertexShaderIndex = 0;
constexpr std::size_t kFragmentShaderIndex = 1;
constexpr std::size_t kIndexedFragmentShaderIndex = 2;

std::array<std::filesystem::path, 3> shader_asset_paths(const std::filesystem::path& shader_directory) {
	return {
		shader_directory / kOpenGLShaderAssetNames[kVertexShaderIndex],
		shader_directory / kOpenGLShaderAssetNames[kFragmentShaderIndex],
		shader_directory / kOpenGLShaderAssetNames[kIndexedFragmentShaderIndex],
	};
}

void framebuffer_size_callback(GLFWwindow*, int width, int height) {
	glViewport(0, 0, width, height);
}

std::filesystem::path resolve_shader_directory(const std::filesystem::path& executable_path) {
	if (executable_path.empty()) {
		return std::filesystem::current_path() / "build" / kOpenGLShaderRelativeDirectory;
	}
	return executable_path.parent_path() / kOpenGLShaderRelativeDirectory;
}

void draw_triangle_frame(GLAppImpl& app) {
	const float elapsed_seconds = static_cast<float>(glfwGetTime());
	const SceneTransformUniform transform = build_gradient_triangle_transform(app.scene, elapsed_seconds);
	const RgbaColor clear = gradient_triangle_clear_color(app.scene);
	glClearColor(clear.red, clear.green, clear.blue, clear.alpha);
	glClear(GL_COLOR_BUFFER_BIT);
	ProgramSlot bound_program = ProgramSlot::Base;
	bool has_bound_program = false;
	for (const auto& pass : app.renderer_config.draw_passes) {
		const auto program_index = to_index(pass.slot);
		const auto& program = app.programs[program_index];
		const bool uses_indexed_material = pass.slot == ProgramSlot::Indexed;
		if (!has_bound_program || bound_program != pass.slot) {
			glUseProgram(program.handle);
			bind_program_uniforms(program, transform, uses_indexed_material);
			bound_program = pass.slot;
			has_bound_program = true;
		}
		glBindVertexArray(geometry_resource(app.geometry_runtime, pass.geometry_slot).vertex_array);
		if (pass.indexed) {
			glDrawElements(gl_primitive(pass.primitive), static_cast<GLsizei>(pass.vertex_or_index_count), GL_UNSIGNED_SHORT, nullptr);
		} else {
			glDrawArrays(gl_primitive(pass.primitive), 0, static_cast<GLsizei>(pass.vertex_or_index_count));
		}
	}
	glBindVertexArray(0);
	glUseProgram(0);
	glfwSwapBuffers(app.window);
}

}  // namespace

std::filesystem::path resolve_opengl_shader_directory(const std::filesystem::path& executable_path) {
	return resolve_shader_directory(executable_path);
}

std::array<std::filesystem::path, 3> opengl_shader_asset_paths(const std::filesystem::path& executable_path) {
	return shader_asset_paths(resolve_shader_directory(executable_path));
}

GLApp::GLApp(std::string executable_path, GradientTriangleScene scene, OpenGLSceneKind scene_kind)
	: impl_(std::make_unique<GLAppImpl>()) {
	if (!is_valid_gradient_triangle_scene(scene)) {
		throw std::invalid_argument("GLApp requires a valid gradient triangle scene.");
	}
	impl_->renderer_config = make_renderer_configuration(scene_kind);
	impl_->scene = scene;
	impl_->scene_kind = scene_kind;
	impl_->executable_path = executable_path.empty()
		? std::filesystem::current_path() / "build" / "visual_math_opengl"
		: std::filesystem::path(std::move(executable_path));
	impl_->shader_directory = resolve_shader_directory(impl_->executable_path);
}

GLApp::~GLApp() {
	cleanup();
}

GLApp::GLApp(GLApp&& other) noexcept = default;

GLApp& GLApp::operator=(GLApp&& other) noexcept = default;

std::string GLApp::startup_summary() const {
	std::ostringstream stream;
	stream << "Phase 8 OpenGL is complete. "
	       << "The native target now builds a reusable core library, ports the validated Phase 7 scene/config layer, prepares a GLFW-backed OpenGL renderer slice with triangle, two indexed overlays, outline, a dedicated indexed material path, checked-in GLSL shader assets, externalized renderer program configuration, externalized pass-resource configuration, an extracted renderer configuration model, an externalized scene catalog, externalized GL resource helpers, and externalized GL program helpers, and exposes a thin entry point for frame-limited execution. Renderer "
	       << impl_->renderer
	       << ", context "
	       << impl_->context_version
	       << ". Scene kind "
	       << opengl_scene_kind_label(impl_->scene_kind)
	       << ". Active scene scale "
	       << impl_->scene.scale
	       << ", rotation "
	       << gradient_triangle_rotation_label(impl_->scene)
	       << ", animation speed "
	       << impl_->scene.animation_speed
	       << " deg/s"
	       << ", material pulse speed "
	       << impl_->scene.material_pulse_speed
	       << " hz"
	       << ", material pulse intensity "
	       << impl_->scene.material_pulse_intensity
	       << ", material palette bias "
	       << impl_->scene.material_palette_bias
	       << ", material alpha floor "
	       << impl_->scene.material_alpha_floor
	       << ", material luminance response "
	       << impl_->scene.material_luminance_response
	       << ".";
	return stream.str();
}

std::string GLApp::runtime_summary() const {
	constexpr double kMinimumFpsSampleSeconds = 0.001;

	if (!impl_->has_runtime_stats) {
		return "Runtime stats are not available until the renderer completes a run.";
	}

	std::ostringstream stream;
	stream << "Runtime stats: "
	       << impl_->last_rendered_frames
	       << " frame";
	if (impl_->last_rendered_frames != 1U) {
		stream << 's';
	}
	stream << " in "
	       << std::fixed
	       << std::setprecision(4)
	       << impl_->last_run_seconds
	       << " s";
	if (impl_->last_run_seconds >= kMinimumFpsSampleSeconds) {
		stream << " (avg "
		       << std::setprecision(2)
		       << static_cast<double>(impl_->last_rendered_frames) / impl_->last_run_seconds
		       << " fps)";
	} else {
		stream << " (avg fps unavailable for the current short run)";
	}
	stream << '.';
	return stream.str();
}

void GLApp::run(std::uint32_t max_frames) {
	initialize();
	const auto start_time = std::chrono::steady_clock::now();
	std::uint32_t rendered_frames = 0;
	while (!glfwWindowShouldClose(impl_->window) && (max_frames == 0 || rendered_frames < max_frames)) {
		glfwPollEvents();
		draw_triangle_frame(*impl_);
		++rendered_frames;
	}
	const auto end_time = std::chrono::steady_clock::now();
	impl_->last_rendered_frames = rendered_frames;
	impl_->last_run_seconds = std::chrono::duration<double>(end_time - start_time).count();
	impl_->has_runtime_stats = true;
}

void GLApp::initialize() {
	if (initialized_) {
		return;
	}
	if (glfwInit() != GLFW_TRUE) {
		throw std::runtime_error("Failed to initialize GLFW.");
	}
	impl_->glfw_initialized = true;
	glfwWindowHint(GLFW_CLIENT_API, GLFW_OPENGL_API);
	glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 4);
	glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 1);
	glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GLFW_TRUE);
	glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
	impl_->window = glfwCreateWindow(kWindowWidth, kWindowHeight, "Visual Math OpenGL", nullptr, nullptr);
	if (impl_->window == nullptr) {
		throw std::runtime_error("Failed to create the OpenGL window.");
	}
	glfwMakeContextCurrent(impl_->window);
	glfwSwapInterval(1);
	glfwSetFramebufferSizeCallback(impl_->window, framebuffer_size_callback);
	int framebuffer_width = 0;
	int framebuffer_height = 0;
	glfwGetFramebufferSize(impl_->window, &framebuffer_width, &framebuffer_height);
	glViewport(0, 0, framebuffer_width, framebuffer_height);

	create_renderer_programs(impl_->shader_directory, impl_->renderer_config, impl_->programs);
	glEnable(GL_BLEND);
	glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
	glGenBuffers(1, &impl_->geometry_runtime.shared_index_buffer);
	create_geometry_resources(impl_->geometry_runtime, impl_->renderer_config, impl_->scene);

	const GLubyte* renderer = glGetString(GL_RENDERER);
	const GLubyte* version = glGetString(GL_VERSION);
	impl_->renderer = renderer != nullptr ? reinterpret_cast<const char*>(renderer) : "unknown renderer";
	impl_->context_version = version != nullptr ? reinterpret_cast<const char*>(version) : "unknown version";
	initialized_ = true;
}

void GLApp::cleanup() noexcept {
	if (!impl_) {
		return;
	}
	destroy_geometry_resources(impl_->geometry_runtime, impl_->renderer_config);
	destroy_renderer_programs(impl_->programs);
	if (impl_->window != nullptr) {
		glfwDestroyWindow(impl_->window);
		impl_->window = nullptr;
	}
	if (impl_->glfw_initialized) {
		glfwTerminate();
		impl_->glfw_initialized = false;
	}
	initialized_ = false;
}

}  // namespace visual_math::opengl