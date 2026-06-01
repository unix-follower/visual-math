#pragma once

#include "visual_math_opengl/scene_catalog.hpp"

#include <array>
#include <cstddef>
#include <cstdint>
#include <string_view>

namespace visual_math::opengl {

enum class ProgramSlot : std::size_t {
	Base = 0,
	Indexed = 1,
};

enum class DrawPrimitive : std::uint8_t {
	Triangles,
	LineStrip,
};

enum class GeometrySlot : std::size_t {
	Triangle = 0,
	Indexed = 1,
	SecondaryIndexed = 2,
	Outline = 3,
};

struct ProgramSpecification {
	ProgramSlot slot;
	std::string_view vertex_shader_name;
	std::string_view fragment_shader_name;
	bool uses_indexed_material = false;
};

struct DrawPassSpecification {
	ProgramSlot slot;
	GeometrySlot geometry_slot = GeometrySlot::Triangle;
	DrawPrimitive primitive = DrawPrimitive::Triangles;
	std::uint32_t vertex_or_index_count = 0;
	bool indexed = false;
};

struct GeometrySpecification {
	GeometrySlot slot = GeometrySlot::Triangle;
	bool indexed = false;
	bool uses_shared_index_buffer = false;
	OutlineGeometryBuilder vertex_builder_outline = nullptr;
	IndexedGeometryBuilder vertex_builder_quad = nullptr;
	TriangleGeometryBuilder vertex_builder_triangle = nullptr;
};

struct RendererConfiguration {
	std::array<ProgramSpecification, 2> programs;
	std::array<DrawPassSpecification, 4> draw_passes;
	std::array<GeometrySpecification, 4> geometries;
};

[[nodiscard]] RendererConfiguration make_renderer_configuration(OpenGLSceneKind scene_kind);

}  // namespace visual_math::opengl