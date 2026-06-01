#pragma once

#include "visual_math_opengl/gradient_triangle_scene.hpp"

#include <cstdint>
#include <span>
#include <string>
#include <string_view>

namespace visual_math::opengl {

struct OpenGLLaunchOptions {
	std::uint32_t max_frames = 0;
	GradientTriangleScene scene = kDefaultGradientTriangleScene;
	OpenGLSceneKind scene_kind = OpenGLSceneKind::GradientTriangle;
};

[[nodiscard]] bool parse_opengl_launch_options(
	std::span<const std::string_view> arguments,
	OpenGLLaunchOptions& options,
	std::string& error_message);

}  // namespace visual_math::opengl