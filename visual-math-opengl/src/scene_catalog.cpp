#include "visual_math_opengl/scene_catalog.hpp"

namespace visual_math::opengl {
namespace {

constexpr OpenGLSceneCatalogEntry kGradientTriangleCatalog{
	.scene_kind = OpenGLSceneKind::GradientTriangle,
	.label = "gradient-triangle",
	.triangle_builder = &build_gradient_triangle_vertices,
	.indexed_builder = &build_gradient_triangle_indexed_vertices,
	.secondary_indexed_builder = &build_gradient_triangle_secondary_indexed_vertices,
	.outline_builder = &build_gradient_triangle_outline_vertices,
};

constexpr OpenGLSceneCatalogEntry kConstellationCatalog{
	.scene_kind = OpenGLSceneKind::Constellation,
	.label = "constellation",
	.triangle_builder = &build_constellation_vertices,
	.indexed_builder = &build_constellation_indexed_vertices,
	.secondary_indexed_builder = &build_constellation_secondary_indexed_vertices,
	.outline_builder = &build_constellation_outline_vertices,
};

}  // namespace

const OpenGLSceneCatalogEntry& opengl_scene_catalog(OpenGLSceneKind scene_kind) {
	switch (scene_kind) {
	case OpenGLSceneKind::GradientTriangle:
		return kGradientTriangleCatalog;
	case OpenGLSceneKind::Constellation:
		return kConstellationCatalog;
	}
	return kGradientTriangleCatalog;
}

}  // namespace visual_math::opengl