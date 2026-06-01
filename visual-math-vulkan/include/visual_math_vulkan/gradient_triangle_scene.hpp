#pragma once

#include <array>
#include <cstdint>
#include <string>

namespace visual_math::vulkan {

struct RgbaColor {
	float red;
	float green;
	float blue;
	float alpha;
};

struct GradientTriangleScene {
	float red;
	float green;
	float blue;
	float alpha;
	float scale;
	float rotation_degrees;
	float animation_speed;
	float material_pulse_speed;
	float material_pulse_intensity;
	float material_palette_bias;
	float material_alpha_floor;
	float material_luminance_response;
	float accent;
};

struct GradientTriangleVertex {
	float x;
	float y;
	float red;
	float green;
	float blue;
	float alpha;
};

struct alignas(16) SceneTransformUniform {
	std::array<float, 16> transform;
	std::array<float, 4> indexed_material;
	std::array<float, 4> indexed_material_tuning;
};

inline constexpr GradientTriangleScene kDefaultGradientTriangleScene{
	.red = 0.08F,
	.green = 0.12F,
	.blue = 0.18F,
	.alpha = 1.0F,
	.scale = 0.86F,
	.rotation_degrees = 0.0F,
	.animation_speed = 24.0F,
	.material_pulse_speed = 1.5F,
	.material_pulse_intensity = 1.0F,
	.material_palette_bias = 0.35F,
	.material_alpha_floor = 0.72F,
	.material_luminance_response = 0.12F,
	.accent = 0.78F,
};

[[nodiscard]] bool is_valid_gradient_triangle_scene(const GradientTriangleScene& scene);
[[nodiscard]] RgbaColor gradient_triangle_clear_color(const GradientTriangleScene& scene);
[[nodiscard]] RgbaColor gradient_triangle_peak_color(const GradientTriangleScene& scene);
[[nodiscard]] float gradient_triangle_area(const GradientTriangleScene& scene);
[[nodiscard]] std::string gradient_triangle_rotation_label(const GradientTriangleScene& scene);
[[nodiscard]] SceneTransformUniform build_gradient_triangle_transform(
	const GradientTriangleScene& scene,
	float elapsed_seconds = 0.0F);
[[nodiscard]] std::array<GradientTriangleVertex, 3> build_gradient_triangle_vertices(
	const GradientTriangleScene& scene);
[[nodiscard]] std::array<GradientTriangleVertex, 4> build_gradient_triangle_indexed_vertices(
	const GradientTriangleScene& scene);
[[nodiscard]] std::array<GradientTriangleVertex, 4> build_gradient_triangle_secondary_indexed_vertices(
	const GradientTriangleScene& scene);
[[nodiscard]] std::array<std::uint16_t, 6> build_gradient_triangle_indices(
	const GradientTriangleScene& scene);
[[nodiscard]] std::array<GradientTriangleVertex, 5> build_gradient_triangle_outline_vertices(
	const GradientTriangleScene& scene);

}  // namespace visual_math::vulkan