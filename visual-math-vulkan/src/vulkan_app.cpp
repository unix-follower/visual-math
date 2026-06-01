#include "visual_math_vulkan/vulkan_app.hpp"

#include "visual_math_vulkan/gradient_triangle_scene.hpp"

#define GLFW_INCLUDE_VULKAN
#include <GLFW/glfw3.h>

#include <algorithm>
#include <array>
#include <cctype>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <limits>
#include <iomanip>
#include <memory>
#include <optional>
#include <sstream>
#include <stdexcept>
#include <string_view>
#include <chrono>
#include <utility>
#include <vector>

namespace visual_math::vulkan {

struct VulkanAppImpl {
	GLFWwindow* window = nullptr;
	VkInstance instance = VK_NULL_HANDLE;
	VkSurfaceKHR surface = VK_NULL_HANDLE;
	VkPhysicalDevice physical_device = VK_NULL_HANDLE;
	VkDevice device = VK_NULL_HANDLE;
	VkQueue graphics_queue = VK_NULL_HANDLE;
	VkQueue present_queue = VK_NULL_HANDLE;
	VkDebugUtilsMessengerEXT debug_messenger = VK_NULL_HANDLE;
	VkSwapchainKHR swapchain = VK_NULL_HANDLE;
	std::vector<VkImage> swapchain_images;
	VkFormat swapchain_image_format = VK_FORMAT_UNDEFINED;
	VkExtent2D swapchain_extent{};
	std::vector<VkImageView> swapchain_image_views;
	VkRenderPass render_pass = VK_NULL_HANDLE;
	VkDescriptorSetLayout descriptor_set_layout = VK_NULL_HANDLE;
	VkDescriptorPool descriptor_pool = VK_NULL_HANDLE;
	VkDescriptorSet descriptor_set = VK_NULL_HANDLE;
	VkPipelineLayout pipeline_layout = VK_NULL_HANDLE;
	VkPipeline graphics_pipeline = VK_NULL_HANDLE;
	VkPipeline indexed_pipeline = VK_NULL_HANDLE;
	VkPipeline outline_pipeline = VK_NULL_HANDLE;
	std::vector<VkFramebuffer> framebuffers;
	VkCommandPool command_pool = VK_NULL_HANDLE;
	VkBuffer triangle_vertex_buffer = VK_NULL_HANDLE;
	VkDeviceMemory triangle_vertex_buffer_memory = VK_NULL_HANDLE;
	VkBuffer indexed_vertex_buffer = VK_NULL_HANDLE;
	VkDeviceMemory indexed_vertex_buffer_memory = VK_NULL_HANDLE;
	VkBuffer index_buffer = VK_NULL_HANDLE;
	VkDeviceMemory index_buffer_memory = VK_NULL_HANDLE;
	VkBuffer outline_vertex_buffer = VK_NULL_HANDLE;
	VkDeviceMemory outline_vertex_buffer_memory = VK_NULL_HANDLE;
	VkBuffer uniform_buffer = VK_NULL_HANDLE;
	VkDeviceMemory uniform_buffer_memory = VK_NULL_HANDLE;
	std::vector<VkCommandBuffer> command_buffers;
	VkSemaphore image_available_semaphore = VK_NULL_HANDLE;
	VkSemaphore render_finished_semaphore = VK_NULL_HANDLE;
	VkFence in_flight_fence = VK_NULL_HANDLE;
	GradientTriangleScene scene = kDefaultGradientTriangleScene;
	std::filesystem::path executable_path;
	std::filesystem::path shader_directory;
	bool glfw_initialized = false;
	bool framebuffer_resized = false;
	bool validation_requested = false;
	bool validation_enabled = false;
	std::string validation_status = "disabled";
	std::optional<std::uint32_t> graphics_family;
	std::optional<std::uint32_t> present_family;
	std::uint32_t last_rendered_frames = 0;
	double last_run_seconds = 0.0;
	bool has_runtime_stats = false;
};

namespace {

constexpr std::uint32_t kWindowWidth = 960;
constexpr std::uint32_t kWindowHeight = 720;
constexpr std::string_view kValidationToggleEnv = "VISUAL_MATH_VULKAN_VALIDATION";
constexpr std::array<const char*, 1> kValidationLayers{"VK_LAYER_KHRONOS_validation"};

#ifndef VK_KHR_PORTABILITY_SUBSET_EXTENSION_NAME
constexpr char kPortabilitySubsetExtensionName[] = "VK_KHR_portability_subset";
#else
constexpr const char* kPortabilitySubsetExtensionName = VK_KHR_PORTABILITY_SUBSET_EXTENSION_NAME;
#endif

#ifndef VK_EXT_DEBUG_UTILS_EXTENSION_NAME
constexpr char kDebugUtilsExtensionName[] = "VK_EXT_debug_utils";
#else
constexpr const char* kDebugUtilsExtensionName = VK_EXT_DEBUG_UTILS_EXTENSION_NAME;
#endif

struct QueueFamilyIndices {
	std::optional<std::uint32_t> graphics_family;
	std::optional<std::uint32_t> present_family;

