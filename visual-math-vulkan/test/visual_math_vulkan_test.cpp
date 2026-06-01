#include "visual_math_vulkan/gradient_triangle_scene.hpp"
#include "visual_math_vulkan/launch_options.hpp"
#include "visual_math_vulkan/vulkan_app.hpp"

#include <gtest/gtest.h>

#include <array>
#include <string>
#include <string_view>

namespace visual_math::vulkan {
namespace {

TEST(GradientTriangleSceneTest, AcceptsDefaultScene) {
	EXPECT_TRUE(is_valid_gradient_triangle_scene(kDefaultGradientTriangleScene));
}

TEST(GradientTriangleSceneTest, RejectsOutOfRangeValues) {
	GradientTriangleScene scene = kDefaultGradientTriangleScene;
	scene.material_luminance_response = 1.4F;
	EXPECT_FALSE(is_valid_gradient_triangle_scene(scene));
}

TEST(GradientTriangleSceneTest, BuildsExpectedPeakColor) {
	const RgbaColor peak = gradient_triangle_peak_color(kDefaultGradientTriangleScene);
	EXPECT_NEAR(peak.red, 0.4076F, 0.0001F);
	EXPECT_NEAR(peak.green, 0.2916F, 0.0001F);
	EXPECT_NEAR(peak.blue, 0.2580F, 0.0001F);
	EXPECT_FLOAT_EQ(peak.alpha, 1.0F);
}

TEST(GradientTriangleSceneTest, BuildsUniformTransformMatrix) {
	GradientTriangleScene scene = kDefaultGradientTriangleScene;
	scene.scale = 1.0F;
	scene.rotation_degrees = 90.0F;
	scene.animation_speed = 0.0F;
	scene.material_pulse_speed = 0.0F;

	const SceneTransformUniform transform = build_gradient_triangle_transform(scene);

	EXPECT_NEAR(transform.transform[0], 0.0F, 0.0001F);
	EXPECT_NEAR(transform.transform[1], 1.0F, 0.0001F);
	EXPECT_NEAR(transform.transform[4], -1.0F, 0.0001F);
	EXPECT_NEAR(transform.transform[5], 0.0F, 0.0001F);
	EXPECT_FLOAT_EQ(transform.transform[15], 1.0F);
	EXPECT_NEAR(transform.indexed_material[0], 0.46F, 0.0001F);
	EXPECT_NEAR(transform.indexed_material[1], 0.15F, 0.0001F);
	EXPECT_NEAR(transform.indexed_material[2], scene.accent, 0.0001F);
	EXPECT_NEAR(transform.indexed_material[3], 0.5F, 0.0001F);
	EXPECT_NEAR(transform.indexed_material_tuning[0], scene.material_palette_bias, 0.0001F);
	EXPECT_NEAR(transform.indexed_material_tuning[1], scene.material_alpha_floor, 0.0001F);
	EXPECT_NEAR(transform.indexed_material_tuning[2], scene.material_luminance_response, 0.0001F);
}

TEST(GradientTriangleSceneTest, BuildsAnimatedUniformTransformMatrix) {
	GradientTriangleScene scene = kDefaultGradientTriangleScene;
	scene.scale = 1.0F;
	scene.rotation_degrees = 0.0F;
	scene.animation_speed = 90.0F;
	scene.material_pulse_speed = 0.5F;
	scene.material_pulse_intensity = 0.25F;

	const SceneTransformUniform transform = build_gradient_triangle_transform(scene, 1.0F);

	EXPECT_NEAR(transform.transform[0], 0.0F, 0.0001F);
	EXPECT_NEAR(transform.transform[1], 1.0F, 0.0001F);
	EXPECT_NEAR(transform.transform[4], -1.0F, 0.0001F);
	EXPECT_NEAR(transform.transform[5], 0.0F, 0.0001F);
	EXPECT_NEAR(transform.indexed_material[0], 0.34F, 0.0001F);
	EXPECT_NEAR(transform.indexed_material[1], 0.105F, 0.0001F);
	EXPECT_NEAR(transform.indexed_material[3], 0.25F, 0.0001F);
	EXPECT_NEAR(transform.indexed_material_tuning[0], scene.material_palette_bias, 0.0001F);
	EXPECT_NEAR(transform.indexed_material_tuning[1], scene.material_alpha_floor, 0.0001F);
	EXPECT_NEAR(transform.indexed_material_tuning[2], scene.material_luminance_response, 0.0001F);
}

TEST(GradientTriangleSceneTest, BuildsCanonicalVerticesAndOutline) {
	const auto vertices = build_gradient_triangle_vertices(kDefaultGradientTriangleScene);
	const auto indexed_vertices = build_gradient_triangle_indexed_vertices(kDefaultGradientTriangleScene);
	const auto secondary_indexed_vertices = build_gradient_triangle_secondary_indexed_vertices(kDefaultGradientTriangleScene);
	const auto indices = build_gradient_triangle_indices(kDefaultGradientTriangleScene);
	const auto outline = build_gradient_triangle_outline_vertices(kDefaultGradientTriangleScene);

	EXPECT_NEAR(vertices[0].x, -0.55F, 0.0001F);
	EXPECT_NEAR(vertices[0].y, -0.42F, 0.0001F);
	EXPECT_NEAR(vertices[2].x, 0.0F, 0.0001F);
	EXPECT_NEAR(vertices[2].y, 0.64F, 0.0001F);
	EXPECT_EQ(indexed_vertices.size(), 4U);
	EXPECT_EQ(secondary_indexed_vertices.size(), 4U);
	EXPECT_EQ(indices.size(), 6U);
	EXPECT_EQ(indices[0], 0U);
	EXPECT_EQ(indices[5], 3U);
	EXPECT_NEAR(indexed_vertices[1].y, 0.48F, 0.0001F);
	EXPECT_NEAR(secondary_indexed_vertices[0].x, -0.66F, 0.0001F);
	EXPECT_NEAR(secondary_indexed_vertices[1].y, 0.72F, 0.0001F);
	EXPECT_NEAR(outline.front().x, outline.back().x, 0.0001F);
	EXPECT_NEAR(outline.front().y, outline.back().y, 0.0001F);
}

TEST(VulkanAppTest, DescribesTheCurrentBootstrapStage) {
	const std::string summary = VulkanApp{}.startup_summary();
	EXPECT_NE(summary.find("Phase 7 Vulkan foundation is active"), std::string::npos);
	EXPECT_NE(summary.find("swapchain"), std::string::npos);
	EXPECT_NE(summary.find("SPIR-V shaders"), std::string::npos);
	EXPECT_NE(summary.find("validation layers"), std::string::npos);
	EXPECT_NE(summary.find("two indexed polygon overlays"), std::string::npos);
}

TEST(VulkanAppTest, ReportsRuntimeStatsAvailabilityBeforeRun) {
	const std::string summary = VulkanApp{}.runtime_summary();
	EXPECT_NE(summary.find("not available"), std::string::npos);
}

TEST(VulkanLaunchOptionsTest, ParsesFrameLimitAndSceneOverrides) {
	const std::array arguments{
		std::string_view{"--frames=3"},
		std::string_view{"--scene-scale=1.1"},
		std::string_view{"--scene-rotation=45"},
		std::string_view{"--animation-speed=30"},
		std::string_view{"--material-pulse-speed=2.5"},
		std::string_view{"--material-pulse-intensity=0.4"},
		std::string_view{"--material-palette-bias=0.65"},
		std::string_view{"--material-alpha-floor=0.78"},
		std::string_view{"--material-luminance-response=0.3"},
		std::string_view{"--scene-accent=0.5"},
		std::string_view{"--clear-blue=0.25"},
	};
	VulkanLaunchOptions options;
	std::string error_message;

	EXPECT_TRUE(parse_vulkan_launch_options(arguments, options, error_message));
	EXPECT_TRUE(error_message.empty());
	EXPECT_EQ(options.max_frames, 3U);
	EXPECT_FLOAT_EQ(options.scene.scale, 1.1F);
	EXPECT_FLOAT_EQ(options.scene.rotation_degrees, 45.0F);
	EXPECT_FLOAT_EQ(options.scene.animation_speed, 30.0F);
	EXPECT_FLOAT_EQ(options.scene.material_pulse_speed, 2.5F);
	EXPECT_FLOAT_EQ(options.scene.material_pulse_intensity, 0.4F);
	EXPECT_FLOAT_EQ(options.scene.material_palette_bias, 0.65F);
	EXPECT_FLOAT_EQ(options.scene.material_alpha_floor, 0.78F);
	EXPECT_FLOAT_EQ(options.scene.material_luminance_response, 0.3F);
	EXPECT_FLOAT_EQ(options.scene.accent, 0.5F);
	EXPECT_FLOAT_EQ(options.scene.blue, 0.25F);
}

TEST(VulkanLaunchOptionsTest, RejectsInvalidSceneOverrides) {
	const std::array arguments{std::string_view{"--scene-scale=9.0"}};
	VulkanLaunchOptions options;
	std::string error_message;

	EXPECT_FALSE(parse_vulkan_launch_options(arguments, options, error_message));
	EXPECT_NE(error_message.find("invalid gradient triangle scene"), std::string::npos);
}

TEST(VulkanAppTest, IncludesConfiguredSceneStateInSummary) {
	GradientTriangleScene scene = kDefaultGradientTriangleScene;
	scene.scale = 1.0F;
	scene.rotation_degrees = 45.0F;
	scene.animation_speed = 12.0F;
	scene.material_pulse_speed = 2.0F;
	scene.material_pulse_intensity = 0.4F;
	scene.material_palette_bias = 0.65F;
	scene.material_alpha_floor = 0.78F;
	scene.material_luminance_response = 0.3F;

	const std::string summary = VulkanApp({}, scene).startup_summary();
	EXPECT_NE(summary.find("Active scene scale 1"), std::string::npos);
	EXPECT_NE(summary.find("rotation 45 deg"), std::string::npos);
	EXPECT_NE(summary.find("animation speed 12"), std::string::npos);
	EXPECT_NE(summary.find("material pulse speed 2"), std::string::npos);
	EXPECT_NE(summary.find("material pulse intensity 0.4"), std::string::npos);
	EXPECT_NE(summary.find("material palette bias 0.65"), std::string::npos);
	EXPECT_NE(summary.find("material alpha floor 0.78"), std::string::npos);
	EXPECT_NE(summary.find("material luminance response 0.3"), std::string::npos);
}

}  // namespace
}  // namespace visual_math::vulkan
