#pragma once

#include "visual_math_vulkan/gradient_triangle_scene.hpp"

#include <cstdint>
#include <memory>
#include <string>

namespace visual_math::vulkan {

struct VulkanAppImpl;

class VulkanApp {
public:
	explicit VulkanApp(
		std::string executable_path = {},
		GradientTriangleScene scene = kDefaultGradientTriangleScene);
	~VulkanApp();

	VulkanApp(const VulkanApp&) = delete;
	VulkanApp& operator=(const VulkanApp&) = delete;
	VulkanApp(VulkanApp&&) noexcept;
	VulkanApp& operator=(VulkanApp&&) noexcept;

	[[nodiscard]] std::string startup_summary() const;
	[[nodiscard]] std::string runtime_summary() const;
	void run(std::uint32_t max_frames = 0);

private:
	std::unique_ptr<VulkanAppImpl> impl_;
	bool initialized_ = false;

	void initialize();
	void cleanup() noexcept;
};

}  // namespace visual_math::vulkan