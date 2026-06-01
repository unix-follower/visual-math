#pragma once

#include "visual_math_opengl/gradient_triangle_scene.hpp"

#include <array>
#include <string_view>

namespace visual_math::opengl {

using TriangleGeometryBuilder = std::array<GradientTriangleVertex, 3> (*)(const GradientTriangleScene&);
using IndexedGeometryBuilder = std::array<GradientTriangleVertex, 4> (*)(const GradientTriangleScene&);
using OutlineGeometryBuilder = std::array<GradientTriangleVertex, 5> (*)(const GradientTriangleScene&);

struct OpenGLSceneCatalogEntry {
	OpenGLSceneKind scene_kind = OpenGLSceneKind::GradientTriangle;
	std::string_view label = "gradient-triangle";
	TriangleGeometryBuilder triangle_builder = &build_gradient_triangle_vertices;
	IndexedGeometryBuilder indexed_builder = &build_gradient_triangle_indexed_vertices;
	IndexedGeometryBuilder secondary_indexed_builder = &build_gradient_triangle_secondary_indexed_vertices;
	OutlineGeometryBuilder outline_builder = &build_gradient_triangle_outline_vertices;
};

[[nodiscard]] const OpenGLSceneCatalogEntry& opengl_scene_catalog(OpenGLSceneKind scene_kind);

}  // namespace visual_math::opengl