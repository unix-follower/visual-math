#include "visual_math_vulkan/gradient_triangle_scene.hpp"

#include <algorithm>
#include <cmath>

namespace visual_math::vulkan {
namespace {

[[nodiscard]] bool is_channel(float value) {
	return value >= 0.0F && value <= 1.0F;
}

[[nodiscard]] bool is_scale(float value) {
	return value >= 0.4F && value <= 1.2F;
}

[[nodiscard]] bool is_rotation(float value) {
	return value >= -180.0F && value <= 180.0F;
}

[[nodiscard]] bool is_animation_speed(float value) {
	return value >= 0.0F && value <= 180.0F;
}

[[nodiscard]] bool is_material_pulse_speed(float value) {
	return value >= 0.0F && value <= 12.0F;
}

[[nodiscard]] bool is_material_pulse_intensity(float value) {
	return value >= 0.0F && value <= 1.0F;
}

[[nodiscard]] bool is_material_palette_bias(float value) {
	return value >= 0.0F && value <= 1.0F;
}

[[nodiscard]] bool is_material_alpha_floor(float value) {
	return value >= 0.0F && value <= 1.0F;
}

[[nodiscard]] bool is_material_luminance_response(float value) {
	return value >= 0.0F && value <= 1.0F;
}

[[nodiscard]] float clamp(float value) {
	return std::min(1.0F, std::max(0.0F, value));
}

[[nodiscard]] std::array<float, 2> rotate_and_scale(
	float x,
	float y,
	float scale,
	float cosine,
	float sine) {
	const float scaled_x = x * scale;
	const float scaled_y = y * scale;

	return {
		scaled_x * cosine - scaled_y * sine,
		scaled_x * sine + scaled_y * cosine,
	};
}

}  // namespace

bool is_valid_gradient_triangle_scene(const GradientTriangleScene& scene) {
	return is_channel(scene.red) && is_channel(scene.green) && is_channel(scene.blue) &&
		is_channel(scene.alpha) && is_scale(scene.scale) &&
		is_rotation(scene.rotation_degrees) && is_animation_speed(scene.animation_speed) &&
		is_material_pulse_speed(scene.material_pulse_speed) &&
		is_material_pulse_intensity(scene.material_pulse_intensity) &&
		is_material_palette_bias(scene.material_palette_bias) &&
		is_material_alpha_floor(scene.material_alpha_floor) &&
		is_material_luminance_response(scene.material_luminance_response) &&
		is_channel(scene.accent);
}

RgbaColor gradient_triangle_clear_color(const GradientTriangleScene& scene) {
	return {
		.red = scene.red,
		.green = scene.green,
		.blue = scene.blue,
		.alpha = scene.alpha,
	};
}

RgbaColor gradient_triangle_peak_color(const GradientTriangleScene& scene) {
	return {
		.red = clamp(scene.red + scene.accent * 0.42F),
		.green = clamp(scene.green + scene.accent * 0.22F),
		.blue = clamp(scene.blue + scene.accent * 0.10F),
		.alpha = 1.0F,
	};
}

float gradient_triangle_area(const GradientTriangleScene& scene) {
	return 0.66F * scene.scale * scene.scale;
}

std::string gradient_triangle_rotation_label(const GradientTriangleScene& scene) {
	return std::to_string(static_cast<int>(scene.rotation_degrees)) + " deg";
}

SceneTransformUniform build_gradient_triangle_transform(const GradientTriangleScene& scene, float elapsed_seconds) {
	constexpr float radians_per_degree = 3.14159265358979323846F / 180.0F;
	const float animated_rotation = scene.rotation_degrees + scene.animation_speed * elapsed_seconds;
	const float rotation_radians = animated_rotation * radians_per_degree;
	const float cosine = std::cos(rotation_radians) * scene.scale;
	const float sine = std::sin(rotation_radians) * scene.scale;
	const float pulse = 0.5F + 0.5F * std::sin(elapsed_seconds * scene.material_pulse_speed * 3.14159265358979323846F);
	const float pulse_strength = pulse * scene.material_pulse_intensity;
	const float highlight_mix = 0.22F + 0.48F * pulse_strength;
	const float alpha_boost = 0.06F + 0.18F * pulse_strength;

	return {
		.transform = {
			cosine, sine, 0.0F, 0.0F,
			-sine, cosine, 0.0F, 0.0F,
			0.0F, 0.0F, 1.0F, 0.0F,
			0.0F, 0.0F, 0.0F, 1.0F,
		},
		.indexed_material = {
			highlight_mix,
			alpha_boost,
			scene.accent,
			pulse_strength,
		},
		.indexed_material_tuning = {
			scene.material_palette_bias,
			scene.material_alpha_floor,
			scene.material_luminance_response,
			0.0F,
		},
	};
}

std::array<GradientTriangleVertex, 3> build_gradient_triangle_vertices(
	const GradientTriangleScene& scene) {
	const RgbaColor accent_color = gradient_triangle_peak_color(scene);

	return {
		GradientTriangleVertex{
			.x = -0.55F,
			.y = -0.42F,
			.red = accent_color.red,
			.green = scene.green,
			.blue = scene.blue,
			.alpha = 1.0F,
		},
		GradientTriangleVertex{
			.x = 0.58F,
			.y = -0.36F,
			.red = scene.red,
			.green = accent_color.green,
			.blue = scene.blue,
			.alpha = 1.0F,
		},
		GradientTriangleVertex{
			.x = 0.0F,
			.y = 0.64F,
			.red = scene.red,
			.green = scene.green,
			.blue = accent_color.blue,
			.alpha = 1.0F,
		},
	};
}

std::array<GradientTriangleVertex, 4> build_gradient_triangle_indexed_vertices(
	const GradientTriangleScene& scene) {
	const RgbaColor accent_color = gradient_triangle_peak_color(scene);
	return {
		GradientTriangleVertex{.x = -0.42F, .y = 0.0F, .red = accent_color.red, .green = scene.green, .blue = scene.blue, .alpha = 0.92F},
		GradientTriangleVertex{.x = 0.0F, .y = 0.48F, .red = scene.red, .green = accent_color.green, .blue = scene.blue, .alpha = 0.92F},
		GradientTriangleVertex{.x = 0.42F, .y = 0.0F, .red = scene.red, .green = scene.green, .blue = accent_color.blue, .alpha = 0.92F},
		GradientTriangleVertex{.x = 0.0F, .y = -0.48F, .red = accent_color.red, .green = accent_color.green, .blue = accent_color.blue, .alpha = 0.78F},
	};
}

std::array<GradientTriangleVertex, 4> build_gradient_triangle_secondary_indexed_vertices(
	const GradientTriangleScene& scene) {
	const RgbaColor accent_color = gradient_triangle_peak_color(scene);
	return {
		GradientTriangleVertex{.x = -0.66F, .y = 0.28F, .red = scene.red, .green = accent_color.green, .blue = scene.blue, .alpha = 0.72F},
		GradientTriangleVertex{.x = -0.26F, .y = 0.72F, .red = accent_color.red, .green = accent_color.green, .blue = scene.blue, .alpha = 0.84F},
		GradientTriangleVertex{.x = 0.08F, .y = 0.24F, .red = accent_color.red, .green = scene.green, .blue = accent_color.blue, .alpha = 0.74F},
		GradientTriangleVertex{.x = -0.3F, .y = -0.14F, .red = scene.red, .green = scene.green, .blue = accent_color.blue, .alpha = 0.66F},
	};
}

std::array<std::uint16_t, 6> build_gradient_triangle_indices(const GradientTriangleScene&) {
	return {0, 1, 2, 0, 2, 3};
}

std::array<GradientTriangleVertex, 5> build_gradient_triangle_outline_vertices(
	const GradientTriangleScene& scene) {
	const RgbaColor accent_color = gradient_triangle_peak_color(scene);
	return {
		GradientTriangleVertex{.x = -0.74F, .y = 0.0F, .red = accent_color.red, .green = accent_color.green, .blue = accent_color.blue, .alpha = 1.0F},
		GradientTriangleVertex{.x = 0.0F, .y = 0.82F, .red = accent_color.red, .green = accent_color.green, .blue = accent_color.blue, .alpha = 1.0F},
		GradientTriangleVertex{.x = 0.74F, .y = 0.0F, .red = accent_color.red, .green = accent_color.green, .blue = accent_color.blue, .alpha = 1.0F},
		GradientTriangleVertex{.x = 0.0F, .y = -0.82F, .red = accent_color.red, .green = accent_color.green, .blue = accent_color.blue, .alpha = 1.0F},
		GradientTriangleVertex{.x = -0.74F, .y = 0.0F, .red = accent_color.red, .green = accent_color.green, .blue = accent_color.blue, .alpha = 1.0F},
	};
}

}  // namespace visual_math::vulkan