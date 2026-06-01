#include "visual_math_vulkan/launch_options.hpp"

#include <charconv>
#include <exception>

namespace visual_math::vulkan {
namespace {

[[nodiscard]] bool parse_float_value(std::string_view text, float& value) {
	try {
		std::size_t parsed_size = 0;
		value = std::stof(std::string(text), &parsed_size);
		return parsed_size == text.size();
	} catch (const std::exception&) {
		return false;
	}
}

[[nodiscard]] bool parse_uint_value(std::string_view text, std::uint32_t& value) {
	const char* begin = text.data();
	const char* end = begin + text.size();
	auto [ptr, error] = std::from_chars(begin, end, value);
	return error == std::errc{} && ptr == end;
}

}  // namespace

bool parse_vulkan_launch_options(
	std::span<const std::string_view> arguments,
	VulkanLaunchOptions& options,
	std::string& error_message) {
	options = VulkanLaunchOptions{};
	error_message.clear();

	for (const std::string_view argument : arguments) {
		if (const auto value = argument.substr(argument.find('=') + 1); argument.starts_with("--frames=")) {
			if (!parse_uint_value(value, options.max_frames)) {
				error_message = "Invalid value for --frames.";
				return false;
			}
			continue;
		}
		if (const auto value = argument.substr(argument.find('=') + 1); argument.starts_with("--scene-scale=")) {
			if (!parse_float_value(value, options.scene.scale)) {
				error_message = "Invalid value for --scene-scale.";
				return false;
			}
			continue;
		}
		if (const auto value = argument.substr(argument.find('=') + 1); argument.starts_with("--scene-rotation=")) {
			if (!parse_float_value(value, options.scene.rotation_degrees)) {
				error_message = "Invalid value for --scene-rotation.";
				return false;
			}
			continue;
		}
		if (const auto value = argument.substr(argument.find('=') + 1); argument.starts_with("--animation-speed=")) {
			if (!parse_float_value(value, options.scene.animation_speed)) {
				error_message = "Invalid value for --animation-speed.";
				return false;
			}
			continue;
		}
		if (const auto value = argument.substr(argument.find('=') + 1); argument.starts_with("--material-pulse-speed=")) {
			if (!parse_float_value(value, options.scene.material_pulse_speed)) {
				error_message = "Invalid value for --material-pulse-speed.";
				return false;
			}
			continue;
		}
		if (const auto value = argument.substr(argument.find('=') + 1); argument.starts_with("--material-pulse-intensity=")) {
			if (!parse_float_value(value, options.scene.material_pulse_intensity)) {
				error_message = "Invalid value for --material-pulse-intensity.";
				return false;
			}
			continue;
		}
		if (const auto value = argument.substr(argument.find('=') + 1); argument.starts_with("--material-palette-bias=")) {
			if (!parse_float_value(value, options.scene.material_palette_bias)) {
				error_message = "Invalid value for --material-palette-bias.";
				return false;
			}
			continue;
		}
		if (const auto value = argument.substr(argument.find('=') + 1); argument.starts_with("--material-alpha-floor=")) {
			if (!parse_float_value(value, options.scene.material_alpha_floor)) {
				error_message = "Invalid value for --material-alpha-floor.";
				return false;
			}
			continue;
		}
		if (const auto value = argument.substr(argument.find('=') + 1); argument.starts_with("--material-luminance-response=")) {
			if (!parse_float_value(value, options.scene.material_luminance_response)) {
				error_message = "Invalid value for --material-luminance-response.";
				return false;
			}
			continue;
		}
		if (const auto value = argument.substr(argument.find('=') + 1); argument.starts_with("--scene-accent=")) {
			if (!parse_float_value(value, options.scene.accent)) {
				error_message = "Invalid value for --scene-accent.";
				return false;
			}
			continue;
		}
		if (const auto value = argument.substr(argument.find('=') + 1); argument.starts_with("--clear-red=")) {
			if (!parse_float_value(value, options.scene.red)) {
				error_message = "Invalid value for --clear-red.";
				return false;
			}
			continue;
		}
		if (const auto value = argument.substr(argument.find('=') + 1); argument.starts_with("--clear-green=")) {
			if (!parse_float_value(value, options.scene.green)) {
				error_message = "Invalid value for --clear-green.";
				return false;
			}
			continue;
		}
		if (const auto value = argument.substr(argument.find('=') + 1); argument.starts_with("--clear-blue=")) {
			if (!parse_float_value(value, options.scene.blue)) {
				error_message = "Invalid value for --clear-blue.";
				return false;
			}
			continue;
		}
		if (const auto value = argument.substr(argument.find('=') + 1); argument.starts_with("--clear-alpha=")) {
			if (!parse_float_value(value, options.scene.alpha)) {
				error_message = "Invalid value for --clear-alpha.";
				return false;
			}
			continue;
		}

		error_message = "Unknown argument: " + std::string(argument);
		return false;
	}

	if (!is_valid_gradient_triangle_scene(options.scene)) {
		error_message = "Scene arguments produced an invalid gradient triangle scene.";
		return false;
	}

	return true;
}

}  // namespace visual_math::vulkan