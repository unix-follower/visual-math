#pragma once

#include "visual_math_vulkan/gradient_triangle_scene.hpp"

#include <cstdint>
#include <span>
#include <string>
#include <string_view>

namespace visual_math::vulkan {

struct VulkanLaunchOptions {
	std::uint32_t max_frames = 0;
	GradientTriangleScene scene = kDefaultGradientTriangleScene;
};

[[nodiscard]] bool parse_vulkan_launch_options(
	std::span<const std::string_view> arguments,
	VulkanLaunchOptions& options,
	std::string& error_message);

}  // namespace visual_math::vulkan