	[[nodiscard]] bool is_complete() const {
		return graphics_family.has_value() && present_family.has_value();
	}
};

struct SwapchainSupportDetails {
	VkSurfaceCapabilitiesKHR capabilities{};
	std::vector<VkSurfaceFormatKHR> formats;
	std::vector<VkPresentModeKHR> present_modes;
};

struct VertexBindingDescription {
	VkVertexInputBindingDescription binding;
	std::array<VkVertexInputAttributeDescription, 2> attributes;
};

[[nodiscard]] bool env_flag_enabled(std::string_view name) {
	const char* raw_value = std::getenv(name.data());
	if (raw_value == nullptr) {
#ifdef NDEBUG
		return false;
#else
		return true;
#endif
	}

	std::string value(raw_value);
	std::ranges::transform(value, value.begin(), [](unsigned char ch) {
		return static_cast<char>(std::tolower(ch));
	});
	return value == "1" || value == "true" || value == "on" || value == "yes";
}

VKAPI_ATTR VkBool32 VKAPI_CALL debug_callback(
	VkDebugUtilsMessageSeverityFlagBitsEXT,
	VkDebugUtilsMessageTypeFlagsEXT,
	const VkDebugUtilsMessengerCallbackDataEXT* callback_data,
	void*) {
	std::cerr << "[Vulkan validation] " << callback_data->pMessage << '\n';
	return VK_FALSE;
}

[[nodiscard]] bool validation_layers_supported() {
	std::uint32_t layer_count = 0;
	vkEnumerateInstanceLayerProperties(&layer_count, nullptr);
	std::vector<VkLayerProperties> layers(layer_count);
	vkEnumerateInstanceLayerProperties(&layer_count, layers.data());
	const auto match = std::ranges::find_if(layers, [](const VkLayerProperties& property) {
		return std::string_view(property.layerName) == kValidationLayers.front();
	});
	return match != layers.end();
}

VkDebugUtilsMessengerCreateInfoEXT debug_messenger_create_info() {
	VkDebugUtilsMessengerCreateInfoEXT info{};
	info.sType = VK_STRUCTURE_TYPE_DEBUG_UTILS_MESSENGER_CREATE_INFO_EXT;
	info.messageSeverity = VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT |
		VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT;
	info.messageType = VK_DEBUG_UTILS_MESSAGE_TYPE_GENERAL_BIT_EXT |
		VK_DEBUG_UTILS_MESSAGE_TYPE_VALIDATION_BIT_EXT |
		VK_DEBUG_UTILS_MESSAGE_TYPE_PERFORMANCE_BIT_EXT;
	info.pfnUserCallback = debug_callback;
	return info;
}

VkResult create_debug_messenger(
	VkInstance instance,
	const VkDebugUtilsMessengerCreateInfoEXT* create_info,
	VkDebugUtilsMessengerEXT* debug_messenger) {
	const auto function = reinterpret_cast<PFN_vkCreateDebugUtilsMessengerEXT>(
		vkGetInstanceProcAddr(instance, "vkCreateDebugUtilsMessengerEXT"));
	if (function == nullptr) {
		return VK_ERROR_EXTENSION_NOT_PRESENT;
	}
	return function(instance, create_info, nullptr, debug_messenger);
}

void destroy_debug_messenger(VkInstance instance, VkDebugUtilsMessengerEXT debug_messenger) {
	const auto function = reinterpret_cast<PFN_vkDestroyDebugUtilsMessengerEXT>(
		vkGetInstanceProcAddr(instance, "vkDestroyDebugUtilsMessengerEXT"));
	if (function != nullptr) {
		function(instance, debug_messenger, nullptr);
	}
}

std::vector<char> read_binary_file(const std::filesystem::path& path) {
	std::ifstream file(path, std::ios::ate | std::ios::binary);
	if (!file.is_open()) {
		throw std::runtime_error("Unable to open shader file: " + path.string());
	}

	const auto file_size = static_cast<std::size_t>(file.tellg());
	std::vector<char> buffer(file_size);
	file.seekg(0);
	file.read(buffer.data(), static_cast<std::streamsize>(file_size));
	return buffer;
}

std::filesystem::path resolve_shader_directory(const std::filesystem::path& executable_path) {
	if (executable_path.empty()) {
		return std::filesystem::current_path() / "build" / "shaders";
	}
	return executable_path.parent_path() / "shaders";
}

std::vector<const char*> required_instance_extensions(bool validation_enabled) {
	std::uint32_t glfw_extension_count = 0;
	const char** glfw_extensions = glfwGetRequiredInstanceExtensions(&glfw_extension_count);
	if (glfw_extensions == nullptr) {
		throw std::runtime_error("GLFW did not report Vulkan instance extensions.");
	}

	std::vector<const char*> extensions(glfw_extensions, glfw_extensions + glfw_extension_count);
	if (std::ranges::find(extensions, VK_KHR_PORTABILITY_ENUMERATION_EXTENSION_NAME) == extensions.end()) {
		extensions.push_back(VK_KHR_PORTABILITY_ENUMERATION_EXTENSION_NAME);
	}
	if (validation_enabled && std::ranges::find(extensions, kDebugUtilsExtensionName) == extensions.end()) {
		extensions.push_back(kDebugUtilsExtensionName);
	}
	return extensions;
}

void framebuffer_resize_callback(GLFWwindow* window, int, int) {
	auto* app = static_cast<VulkanAppImpl*>(glfwGetWindowUserPointer(window));
	if (app != nullptr) {
		app->framebuffer_resized = true;
	}
}

QueueFamilyIndices find_queue_families(VkPhysicalDevice device, VkSurfaceKHR surface) {
	QueueFamilyIndices indices;
	std::uint32_t family_count = 0;
	vkGetPhysicalDeviceQueueFamilyProperties(device, &family_count, nullptr);
	std::vector<VkQueueFamilyProperties> queue_families(family_count);
	vkGetPhysicalDeviceQueueFamilyProperties(device, &family_count, queue_families.data());

	for (std::uint32_t index = 0; index < family_count; ++index) {
		if ((queue_families[index].queueFlags & VK_QUEUE_GRAPHICS_BIT) != 0) {
			indices.graphics_family = index;
		}

		VkBool32 present_support = VK_FALSE;
		vkGetPhysicalDeviceSurfaceSupportKHR(device, index, surface, &present_support);
		if (present_support == VK_TRUE) {
			indices.present_family = index;
		}

		if (indices.is_complete()) {
			break;
		}
	}

	return indices;
}

SwapchainSupportDetails query_swapchain_support(VkPhysicalDevice device, VkSurfaceKHR surface) {
	SwapchainSupportDetails details;
	vkGetPhysicalDeviceSurfaceCapabilitiesKHR(device, surface, &details.capabilities);

	std::uint32_t format_count = 0;
	vkGetPhysicalDeviceSurfaceFormatsKHR(device, surface, &format_count, nullptr);
	if (format_count > 0) {
		details.formats.resize(format_count);
		vkGetPhysicalDeviceSurfaceFormatsKHR(device, surface, &format_count, details.formats.data());
	}

	std::uint32_t present_mode_count = 0;
	vkGetPhysicalDeviceSurfacePresentModesKHR(device, surface, &present_mode_count, nullptr);
	if (present_mode_count > 0) {
		details.present_modes.resize(present_mode_count);
		vkGetPhysicalDeviceSurfacePresentModesKHR(device, surface, &present_mode_count, details.present_modes.data());
	}

	return details;
}

bool device_supports_required_extensions(VkPhysicalDevice device) {
	constexpr std::array required_extensions{VK_KHR_SWAPCHAIN_EXTENSION_NAME, kPortabilitySubsetExtensionName};
	std::uint32_t extension_count = 0;
	vkEnumerateDeviceExtensionProperties(device, nullptr, &extension_count, nullptr);
	std::vector<VkExtensionProperties> extensions(extension_count);
	vkEnumerateDeviceExtensionProperties(device, nullptr, &extension_count, extensions.data());

	for (const char* extension_name : required_extensions) {
		const auto match = std::ranges::find_if(extensions, [extension_name](const VkExtensionProperties& property) {
			return std::string_view(property.extensionName) == extension_name;
		});
		if (match == extensions.end()) {
			return false;
		}
	}

	return true;
}

bool device_supports_swapchain(VkPhysicalDevice device, VkSurfaceKHR surface) {
	const auto support = query_swapchain_support(device, surface);
	return !support.formats.empty() && !support.present_modes.empty();
}

bool is_suitable_device(VkPhysicalDevice device, VkSurfaceKHR surface) {
	const QueueFamilyIndices indices = find_queue_families(device, surface);
	return indices.is_complete() && device_supports_required_extensions(device) && device_supports_swapchain(device, surface);
}

VkSurfaceFormatKHR choose_surface_format(const std::vector<VkSurfaceFormatKHR>& formats) {
	const auto preferred = std::ranges::find_if(formats, [](const VkSurfaceFormatKHR& format) {
		return format.format == VK_FORMAT_B8G8R8A8_SRGB && format.colorSpace == VK_COLOR_SPACE_SRGB_NONLINEAR_KHR;
	});
	return preferred != formats.end() ? *preferred : formats.front();
}

VkPresentModeKHR choose_present_mode(const std::vector<VkPresentModeKHR>& present_modes) {
	const auto preferred = std::ranges::find(present_modes, VK_PRESENT_MODE_MAILBOX_KHR);
	return preferred != present_modes.end() ? *preferred : VK_PRESENT_MODE_FIFO_KHR;
}

VkExtent2D choose_swap_extent(GLFWwindow* window, const VkSurfaceCapabilitiesKHR& capabilities) {
	if (capabilities.currentExtent.width != std::numeric_limits<std::uint32_t>::max()) {
		return capabilities.currentExtent;
	}

	int width = 0;
	int height = 0;
	glfwGetFramebufferSize(window, &width, &height);
	return {
		.width = std::clamp(static_cast<std::uint32_t>(width), capabilities.minImageExtent.width, capabilities.maxImageExtent.width),
		.height = std::clamp(static_cast<std::uint32_t>(height), capabilities.minImageExtent.height, capabilities.maxImageExtent.height),
	};
}

VkShaderModule create_shader_module(VkDevice device, const std::vector<char>& code) {
	const VkShaderModuleCreateInfo create_info{
		.sType = VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO,
		.codeSize = code.size(),
		.pCode = reinterpret_cast<const std::uint32_t*>(code.data()),
	};

	VkShaderModule shader_module = VK_NULL_HANDLE;
	if (vkCreateShaderModule(device, &create_info, nullptr, &shader_module) != VK_SUCCESS) {
		throw std::runtime_error("Failed to create shader module.");
	}
	return shader_module;
}

VertexBindingDescription vertex_description() {
	VertexBindingDescription description{};
	description.binding.binding = 0;
	description.binding.stride = sizeof(GradientTriangleVertex);
	description.binding.inputRate = VK_VERTEX_INPUT_RATE_VERTEX;
	description.attributes[0].binding = 0;
	description.attributes[0].location = 0;
	description.attributes[0].format = VK_FORMAT_R32G32_SFLOAT;
	description.attributes[0].offset = offsetof(GradientTriangleVertex, x);
	description.attributes[1].binding = 0;
	description.attributes[1].location = 1;
	description.attributes[1].format = VK_FORMAT_R32G32B32A32_SFLOAT;
	description.attributes[1].offset = offsetof(GradientTriangleVertex, red);
	return description;
}

std::uint32_t find_memory_type(VkPhysicalDevice physical_device, std::uint32_t type_filter, VkMemoryPropertyFlags properties) {
	VkPhysicalDeviceMemoryProperties memory_properties{};
	vkGetPhysicalDeviceMemoryProperties(physical_device, &memory_properties);
	for (std::uint32_t index = 0; index < memory_properties.memoryTypeCount; ++index) {
		if (((type_filter & (1U << index)) != 0U) && (memory_properties.memoryTypes[index].propertyFlags & properties) == properties) {
			return index;
		}
	}
	throw std::runtime_error("Failed to find a suitable memory type.");
}

void create_buffer(
	VulkanAppImpl& app,
	VkDeviceSize size,
	VkBufferUsageFlags usage,
	VkMemoryPropertyFlags properties,
	VkBuffer& buffer,
	VkDeviceMemory& memory) {
	const VkBufferCreateInfo buffer_info{
		.sType = VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO,
		.size = size,
		.usage = usage,
		.sharingMode = VK_SHARING_MODE_EXCLUSIVE,
	};
	if (vkCreateBuffer(app.device, &buffer_info, nullptr, &buffer) != VK_SUCCESS) {
		throw std::runtime_error("Failed to create a Vulkan buffer.");
	}

	VkMemoryRequirements memory_requirements{};
	vkGetBufferMemoryRequirements(app.device, buffer, &memory_requirements);
	const VkMemoryAllocateInfo allocate_info{
		.sType = VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO,
		.allocationSize = memory_requirements.size,
		.memoryTypeIndex = find_memory_type(app.physical_device, memory_requirements.memoryTypeBits, properties),
	};
	if (vkAllocateMemory(app.device, &allocate_info, nullptr, &memory) != VK_SUCCESS) {
		throw std::runtime_error("Failed to allocate buffer memory.");
	}
	vkBindBufferMemory(app.device, buffer, memory, 0);
}

void update_uniform_buffer(VulkanAppImpl& app) {
	const float elapsed_seconds = static_cast<float>(glfwGetTime());
	const SceneTransformUniform transform = build_gradient_triangle_transform(app.scene, elapsed_seconds);
	void* data = nullptr;
	vkMapMemory(app.device, app.uniform_buffer_memory, 0, sizeof(SceneTransformUniform), 0, &data);
	std::memcpy(data, &transform, sizeof(SceneTransformUniform));
	vkUnmapMemory(app.device, app.uniform_buffer_memory);
}

void create_instance(VulkanAppImpl& app) {
	app.validation_enabled = app.validation_requested && validation_layers_supported();
	app.validation_status = app.validation_enabled ? "enabled" : (app.validation_requested ? "requested but unavailable" : "disabled");
	const auto extensions = required_instance_extensions(app.validation_enabled);
	const VkApplicationInfo application_info{
		.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO,
		.pApplicationName = "Visual Math Vulkan",
		.applicationVersion = VK_MAKE_API_VERSION(0, 1, 0, 0),
		.pEngineName = "Visual Math",
		.engineVersion = VK_MAKE_API_VERSION(0, 1, 0, 0),
		.apiVersion = VK_API_VERSION_1_1,
	};
	VkDebugUtilsMessengerCreateInfoEXT debug_info = debug_messenger_create_info();
	const VkInstanceCreateInfo create_info{
		.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO,
		.pNext = app.validation_enabled ? &debug_info : nullptr,
		.flags = VK_INSTANCE_CREATE_ENUMERATE_PORTABILITY_BIT_KHR,
		.pApplicationInfo = &application_info,
		.enabledLayerCount = app.validation_enabled ? static_cast<std::uint32_t>(kValidationLayers.size()) : 0,
		.ppEnabledLayerNames = app.validation_enabled ? kValidationLayers.data() : nullptr,
		.enabledExtensionCount = static_cast<std::uint32_t>(extensions.size()),
		.ppEnabledExtensionNames = extensions.data(),
	};

	if (vkCreateInstance(&create_info, nullptr, &app.instance) != VK_SUCCESS) {
		throw std::runtime_error("Failed to create Vulkan instance.");
	}

	if (app.validation_enabled && create_debug_messenger(app.instance, &debug_info, &app.debug_messenger) != VK_SUCCESS) {
		throw std::runtime_error("Failed to create the Vulkan debug messenger.");
	}
}

void create_surface(VulkanAppImpl& app) {
	if (glfwCreateWindowSurface(app.instance, app.window, nullptr, &app.surface) != VK_SUCCESS) {
		throw std::runtime_error("Failed to create the GLFW Vulkan surface.");
	}
}

void pick_physical_device(VulkanAppImpl& app) {
	std::uint32_t device_count = 0;
	vkEnumeratePhysicalDevices(app.instance, &device_count, nullptr);
	if (device_count == 0) {
		throw std::runtime_error("No Vulkan physical devices were found.");
	}

	std::vector<VkPhysicalDevice> devices(device_count);
	vkEnumeratePhysicalDevices(app.instance, &device_count, devices.data());
	for (VkPhysicalDevice device : devices) {
		if (is_suitable_device(device, app.surface)) {
			const QueueFamilyIndices indices = find_queue_families(device, app.surface);
			app.physical_device = device;
			app.graphics_family = indices.graphics_family;
			app.present_family = indices.present_family;
			break;
		}
	}

	if (app.physical_device == VK_NULL_HANDLE) {
		throw std::runtime_error("Failed to select a suitable Vulkan physical device.");
	}
}

void create_logical_device(VulkanAppImpl& app) {
	std::vector<VkDeviceQueueCreateInfo> queue_infos;
	std::vector<std::uint32_t> families{*app.graphics_family};
	if (app.present_family != app.graphics_family) {
		families.push_back(*app.present_family);
	}

	constexpr float queue_priority = 1.0F;
	for (std::uint32_t family : families) {
		queue_infos.push_back(VkDeviceQueueCreateInfo{
			.sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO,
			.queueFamilyIndex = family,
			.queueCount = 1,
			.pQueuePriorities = &queue_priority,
		});
	}

	constexpr std::array device_extensions{VK_KHR_SWAPCHAIN_EXTENSION_NAME, kPortabilitySubsetExtensionName};
	const VkPhysicalDeviceFeatures device_features{};
	const VkDeviceCreateInfo create_info{
		.sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO,
		.queueCreateInfoCount = static_cast<std::uint32_t>(queue_infos.size()),
		.pQueueCreateInfos = queue_infos.data(),
		.enabledLayerCount = app.validation_enabled ? static_cast<std::uint32_t>(kValidationLayers.size()) : 0,
		.ppEnabledLayerNames = app.validation_enabled ? kValidationLayers.data() : nullptr,
		.enabledExtensionCount = static_cast<std::uint32_t>(device_extensions.size()),
		.ppEnabledExtensionNames = device_extensions.data(),
		.pEnabledFeatures = &device_features,
	};

	if (vkCreateDevice(app.physical_device, &create_info, nullptr, &app.device) != VK_SUCCESS) {
		throw std::runtime_error("Failed to create the logical Vulkan device.");
	}

	vkGetDeviceQueue(app.device, *app.graphics_family, 0, &app.graphics_queue);
	vkGetDeviceQueue(app.device, *app.present_family, 0, &app.present_queue);
}

void create_descriptor_set_layout(VulkanAppImpl& app) {
	const VkDescriptorSetLayoutBinding transform_binding{
		.binding = 0,
		.descriptorType = VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER,
		.descriptorCount = 1,
		.stageFlags = VK_SHADER_STAGE_VERTEX_BIT | VK_SHADER_STAGE_FRAGMENT_BIT,
	};
	const VkDescriptorSetLayoutCreateInfo layout_info{
		.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO,
		.bindingCount = 1,
		.pBindings = &transform_binding,
	};
	if (vkCreateDescriptorSetLayout(app.device, &layout_info, nullptr, &app.descriptor_set_layout) != VK_SUCCESS) {
		throw std::runtime_error("Failed to create the descriptor set layout.");
	}
}

void create_pipeline_layout(VulkanAppImpl& app) {
	const VkPipelineLayoutCreateInfo create_info{
		.sType = VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO,
		.setLayoutCount = 1,
		.pSetLayouts = &app.descriptor_set_layout,
	};
	if (vkCreatePipelineLayout(app.device, &create_info, nullptr, &app.pipeline_layout) != VK_SUCCESS) {
		throw std::runtime_error("Failed to create the pipeline layout.");
	}
}

void create_command_pool(VulkanAppImpl& app) {
	const VkCommandPoolCreateInfo pool_info{
		.sType = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO,
		.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT,
		.queueFamilyIndex = *app.graphics_family,
	};
	if (vkCreateCommandPool(app.device, &pool_info, nullptr, &app.command_pool) != VK_SUCCESS) {
		throw std::runtime_error("Failed to create the command pool.");
	}
}

void create_geometry_buffers(VulkanAppImpl& app) {
	const auto triangle_vertices = build_gradient_triangle_vertices(app.scene);
	const auto indexed_vertices = build_gradient_triangle_indexed_vertices(app.scene);
	const auto secondary_indexed_vertices = build_gradient_triangle_secondary_indexed_vertices(app.scene);
	const auto triangle_indices = build_gradient_triangle_indices(app.scene);
	std::array<GradientTriangleVertex, 8> indexed_geometry{};
	std::copy(indexed_vertices.begin(), indexed_vertices.end(), indexed_geometry.begin());
	std::copy(secondary_indexed_vertices.begin(), secondary_indexed_vertices.end(), indexed_geometry.begin() + indexed_vertices.size());
	std::array<std::uint16_t, 12> indexed_geometry_indices{};
	std::copy(triangle_indices.begin(), triangle_indices.end(), indexed_geometry_indices.begin());
	std::copy(triangle_indices.begin(), triangle_indices.end(), indexed_geometry_indices.begin() + triangle_indices.size());
	const auto outline_vertices = build_gradient_triangle_outline_vertices(app.scene);
	create_buffer(app, sizeof(triangle_vertices), VK_BUFFER_USAGE_VERTEX_BUFFER_BIT, VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT, app.triangle_vertex_buffer, app.triangle_vertex_buffer_memory);
	create_buffer(app, sizeof(indexed_geometry), VK_BUFFER_USAGE_VERTEX_BUFFER_BIT, VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT, app.indexed_vertex_buffer, app.indexed_vertex_buffer_memory);
	create_buffer(app, sizeof(indexed_geometry_indices), VK_BUFFER_USAGE_INDEX_BUFFER_BIT, VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT, app.index_buffer, app.index_buffer_memory);
	create_buffer(app, sizeof(outline_vertices), VK_BUFFER_USAGE_VERTEX_BUFFER_BIT, VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT, app.outline_vertex_buffer, app.outline_vertex_buffer_memory);
	create_buffer(app, sizeof(SceneTransformUniform), VK_BUFFER_USAGE_UNIFORM_BUFFER_BIT, VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT, app.uniform_buffer, app.uniform_buffer_memory);

	void* data = nullptr;
	vkMapMemory(app.device, app.triangle_vertex_buffer_memory, 0, sizeof(triangle_vertices), 0, &data);
	std::memcpy(data, triangle_vertices.data(), sizeof(triangle_vertices));
	vkUnmapMemory(app.device, app.triangle_vertex_buffer_memory);
	vkMapMemory(app.device, app.indexed_vertex_buffer_memory, 0, sizeof(indexed_geometry), 0, &data);
	std::memcpy(data, indexed_geometry.data(), sizeof(indexed_geometry));
	vkUnmapMemory(app.device, app.indexed_vertex_buffer_memory);
	vkMapMemory(app.device, app.index_buffer_memory, 0, sizeof(indexed_geometry_indices), 0, &data);
	std::memcpy(data, indexed_geometry_indices.data(), sizeof(indexed_geometry_indices));
	vkUnmapMemory(app.device, app.index_buffer_memory);
	vkMapMemory(app.device, app.outline_vertex_buffer_memory, 0, sizeof(outline_vertices), 0, &data);
	std::memcpy(data, outline_vertices.data(), sizeof(outline_vertices));
	vkUnmapMemory(app.device, app.outline_vertex_buffer_memory);
	update_uniform_buffer(app);
}

void create_descriptor_pool(VulkanAppImpl& app) {
	const VkDescriptorPoolSize pool_size{.type = VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER, .descriptorCount = 1};
	const VkDescriptorPoolCreateInfo create_info{
		.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO,
		.maxSets = 1,
		.poolSizeCount = 1,
		.pPoolSizes = &pool_size,
	};
	if (vkCreateDescriptorPool(app.device, &create_info, nullptr, &app.descriptor_pool) != VK_SUCCESS) {
		throw std::runtime_error("Failed to create the descriptor pool.");
	}
}

void create_descriptor_set(VulkanAppImpl& app) {
	const VkDescriptorSetAllocateInfo allocate_info{
		.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO,
		.descriptorPool = app.descriptor_pool,
		.descriptorSetCount = 1,
		.pSetLayouts = &app.descriptor_set_layout,
	};
	if (vkAllocateDescriptorSets(app.device, &allocate_info, &app.descriptor_set) != VK_SUCCESS) {
		throw std::runtime_error("Failed to allocate the descriptor set.");
	}

	const VkDescriptorBufferInfo buffer_info{.buffer = app.uniform_buffer, .offset = 0, .range = sizeof(SceneTransformUniform)};
	const VkWriteDescriptorSet write{
		.sType = VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET,
		.dstSet = app.descriptor_set,
		.dstBinding = 0,
		.descriptorCount = 1,
		.descriptorType = VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER,
		.pBufferInfo = &buffer_info,
	};
	vkUpdateDescriptorSets(app.device, 1, &write, 0, nullptr);
}

void create_swapchain(VulkanAppImpl& app) {
	const auto support = query_swapchain_support(app.physical_device, app.surface);
	const VkSurfaceFormatKHR surface_format = choose_surface_format(support.formats);
	const VkPresentModeKHR present_mode = choose_present_mode(support.present_modes);
	const VkExtent2D extent = choose_swap_extent(app.window, support.capabilities);

	std::uint32_t image_count = support.capabilities.minImageCount + 1;
	if (support.capabilities.maxImageCount > 0 && image_count > support.capabilities.maxImageCount) {
		image_count = support.capabilities.maxImageCount;
	}

	const std::uint32_t family_indices[] = {*app.graphics_family, *app.present_family};
	const bool split_families = app.graphics_family != app.present_family;
	const VkSwapchainCreateInfoKHR create_info{
		.sType = VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR,
		.surface = app.surface,
		.minImageCount = image_count,
		.imageFormat = surface_format.format,
		.imageColorSpace = surface_format.colorSpace,
		.imageExtent = extent,
		.imageArrayLayers = 1,
		.imageUsage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT,
		.imageSharingMode = split_families ? VK_SHARING_MODE_CONCURRENT : VK_SHARING_MODE_EXCLUSIVE,
		.queueFamilyIndexCount = split_families ? 2U : 0U,
		.pQueueFamilyIndices = split_families ? family_indices : nullptr,
		.preTransform = support.capabilities.currentTransform,
		.compositeAlpha = VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR,
		.presentMode = present_mode,
		.clipped = VK_TRUE,
	};
	if (vkCreateSwapchainKHR(app.device, &create_info, nullptr, &app.swapchain) != VK_SUCCESS) {
		throw std::runtime_error("Failed to create the swapchain.");
	}

	vkGetSwapchainImagesKHR(app.device, app.swapchain, &image_count, nullptr);
	app.swapchain_images.resize(image_count);
	vkGetSwapchainImagesKHR(app.device, app.swapchain, &image_count, app.swapchain_images.data());
	app.swapchain_image_format = surface_format.format;
	app.swapchain_extent = extent;
}

void create_image_views(VulkanAppImpl& app) {
	app.swapchain_image_views.resize(app.swapchain_images.size());
	for (std::size_t index = 0; index < app.swapchain_images.size(); ++index) {
		const VkImageViewCreateInfo create_info{
			.sType = VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO,
			.image = app.swapchain_images[index],
			.viewType = VK_IMAGE_VIEW_TYPE_2D,
			.format = app.swapchain_image_format,
			.subresourceRange = {.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT, .baseMipLevel = 0, .levelCount = 1, .baseArrayLayer = 0, .layerCount = 1},
		};
		if (vkCreateImageView(app.device, &create_info, nullptr, &app.swapchain_image_views[index]) != VK_SUCCESS) {
			throw std::runtime_error("Failed to create a swapchain image view.");
		}
	}
}

void create_render_pass(VulkanAppImpl& app) {
	const VkAttachmentDescription color_attachment{
		.format = app.swapchain_image_format,
		.samples = VK_SAMPLE_COUNT_1_BIT,
		.loadOp = VK_ATTACHMENT_LOAD_OP_CLEAR,
		.storeOp = VK_ATTACHMENT_STORE_OP_STORE,
		.stencilLoadOp = VK_ATTACHMENT_LOAD_OP_DONT_CARE,
		.stencilStoreOp = VK_ATTACHMENT_STORE_OP_DONT_CARE,
		.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED,
		.finalLayout = VK_IMAGE_LAYOUT_PRESENT_SRC_KHR,
	};
	const VkAttachmentReference color_attachment_ref{.attachment = 0, .layout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL};
	const VkSubpassDescription subpass{.pipelineBindPoint = VK_PIPELINE_BIND_POINT_GRAPHICS, .colorAttachmentCount = 1, .pColorAttachments = &color_attachment_ref};
	const VkSubpassDependency dependency{
		.srcSubpass = VK_SUBPASS_EXTERNAL,
		.dstSubpass = 0,
		.srcStageMask = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT,
		.dstStageMask = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT,
		.dstAccessMask = VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT,
	};
	const VkRenderPassCreateInfo create_info{
		.sType = VK_STRUCTURE_TYPE_RENDER_PASS_CREATE_INFO,
		.attachmentCount = 1,
		.pAttachments = &color_attachment,
		.subpassCount = 1,
		.pSubpasses = &subpass,
		.dependencyCount = 1,
		.pDependencies = &dependency,
	};
	if (vkCreateRenderPass(app.device, &create_info, nullptr, &app.render_pass) != VK_SUCCESS) {
		throw std::runtime_error("Failed to create the render pass.");
	}
}

VkPipeline create_pipeline(
	VulkanAppImpl& app,
	VkPrimitiveTopology topology,
	std::string_view fragment_shader_name,
	float line_width,
	VkCullModeFlags cull_mode,
	VkBool32 primitive_restart_enable) {
	const auto vertex_shader = read_binary_file(app.shader_directory / "gradient_triangle.vert.spv");
	const auto fragment_shader = read_binary_file(app.shader_directory / std::string(fragment_shader_name));
	const VkShaderModule vertex_module = create_shader_module(app.device, vertex_shader);
	const VkShaderModule fragment_module = create_shader_module(app.device, fragment_shader);

	const VkPipelineShaderStageCreateInfo vertex_stage{
		.sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO,
		.stage = VK_SHADER_STAGE_VERTEX_BIT,
		.module = vertex_module,
		.pName = "main",
	};
	const VkPipelineShaderStageCreateInfo fragment_stage{
		.sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO,
		.stage = VK_SHADER_STAGE_FRAGMENT_BIT,
		.module = fragment_module,
		.pName = "main",
	};
	const VkPipelineShaderStageCreateInfo stages[] = {vertex_stage, fragment_stage};
	const auto vertex_input = vertex_description();
	const VkPipelineVertexInputStateCreateInfo vertex_input_info{
		.sType = VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO,
		.vertexBindingDescriptionCount = 1,
		.pVertexBindingDescriptions = &vertex_input.binding,
		.vertexAttributeDescriptionCount = static_cast<std::uint32_t>(vertex_input.attributes.size()),
		.pVertexAttributeDescriptions = vertex_input.attributes.data(),
	};
	const VkPipelineInputAssemblyStateCreateInfo input_assembly{
		.sType = VK_STRUCTURE_TYPE_PIPELINE_INPUT_ASSEMBLY_STATE_CREATE_INFO,
		.topology = topology,
		.primitiveRestartEnable = primitive_restart_enable,
	};
	const VkViewport viewport{.x = 0.0F, .y = 0.0F, .width = static_cast<float>(app.swapchain_extent.width), .height = static_cast<float>(app.swapchain_extent.height), .minDepth = 0.0F, .maxDepth = 1.0F};
	const VkRect2D scissor{.offset = {.x = 0, .y = 0}, .extent = app.swapchain_extent};
	const VkPipelineViewportStateCreateInfo viewport_state{.sType = VK_STRUCTURE_TYPE_PIPELINE_VIEWPORT_STATE_CREATE_INFO, .viewportCount = 1, .pViewports = &viewport, .scissorCount = 1, .pScissors = &scissor};
	const VkPipelineRasterizationStateCreateInfo rasterizer{
		.sType = VK_STRUCTURE_TYPE_PIPELINE_RASTERIZATION_STATE_CREATE_INFO,
		.polygonMode = VK_POLYGON_MODE_FILL,
		.cullMode = cull_mode,
		.frontFace = VK_FRONT_FACE_CLOCKWISE,
		.lineWidth = line_width,
	};
	const VkPipelineMultisampleStateCreateInfo multisampling{.sType = VK_STRUCTURE_TYPE_PIPELINE_MULTISAMPLE_STATE_CREATE_INFO, .rasterizationSamples = VK_SAMPLE_COUNT_1_BIT};
	const VkPipelineColorBlendAttachmentState color_blend_attachment{.colorWriteMask = VK_COLOR_COMPONENT_R_BIT | VK_COLOR_COMPONENT_G_BIT | VK_COLOR_COMPONENT_B_BIT | VK_COLOR_COMPONENT_A_BIT};
	const VkPipelineColorBlendStateCreateInfo color_blending{.sType = VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO, .attachmentCount = 1, .pAttachments = &color_blend_attachment};
	const VkGraphicsPipelineCreateInfo pipeline_info{
		.sType = VK_STRUCTURE_TYPE_GRAPHICS_PIPELINE_CREATE_INFO,
		.stageCount = 2,
		.pStages = stages,
		.pVertexInputState = &vertex_input_info,
		.pInputAssemblyState = &input_assembly,
		.pViewportState = &viewport_state,
		.pRasterizationState = &rasterizer,
		.pMultisampleState = &multisampling,
		.pColorBlendState = &color_blending,
		.layout = app.pipeline_layout,
		.renderPass = app.render_pass,
		.subpass = 0,
	};

	VkPipeline pipeline = VK_NULL_HANDLE;
	if (vkCreateGraphicsPipelines(app.device, VK_NULL_HANDLE, 1, &pipeline_info, nullptr, &pipeline) != VK_SUCCESS) {
		throw std::runtime_error("Failed to create a graphics pipeline.");
	}

	vkDestroyShaderModule(app.device, fragment_module, nullptr);
	vkDestroyShaderModule(app.device, vertex_module, nullptr);
	return pipeline;
}

void create_graphics_pipelines(VulkanAppImpl& app) {
	app.graphics_pipeline = create_pipeline(
		app,
		VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST,
		"gradient_triangle.frag.spv",
		1.0F,
		VK_CULL_MODE_BACK_BIT,
		VK_FALSE);
	app.indexed_pipeline = create_pipeline(
		app,
		VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST,
		"indexed_polygon.frag.spv",
		1.0F,
		VK_CULL_MODE_BACK_BIT,
		VK_FALSE);
	app.outline_pipeline = create_pipeline(
		app,
		VK_PRIMITIVE_TOPOLOGY_LINE_STRIP,
		"gradient_triangle.frag.spv",
		1.0F,
		VK_CULL_MODE_NONE,
		VK_TRUE);
}

void create_framebuffers(VulkanAppImpl& app) {
	app.framebuffers.resize(app.swapchain_image_views.size());
	for (std::size_t index = 0; index < app.swapchain_image_views.size(); ++index) {
		const VkImageView attachments[] = {app.swapchain_image_views[index]};
		const VkFramebufferCreateInfo create_info{
			.sType = VK_STRUCTURE_TYPE_FRAMEBUFFER_CREATE_INFO,
			.renderPass = app.render_pass,
			.attachmentCount = 1,
			.pAttachments = attachments,
			.width = app.swapchain_extent.width,
			.height = app.swapchain_extent.height,
			.layers = 1,
		};
		if (vkCreateFramebuffer(app.device, &create_info, nullptr, &app.framebuffers[index]) != VK_SUCCESS) {
			throw std::runtime_error("Failed to create a framebuffer.");
		}
	}
}

void destroy_swapchain_resources(VulkanAppImpl& app) {
	for (VkFramebuffer framebuffer : app.framebuffers) {
		vkDestroyFramebuffer(app.device, framebuffer, nullptr);
	}
	app.framebuffers.clear();

	if (!app.command_buffers.empty()) {
		vkFreeCommandBuffers(app.device, app.command_pool, static_cast<std::uint32_t>(app.command_buffers.size()), app.command_buffers.data());
		app.command_buffers.clear();
	}

	if (app.outline_pipeline != VK_NULL_HANDLE) {
		vkDestroyPipeline(app.device, app.outline_pipeline, nullptr);
		app.outline_pipeline = VK_NULL_HANDLE;
	}
	if (app.indexed_pipeline != VK_NULL_HANDLE) {
		vkDestroyPipeline(app.device, app.indexed_pipeline, nullptr);
		app.indexed_pipeline = VK_NULL_HANDLE;
	}
	if (app.graphics_pipeline != VK_NULL_HANDLE) {
		vkDestroyPipeline(app.device, app.graphics_pipeline, nullptr);
		app.graphics_pipeline = VK_NULL_HANDLE;
	}
	if (app.render_pass != VK_NULL_HANDLE) {
		vkDestroyRenderPass(app.device, app.render_pass, nullptr);
		app.render_pass = VK_NULL_HANDLE;
	}
	for (VkImageView image_view : app.swapchain_image_views) {
		vkDestroyImageView(app.device, image_view, nullptr);
	}
	app.swapchain_image_views.clear();
	if (app.swapchain != VK_NULL_HANDLE) {
		vkDestroySwapchainKHR(app.device, app.swapchain, nullptr);
		app.swapchain = VK_NULL_HANDLE;
	}
}

void record_command_buffer(VulkanAppImpl& app, VkCommandBuffer command_buffer, std::uint32_t image_index) {
	const VkCommandBufferBeginInfo begin_info{.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO};
	if (vkBeginCommandBuffer(command_buffer, &begin_info) != VK_SUCCESS) {
		throw std::runtime_error("Failed to begin recording a command buffer.");
	}

	const RgbaColor clear = gradient_triangle_clear_color(app.scene);
	VkClearValue clear_value{};
	clear_value.color = {{clear.red, clear.green, clear.blue, clear.alpha}};
	const VkRenderPassBeginInfo render_pass_info{
		.sType = VK_STRUCTURE_TYPE_RENDER_PASS_BEGIN_INFO,
		.renderPass = app.render_pass,
		.framebuffer = app.framebuffers[image_index],
		.renderArea = {.offset = {.x = 0, .y = 0}, .extent = app.swapchain_extent},
		.clearValueCount = 1,
		.pClearValues = &clear_value,
	};

	vkCmdBeginRenderPass(command_buffer, &render_pass_info, VK_SUBPASS_CONTENTS_INLINE);
	vkCmdBindDescriptorSets(command_buffer, VK_PIPELINE_BIND_POINT_GRAPHICS, app.pipeline_layout, 0, 1, &app.descriptor_set, 0, nullptr);
	constexpr VkDeviceSize offsets[] = {0};
	const VkBuffer triangle_buffer[] = {app.triangle_vertex_buffer};
	vkCmdBindPipeline(command_buffer, VK_PIPELINE_BIND_POINT_GRAPHICS, app.graphics_pipeline);
	vkCmdBindVertexBuffers(command_buffer, 0, 1, triangle_buffer, offsets);
	vkCmdDraw(command_buffer, 3, 1, 0, 0);
	const VkBuffer indexed_polygon_buffer[] = {app.indexed_vertex_buffer};
	vkCmdBindPipeline(command_buffer, VK_PIPELINE_BIND_POINT_GRAPHICS, app.indexed_pipeline);
	vkCmdBindVertexBuffers(command_buffer, 0, 1, indexed_polygon_buffer, offsets);
	vkCmdBindIndexBuffer(command_buffer, app.index_buffer, 0, VK_INDEX_TYPE_UINT16);
	vkCmdDrawIndexed(command_buffer, 6, 1, 0, 0, 0);
	vkCmdDrawIndexed(command_buffer, 6, 1, 6, 4, 0);

	const VkBuffer outline_buffer[] = {app.outline_vertex_buffer};
	vkCmdBindPipeline(command_buffer, VK_PIPELINE_BIND_POINT_GRAPHICS, app.outline_pipeline);
	vkCmdBindVertexBuffers(command_buffer, 0, 1, outline_buffer, offsets);
	vkCmdDraw(command_buffer, 5, 1, 0, 0);
	vkCmdEndRenderPass(command_buffer);

	if (vkEndCommandBuffer(command_buffer) != VK_SUCCESS) {
		throw std::runtime_error("Failed to record a command buffer.");
	}
}

void create_command_buffers(VulkanAppImpl& app) {
	app.command_buffers.resize(app.framebuffers.size());
	const VkCommandBufferAllocateInfo allocate_info{
		.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO,
		.commandPool = app.command_pool,
		.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY,
		.commandBufferCount = static_cast<std::uint32_t>(app.command_buffers.size()),
	};
	if (vkAllocateCommandBuffers(app.device, &allocate_info, app.command_buffers.data()) != VK_SUCCESS) {
		throw std::runtime_error("Failed to allocate command buffers.");
	}
	for (std::uint32_t index = 0; index < app.command_buffers.size(); ++index) {
		record_command_buffer(app, app.command_buffers[index], index);
	}
}

void create_swapchain_dependent_resources(VulkanAppImpl& app) {
	create_swapchain(app);
	create_image_views(app);
	create_render_pass(app);
	create_graphics_pipelines(app);
	create_framebuffers(app);
	create_command_buffers(app);
}

void recreate_swapchain(VulkanAppImpl& app) {
	int width = 0;
	int height = 0;
	while (width == 0 || height == 0) {
		glfwGetFramebufferSize(app.window, &width, &height);
		glfwWaitEvents();
	}

	vkDeviceWaitIdle(app.device);
	destroy_swapchain_resources(app);
	create_swapchain_dependent_resources(app);
	app.framebuffer_resized = false;
}

void create_sync_objects(VulkanAppImpl& app) {
	const VkSemaphoreCreateInfo semaphore_info{.sType = VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO};
	const VkFenceCreateInfo fence_info{.sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO, .flags = VK_FENCE_CREATE_SIGNALED_BIT};
	if (vkCreateSemaphore(app.device, &semaphore_info, nullptr, &app.image_available_semaphore) != VK_SUCCESS ||
		vkCreateSemaphore(app.device, &semaphore_info, nullptr, &app.render_finished_semaphore) != VK_SUCCESS ||
		vkCreateFence(app.device, &fence_info, nullptr, &app.in_flight_fence) != VK_SUCCESS) {
		throw std::runtime_error("Failed to create synchronization objects.");
	}
}

void draw_frame(VulkanAppImpl& app) {
	vkWaitForFences(app.device, 1, &app.in_flight_fence, VK_TRUE, UINT64_MAX);
	vkResetFences(app.device, 1, &app.in_flight_fence);

	std::uint32_t image_index = 0;
	const VkResult acquire_result = vkAcquireNextImageKHR(app.device, app.swapchain, UINT64_MAX, app.image_available_semaphore, VK_NULL_HANDLE, &image_index);
	if (acquire_result == VK_ERROR_OUT_OF_DATE_KHR) {
		recreate_swapchain(app);
		return;
	}
	if (acquire_result != VK_SUCCESS && acquire_result != VK_SUBOPTIMAL_KHR) {
		throw std::runtime_error("Failed to acquire the next swapchain image.");
	}

	update_uniform_buffer(app);
	const VkPipelineStageFlags wait_stages[] = {VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT};
	const VkSubmitInfo submit_info{
		.sType = VK_STRUCTURE_TYPE_SUBMIT_INFO,
		.waitSemaphoreCount = 1,
		.pWaitSemaphores = &app.image_available_semaphore,
		.pWaitDstStageMask = wait_stages,
		.commandBufferCount = 1,
		.pCommandBuffers = &app.command_buffers[image_index],
		.signalSemaphoreCount = 1,
		.pSignalSemaphores = &app.render_finished_semaphore,
	};
	if (vkQueueSubmit(app.graphics_queue, 1, &submit_info, app.in_flight_fence) != VK_SUCCESS) {
		throw std::runtime_error("Failed to submit the draw command buffer.");
	}

	const VkPresentInfoKHR present_info{
		.sType = VK_STRUCTURE_TYPE_PRESENT_INFO_KHR,
		.waitSemaphoreCount = 1,
		.pWaitSemaphores = &app.render_finished_semaphore,
		.swapchainCount = 1,
		.pSwapchains = &app.swapchain,
		.pImageIndices = &image_index,
	};
	const VkResult present_result = vkQueuePresentKHR(app.present_queue, &present_info);
	if (present_result == VK_ERROR_OUT_OF_DATE_KHR || present_result == VK_SUBOPTIMAL_KHR || app.framebuffer_resized) {
		recreate_swapchain(app);
		return;
	}
	if (present_result != VK_SUCCESS) {
		throw std::runtime_error("Failed to present the rendered frame.");
	}
}

void initialize_window(VulkanAppImpl& app) {
	if (glfwInit() != GLFW_TRUE) {
		throw std::runtime_error("Failed to initialize GLFW.");
	}
	app.glfw_initialized = true;
	glfwWindowHint(GLFW_CLIENT_API, GLFW_NO_API);
	glfwWindowHint(GLFW_RESIZABLE, GLFW_TRUE);
	app.window = glfwCreateWindow(static_cast<int>(kWindowWidth), static_cast<int>(kWindowHeight), "Visual Math Vulkan", nullptr, nullptr);
	if (app.window == nullptr) {
		throw std::runtime_error("Failed to create the Vulkan window.");
	}
	glfwSetWindowUserPointer(app.window, &app);
	glfwSetFramebufferSizeCallback(app.window, framebuffer_resize_callback);
}

void initialize_vulkan(VulkanAppImpl& app) {
	create_instance(app);
	create_surface(app);
	pick_physical_device(app);
	create_logical_device(app);
	create_descriptor_set_layout(app);
	create_pipeline_layout(app);
	create_command_pool(app);
	create_geometry_buffers(app);
	create_descriptor_pool(app);
	create_descriptor_set(app);
	create_swapchain_dependent_resources(app);
	create_sync_objects(app);
}

}  // namespace

VulkanApp::VulkanApp(std::string executable_path, GradientTriangleScene scene)
	: impl_(std::make_unique<VulkanAppImpl>()) {
	if (!is_valid_gradient_triangle_scene(scene)) {
		throw std::invalid_argument("VulkanApp requires a valid gradient triangle scene.");
	}
	impl_->scene = scene;
	impl_->validation_requested = env_flag_enabled(kValidationToggleEnv);
	impl_->executable_path = executable_path.empty() ? std::filesystem::current_path() / "build" / "visual_math_vulkan" : std::filesystem::path(std::move(executable_path));
	impl_->shader_directory = resolve_shader_directory(impl_->executable_path);
	impl_->validation_status = impl_->validation_requested
		? (validation_layers_supported() ? "enabled" : "requested but unavailable")
		: "disabled";
}

VulkanApp::~VulkanApp() {
	cleanup();
}

VulkanApp::VulkanApp(VulkanApp&& other) noexcept = default;

VulkanApp& VulkanApp::operator=(VulkanApp&& other) noexcept = default;

std::string VulkanApp::startup_summary() const {
	std::ostringstream stream;
	stream << "Phase 7 Vulkan foundation is active. "
	       << "The native target now builds a reusable core library against Vulkan header version "
	       << VK_HEADER_VERSION
	       << ", compiles SPIR-V shaders into "
	       << impl_->shader_directory.string()
	       << ", supports resize-safe swapchain recreation, drives the triangle transform from a uniform buffer, draws two indexed polygon overlays through a dedicated material path plus a second line-strip primitive, and reports validation layers as "
	       << impl_->validation_status
	       << " through "
	       << kValidationToggleEnv
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

std::string VulkanApp::runtime_summary() const {
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
	if (impl_->last_run_seconds > 0.0) {
		stream << " (avg "
		       << std::setprecision(2)
		       << static_cast<double>(impl_->last_rendered_frames) / impl_->last_run_seconds
		       << " fps)";
	}
	stream << '.';
	return stream.str();
}

void VulkanApp::run(std::uint32_t max_frames) {
	initialize();
	std::uint32_t rendered_frames = 0;
	const auto start_time = std::chrono::steady_clock::now();
	while (!glfwWindowShouldClose(impl_->window) && (max_frames == 0 || rendered_frames < max_frames)) {
		glfwPollEvents();
		draw_frame(*impl_);
		++rendered_frames;
	}
	vkDeviceWaitIdle(impl_->device);
	const auto end_time = std::chrono::steady_clock::now();
	impl_->last_rendered_frames = rendered_frames;
	impl_->last_run_seconds = std::chrono::duration<double>(end_time - start_time).count();
	impl_->has_runtime_stats = true;
}

void VulkanApp::initialize() {
	if (initialized_) {
		return;
	}
	initialize_window(*impl_);
	initialize_vulkan(*impl_);
	initialized_ = true;
}

void VulkanApp::cleanup() noexcept {
	if (!impl_) {
		return;
	}

	if (!initialized_) {
		if (impl_->window != nullptr) {
			glfwDestroyWindow(impl_->window);
			impl_->window = nullptr;
		}
		if (impl_->glfw_initialized) {
			glfwTerminate();
			impl_->glfw_initialized = false;
		}
		return;
	}

	VulkanAppImpl& app = *impl_;
	vkDeviceWaitIdle(app.device);
	vkDestroyFence(app.device, app.in_flight_fence, nullptr);
	vkDestroySemaphore(app.device, app.render_finished_semaphore, nullptr);
	vkDestroySemaphore(app.device, app.image_available_semaphore, nullptr);
	vkDestroyBuffer(app.device, app.uniform_buffer, nullptr);
	vkFreeMemory(app.device, app.uniform_buffer_memory, nullptr);
	vkDestroyBuffer(app.device, app.index_buffer, nullptr);
	vkFreeMemory(app.device, app.index_buffer_memory, nullptr);
	vkDestroyBuffer(app.device, app.indexed_vertex_buffer, nullptr);
	vkFreeMemory(app.device, app.indexed_vertex_buffer_memory, nullptr);
	vkDestroyBuffer(app.device, app.outline_vertex_buffer, nullptr);
	vkFreeMemory(app.device, app.outline_vertex_buffer_memory, nullptr);
	vkDestroyBuffer(app.device, app.triangle_vertex_buffer, nullptr);
	vkFreeMemory(app.device, app.triangle_vertex_buffer_memory, nullptr);
	destroy_swapchain_resources(app);
	vkDestroyDescriptorPool(app.device, app.descriptor_pool, nullptr);
	vkDestroyDescriptorSetLayout(app.device, app.descriptor_set_layout, nullptr);
	vkDestroyCommandPool(app.device, app.command_pool, nullptr);
	vkDestroyPipelineLayout(app.device, app.pipeline_layout, nullptr);
	vkDestroyDevice(app.device, nullptr);
	if (app.debug_messenger != VK_NULL_HANDLE) {
		destroy_debug_messenger(app.instance, app.debug_messenger);
	}
	vkDestroySurfaceKHR(app.instance, app.surface, nullptr);
	vkDestroyInstance(app.instance, nullptr);
	glfwDestroyWindow(app.window);
	if (app.glfw_initialized) {
		glfwTerminate();
		app.glfw_initialized = false;
	}
	app.window = nullptr;
	initialized_ = false;
}

}  // namespace visual_math::vulkan