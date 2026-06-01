#pragma once

#include "visual_math_opengl/gradient_triangle_scene.hpp"
#include "visual_math_opengl/renderer_configuration.hpp"

#include <OpenGL/gl3.h>

namespace visual_math::opengl {

struct GeometryResourceState {
	GLuint vertex_array = 0;
	GLuint vertex_buffer = 0;
};

struct GLGeometryRuntime {
	GeometryResourceState triangle;
	GeometryResourceState indexed;
	GeometryResourceState secondary_indexed;
	GeometryResourceState outline;
	GLuint shared_index_buffer = 0;
};

[[nodiscard]] GeometryResourceState& geometry_resource(GLGeometryRuntime& runtime, GeometrySlot slot);
void create_geometry_resources(
	GLGeometryRuntime& runtime,
	const RendererConfiguration& renderer_configuration,
	const GradientTriangleScene& scene);
void destroy_geometry_resources(
	GLGeometryRuntime& runtime,
	const RendererConfiguration& renderer_configuration) noexcept;

}  // namespace visual_math::opengl