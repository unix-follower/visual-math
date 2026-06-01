#pragma once

#include "visual_math_opengl/gradient_triangle_scene.hpp"

#include <array>
#include <cstdint>
#include <filesystem>
#include <memory>
#include <string>

namespace visual_math::opengl {

struct GLAppImpl;

[[nodiscard]] std::filesystem::path resolve_opengl_shader_directory(const std::filesystem::path& executable_path);
[[nodiscard]] std::array<std::filesystem::path, 3> opengl_shader_asset_paths(const std::filesystem::path& executable_path);

class GLApp {
public:
	explicit GLApp(
		std::string executable_path = {},
		GradientTriangleScene scene = kDefaultGradientTriangleScene,
		OpenGLSceneKind scene_kind = OpenGLSceneKind::GradientTriangle);
	~GLApp();

	GLApp(const GLApp&) = delete;
	GLApp& operator=(const GLApp&) = delete;
	GLApp(GLApp&&) noexcept;
	GLApp& operator=(GLApp&&) noexcept;

	[[nodiscard]] std::string startup_summary() const;
	[[nodiscard]] std::string runtime_summary() const;
	void run(std::uint32_t max_frames = 0);

private:
	std::unique_ptr<GLAppImpl> impl_;
	bool initialized_ = false;

	void initialize();
	void cleanup() noexcept;
};

}  // namespace visual_math::opengl