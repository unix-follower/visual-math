#include "visual_math_opengl/renderer_configuration.hpp"
#include "visual_math_opengl/shader_assets.hpp"

namespace visual_math::opengl {
namespace {

constexpr std::size_t kVertexShaderIndex = 0;
constexpr std::size_t kFragmentShaderIndex = 1;
constexpr std::size_t kIndexedFragmentShaderIndex = 2;

}  // namespace

RendererConfiguration make_renderer_configuration(OpenGLSceneKind scene_kind) {
	const OpenGLSceneCatalogEntry& scene_catalog = opengl_scene_catalog(scene_kind);
	return {
		{{
			{ProgramSlot::Base, kOpenGLShaderAssetNames[kVertexShaderIndex], kOpenGLShaderAssetNames[kFragmentShaderIndex], false},
			{ProgramSlot::Indexed, kOpenGLShaderAssetNames[kVertexShaderIndex], kOpenGLShaderAssetNames[kIndexedFragmentShaderIndex], true},
		}},
		{{
			{ProgramSlot::Base, GeometrySlot::Triangle, DrawPrimitive::Triangles, 3, false},
			{ProgramSlot::Indexed, GeometrySlot::Indexed, DrawPrimitive::Triangles, 6, true},
			{ProgramSlot::Indexed, GeometrySlot::SecondaryIndexed, DrawPrimitive::Triangles, 6, true},
			{ProgramSlot::Base, GeometrySlot::Outline, DrawPrimitive::LineStrip, 4, false},
		}},
		{{
			{GeometrySlot::Triangle, false, false, nullptr, nullptr, scene_catalog.triangle_builder},
			{GeometrySlot::Indexed, true, true, nullptr, scene_catalog.indexed_builder, nullptr},
			{GeometrySlot::SecondaryIndexed, true, true, nullptr, scene_catalog.secondary_indexed_builder, nullptr},
			{GeometrySlot::Outline, false, false, scene_catalog.outline_builder, nullptr, nullptr},
		}},
	};
}

}  // namespace visual_math::opengl