#include "visual_math_opengl/gl_resource_helpers.hpp"

#include <cstddef>

namespace visual_math::opengl {
namespace {

template <std::size_t VertexCount>
void upload_array_geometry(
	GLuint vertex_array,
	GLuint vertex_buffer,
	const std::array<GradientTriangleVertex, VertexCount>& vertices) {
	glBindVertexArray(vertex_array);
	glBindBuffer(GL_ARRAY_BUFFER, vertex_buffer);
	glBufferData(GL_ARRAY_BUFFER, static_cast<GLsizeiptr>(sizeof(vertices)), vertices.data(), GL_STATIC_DRAW);
	glEnableVertexAttribArray(0);
	glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, sizeof(GradientTriangleVertex), reinterpret_cast<const void*>(offsetof(GradientTriangleVertex, x)));
	glEnableVertexAttribArray(1);
	glVertexAttribPointer(1, 4, GL_FLOAT, GL_FALSE, sizeof(GradientTriangleVertex), reinterpret_cast<const void*>(offsetof(GradientTriangleVertex, red)));
	glBindBuffer(GL_ARRAY_BUFFER, 0);
	glBindVertexArray(0);
}

}  // namespace

GeometryResourceState& geometry_resource(GLGeometryRuntime& runtime, GeometrySlot slot) {
	switch (slot) {
	case GeometrySlot::Triangle:
		return runtime.triangle;
	case GeometrySlot::Indexed:
		return runtime.indexed;
	case GeometrySlot::SecondaryIndexed:
		return runtime.secondary_indexed;
	case GeometrySlot::Outline:
		return runtime.outline;
	}
	return runtime.triangle;
}

void create_geometry_resources(
	GLGeometryRuntime& runtime,
	const RendererConfiguration& renderer_configuration,
	const GradientTriangleScene& scene) {
	for (const auto& specification : renderer_configuration.geometries) {
		auto& geometry = geometry_resource(runtime, specification.slot);
		glGenVertexArrays(1, &geometry.vertex_array);
		glGenBuffers(1, &geometry.vertex_buffer);
		if (specification.indexed && !specification.uses_shared_index_buffer) {
			continue;
		}
		if (specification.vertex_builder_triangle != nullptr) {
			upload_array_geometry(geometry.vertex_array, geometry.vertex_buffer, specification.vertex_builder_triangle(scene));
			continue;
		}
		if (specification.vertex_builder_quad != nullptr) {
			const auto vertices = specification.vertex_builder_quad(scene);
			const auto indices = build_gradient_triangle_indices(scene);
			glBindVertexArray(geometry.vertex_array);
			glBindBuffer(GL_ARRAY_BUFFER, geometry.vertex_buffer);
			glBufferData(GL_ARRAY_BUFFER, static_cast<GLsizeiptr>(sizeof(vertices)), vertices.data(), GL_STATIC_DRAW);
			glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, runtime.shared_index_buffer);
			glBufferData(GL_ELEMENT_ARRAY_BUFFER, static_cast<GLsizeiptr>(sizeof(indices)), indices.data(), GL_STATIC_DRAW);
			glEnableVertexAttribArray(0);
			glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, sizeof(GradientTriangleVertex), reinterpret_cast<const void*>(offsetof(GradientTriangleVertex, x)));
			glEnableVertexAttribArray(1);
			glVertexAttribPointer(1, 4, GL_FLOAT, GL_FALSE, sizeof(GradientTriangleVertex), reinterpret_cast<const void*>(offsetof(GradientTriangleVertex, red)));
			glBindBuffer(GL_ARRAY_BUFFER, 0);
			glBindVertexArray(0);
			continue;
		}
		if (specification.vertex_builder_outline != nullptr) {
			upload_array_geometry(geometry.vertex_array, geometry.vertex_buffer, specification.vertex_builder_outline(scene));
		}
	}
}

void destroy_geometry_resources(
	GLGeometryRuntime& runtime,
	const RendererConfiguration& renderer_configuration) noexcept {
	if (runtime.shared_index_buffer != 0) {
		glDeleteBuffers(1, &runtime.shared_index_buffer);
		runtime.shared_index_buffer = 0;
	}
	for (const auto& specification : renderer_configuration.geometries) {
		auto& geometry = geometry_resource(runtime, specification.slot);
		if (geometry.vertex_buffer != 0) {
			glDeleteBuffers(1, &geometry.vertex_buffer);
			geometry.vertex_buffer = 0;
		}
		if (geometry.vertex_array != 0) {
			glDeleteVertexArrays(1, &geometry.vertex_array);
			geometry.vertex_array = 0;
		}
	}
}

}  // namespace visual_math::opengl