#include "visual_math_opengl/gl_app.hpp"
#include "visual_math_opengl/gl_program_helpers.hpp"
#include "visual_math_opengl/gl_resource_helpers.hpp"
#include "visual_math_opengl/gradient_triangle_scene.hpp"
#include "visual_math_opengl/launch_options.hpp"
#include "visual_math_opengl/renderer_configuration.hpp"
#include "visual_math_opengl/scene_catalog.hpp"

#include <gtest/gtest.h>

#include <array>
#include <filesystem>
#include <fstream>
#include <string>
#include <string_view>

namespace visual_math::opengl {
namespace {

TEST(GradientTriangleSceneTest, AcceptsDefaultScene) {
	EXPECT_TRUE(is_valid_gradient_triangle_scene(kDefaultGradientTriangleScene));
}

TEST(GradientTriangleSceneTest, RejectsOutOfRangeValues) {
	GradientTriangleScene scene = kDefaultGradientTriangleScene;
	scene.material_luminance_response = 1.4F;
	EXPECT_FALSE(is_valid_gradient_triangle_scene(scene));
}

TEST(GradientTriangleSceneTest, BuildsExpectedPeakColor) {
	const RgbaColor peak = gradient_triangle_peak_color(kDefaultGradientTriangleScene);
	EXPECT_NEAR(peak.red, 0.4076F, 0.0001F);
	EXPECT_NEAR(peak.green, 0.2916F, 0.0001F);
	EXPECT_NEAR(peak.blue, 0.2580F, 0.0001F);
	EXPECT_FLOAT_EQ(peak.alpha, 1.0F);
}

TEST(GradientTriangleSceneTest, BuildsUniformTransformMatrix) {
	GradientTriangleScene scene = kDefaultGradientTriangleScene;
	scene.scale = 1.0F;
	scene.rotation_degrees = 90.0F;
	scene.animation_speed = 0.0F;
	scene.material_pulse_speed = 0.0F;

	const SceneTransformUniform transform = build_gradient_triangle_transform(scene);

	EXPECT_NEAR(transform.transform[0], 0.0F, 0.0001F);
	EXPECT_NEAR(transform.transform[1], 1.0F, 0.0001F);
	EXPECT_NEAR(transform.transform[4], -1.0F, 0.0001F);
	EXPECT_NEAR(transform.transform[5], 0.0F, 0.0001F);
	EXPECT_FLOAT_EQ(transform.transform[15], 1.0F);
	EXPECT_NEAR(transform.indexed_material[0], 0.46F, 0.0001F);
	EXPECT_NEAR(transform.indexed_material[1], 0.15F, 0.0001F);
	EXPECT_NEAR(transform.indexed_material[2], scene.accent, 0.0001F);
	EXPECT_NEAR(transform.indexed_material[3], 0.5F, 0.0001F);
	EXPECT_NEAR(transform.indexed_material_tuning[0], scene.material_palette_bias, 0.0001F);
	EXPECT_NEAR(transform.indexed_material_tuning[1], scene.material_alpha_floor, 0.0001F);
	EXPECT_NEAR(transform.indexed_material_tuning[2], scene.material_luminance_response, 0.0001F);
}

TEST(GradientTriangleSceneTest, BuildsCanonicalVerticesAndOutline) {
	const auto vertices = build_gradient_triangle_vertices(kDefaultGradientTriangleScene);
	const auto indexed_vertices = build_gradient_triangle_indexed_vertices(kDefaultGradientTriangleScene);
	const auto secondary_indexed_vertices = build_gradient_triangle_secondary_indexed_vertices(kDefaultGradientTriangleScene);
	const auto indices = build_gradient_triangle_indices(kDefaultGradientTriangleScene);
	const auto outline = build_gradient_triangle_outline_vertices(kDefaultGradientTriangleScene);

	EXPECT_NEAR(vertices[0].x, -0.55F, 0.0001F);
	EXPECT_NEAR(vertices[0].y, -0.42F, 0.0001F);
	EXPECT_NEAR(vertices[2].x, 0.0F, 0.0001F);
	EXPECT_NEAR(vertices[2].y, 0.64F, 0.0001F);
	EXPECT_EQ(indexed_vertices.size(), 4U);
	EXPECT_EQ(secondary_indexed_vertices.size(), 4U);
	EXPECT_EQ(indices.size(), 6U);
	EXPECT_EQ(indices[0], 0U);
	EXPECT_EQ(indices[5], 3U);
	EXPECT_NEAR(indexed_vertices[1].y, 0.48F, 0.0001F);
	EXPECT_NEAR(secondary_indexed_vertices[0].x, -0.66F, 0.0001F);
	EXPECT_NEAR(secondary_indexed_vertices[1].y, 0.72F, 0.0001F);
	EXPECT_NEAR(outline.front().x, outline.back().x, 0.0001F);
	EXPECT_NEAR(outline.front().y, outline.back().y, 0.0001F);
}

TEST(OpenGLSceneCatalogTest, ResolvesSceneBuildersOutsideGLApp) {
	const auto& gradient_catalog = opengl_scene_catalog(OpenGLSceneKind::GradientTriangle);
	const auto& constellation_catalog = opengl_scene_catalog(OpenGLSceneKind::Constellation);

	EXPECT_EQ(gradient_catalog.label, "gradient-triangle");
	EXPECT_EQ(constellation_catalog.label, "constellation");

	const auto gradient_vertices = gradient_catalog.triangle_builder(kDefaultGradientTriangleScene);
	const auto constellation_vertices = constellation_catalog.triangle_builder(kDefaultGradientTriangleScene);

	EXPECT_NEAR(gradient_vertices[0].x, -0.55F, 0.0001F);
	EXPECT_NEAR(constellation_vertices[0].x, -0.74F, 0.0001F);
	EXPECT_NE(gradient_catalog.triangle_builder, constellation_catalog.triangle_builder);
	EXPECT_NE(gradient_catalog.outline_builder, constellation_catalog.outline_builder);
}

TEST(OpenGLRendererConfigurationTest, BuildsStableConfigWithoutGLAppMembers) {
	const RendererConfiguration configuration = make_renderer_configuration(OpenGLSceneKind::Constellation);

	EXPECT_EQ(configuration.programs[0].slot, ProgramSlot::Base);
	EXPECT_EQ(configuration.programs[1].slot, ProgramSlot::Indexed);
	EXPECT_EQ(configuration.draw_passes[0].geometry_slot, GeometrySlot::Triangle);
	EXPECT_EQ(configuration.draw_passes[3].primitive, DrawPrimitive::LineStrip);
	EXPECT_EQ(configuration.geometries[1].slot, GeometrySlot::Indexed);
	ASSERT_NE(configuration.geometries[0].vertex_builder_triangle, nullptr);
	ASSERT_NE(configuration.geometries[3].vertex_builder_outline, nullptr);
	const auto constellation_vertices = configuration.geometries[0].vertex_builder_triangle(kDefaultGradientTriangleScene);
	EXPECT_NEAR(constellation_vertices[0].x, -0.74F, 0.0001F);
}

TEST(OpenGLResourceHelpersTest, ResolvesRuntimeGeometryBySlot) {
	GLGeometryRuntime runtime;
	geometry_resource(runtime, GeometrySlot::Triangle).vertex_array = 11U;
	geometry_resource(runtime, GeometrySlot::Indexed).vertex_array = 22U;
	geometry_resource(runtime, GeometrySlot::SecondaryIndexed).vertex_array = 33U;
	geometry_resource(runtime, GeometrySlot::Outline).vertex_array = 44U;

	EXPECT_EQ(runtime.triangle.vertex_array, 11U);
	EXPECT_EQ(runtime.indexed.vertex_array, 22U);
	EXPECT_EQ(runtime.secondary_indexed.vertex_array, 33U);
	EXPECT_EQ(runtime.outline.vertex_array, 44U);
}

TEST(OpenGLProgramHelpersTest, ResetsZeroInitializedProgramsSafely) {
	std::array<ProgramRuntimeState, 2> programs{};

	destroy_renderer_programs(programs);

	EXPECT_EQ(programs[0].handle, 0U);
	EXPECT_EQ(programs[1].handle, 0U);
	EXPECT_EQ(programs[0].uniforms.transform, -1);
	EXPECT_EQ(programs[1].uniforms.indexed_material, -1);
}

TEST(GLAppTest, DescribesTheCurrentBootstrapStage) {
	const std::string summary = GLApp{}.startup_summary();
	EXPECT_NE(summary.find("Phase 8 OpenGL is complete"), std::string::npos);
	EXPECT_NE(summary.find("scene/config layer"), std::string::npos);
	EXPECT_NE(summary.find("two indexed overlays"), std::string::npos);
	EXPECT_NE(summary.find("outline"), std::string::npos);
	EXPECT_NE(summary.find("dedicated indexed material path"), std::string::npos);
	EXPECT_NE(summary.find("GLSL shader assets"), std::string::npos);
	EXPECT_NE(summary.find("externalized renderer program configuration"), std::string::npos);
	EXPECT_NE(summary.find("externalized pass-resource configuration"), std::string::npos);
	EXPECT_NE(summary.find("extracted renderer configuration model"), std::string::npos);
	EXPECT_NE(summary.find("externalized scene catalog"), std::string::npos);
	EXPECT_NE(summary.find("externalized GL resource helpers"), std::string::npos);
	EXPECT_NE(summary.find("externalized GL program helpers"), std::string::npos);
	EXPECT_NE(summary.find("Scene kind gradient-triangle"), std::string::npos);
	EXPECT_NE(summary.find("material luminance response"), std::string::npos);
}

TEST(GLAppTest, SupportsConstellationSceneSummary) {
	const std::string summary = GLApp{"", kDefaultGradientTriangleScene, OpenGLSceneKind::Constellation}.startup_summary();
	EXPECT_NE(summary.find("Scene kind constellation"), std::string::npos);
}

TEST(GLAppTest, ResolvesShaderDirectoryFromExecutablePath) {
	const std::filesystem::path executable{"/tmp/visual-math-opengl/build/visual_math_opengl"};
	EXPECT_EQ(
		resolve_opengl_shader_directory(executable),
		std::filesystem::path{"/tmp/visual-math-opengl/build/shaders"});
}

TEST(GLAppTest, EnumeratesExpectedShaderAssetsForExecutablePath) {
	const std::filesystem::path executable = std::filesystem::current_path() / "visual_math_opengl";
	const auto shader_assets = opengl_shader_asset_paths(executable);

	EXPECT_EQ(shader_assets[0].filename(), "gradient_triangle.vert");
	EXPECT_EQ(shader_assets[1].filename(), "gradient_triangle.frag");
	EXPECT_EQ(shader_assets[2].filename(), "indexed_polygon.frag");

	for (const auto& asset : shader_assets) {
		EXPECT_TRUE(std::filesystem::exists(asset)) << asset.string();
		std::ifstream file(asset);
		ASSERT_TRUE(file.is_open()) << asset.string();
	}

	std::ifstream vertex_file(shader_assets[0]);
	ASSERT_TRUE(vertex_file.is_open()) << shader_assets[0].string();
	std::string first_line;
	std::getline(vertex_file, first_line);
	EXPECT_NE(first_line.find("#version 410 core"), std::string::npos);
}

TEST(GLAppTest, ReportsRuntimeStatsAvailabilityBeforeRun) {
	const std::string summary = GLApp{}.runtime_summary();
	EXPECT_NE(summary.find("not available"), std::string::npos);
}

TEST(OpenGLLaunchOptionsTest, ParsesFrameLimitAndSceneOverrides) {
	const std::array arguments{
		std::string_view{"--frames=3"},
		std::string_view{"--scene-kind=constellation"},
		std::string_view{"--scene-scale=1.1"},
		std::string_view{"--scene-rotation=45"},
		std::string_view{"--animation-speed=30"},
		std::string_view{"--material-pulse-speed=2.5"},
		std::string_view{"--material-pulse-intensity=0.4"},
		std::string_view{"--material-palette-bias=0.65"},
		std::string_view{"--material-alpha-floor=0.78"},
		std::string_view{"--material-luminance-response=0.3"},
		std::string_view{"--scene-accent=0.5"},
		std::string_view{"--clear-blue=0.25"},
	};
	OpenGLLaunchOptions options;
	std::string error_message;

	EXPECT_TRUE(parse_opengl_launch_options(arguments, options, error_message));
	EXPECT_TRUE(error_message.empty());
	EXPECT_EQ(options.max_frames, 3U);
	EXPECT_EQ(options.scene_kind, OpenGLSceneKind::Constellation);
	EXPECT_FLOAT_EQ(options.scene.scale, 1.1F);
	EXPECT_FLOAT_EQ(options.scene.rotation_degrees, 45.0F);
	EXPECT_FLOAT_EQ(options.scene.animation_speed, 30.0F);
	EXPECT_FLOAT_EQ(options.scene.material_pulse_speed, 2.5F);
	EXPECT_FLOAT_EQ(options.scene.material_pulse_intensity, 0.4F);
	EXPECT_FLOAT_EQ(options.scene.material_palette_bias, 0.65F);
	EXPECT_FLOAT_EQ(options.scene.material_alpha_floor, 0.78F);
	EXPECT_FLOAT_EQ(options.scene.material_luminance_response, 0.3F);
	EXPECT_FLOAT_EQ(options.scene.accent, 0.5F);
	EXPECT_FLOAT_EQ(options.scene.blue, 0.25F);
}

TEST(OpenGLLaunchOptionsTest, RejectsInvalidSceneOverrides) {
	const std::array arguments{std::string_view{"--scene-scale=9.0"}};
	OpenGLLaunchOptions options;
	std::string error_message;

	EXPECT_FALSE(parse_opengl_launch_options(arguments, options, error_message));
	EXPECT_NE(error_message.find("invalid gradient triangle scene"), std::string::npos);
}

TEST(OpenGLLaunchOptionsTest, RejectsInvalidSceneKind) {
	const std::array arguments{std::string_view{"--scene-kind=unknown"}};
	OpenGLLaunchOptions options;
	std::string error_message;

	EXPECT_FALSE(parse_opengl_launch_options(arguments, options, error_message));
	EXPECT_NE(error_message.find("Invalid value for --scene-kind."), std::string::npos);
}

}  // namespace
}  // namespace visual_math::opengl
