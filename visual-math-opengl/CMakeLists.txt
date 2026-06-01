cmake_minimum_required(VERSION 4.3.3)

project(visual_math_opengl VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

find_package(OpenGL REQUIRED)
find_package(glfw3 REQUIRED CONFIG)

set(VISUAL_MATH_OPENGL_SHADER_DIR ${CMAKE_CURRENT_BINARY_DIR}/shaders)
set(VISUAL_MATH_OPENGL_SHADER_NAMES
	gradient_triangle.vert
	gradient_triangle.frag
	indexed_polygon.frag
)
set(VISUAL_MATH_OPENGL_SHADER_SOURCES)
set(VISUAL_MATH_OPENGL_SHADER_OUTPUTS)
set(VISUAL_MATH_OPENGL_SHADER_NAME_ENTRIES)

foreach(shader_name ${VISUAL_MATH_OPENGL_SHADER_NAMES})
	set(shader_source ${CMAKE_CURRENT_SOURCE_DIR}/shaders/${shader_name})
	set(shader_output ${VISUAL_MATH_OPENGL_SHADER_DIR}/${shader_name})
	add_custom_command(
		OUTPUT ${shader_output}
		COMMAND ${CMAKE_COMMAND} -E make_directory ${VISUAL_MATH_OPENGL_SHADER_DIR}
		COMMAND ${CMAKE_COMMAND} -E copy_if_different ${shader_source} ${shader_output}
		DEPENDS ${shader_source}
		COMMENT "Copying OpenGL shader ${shader_name}"
		VERBATIM
	)
	list(APPEND VISUAL_MATH_OPENGL_SHADER_SOURCES ${shader_source})
	list(APPEND VISUAL_MATH_OPENGL_SHADER_OUTPUTS ${shader_output})
	string(APPEND VISUAL_MATH_OPENGL_SHADER_NAME_ENTRIES "\tstd::string_view{\"${shader_name}\"},\n")
endforeach()

set(VISUAL_MATH_OPENGL_GENERATED_DIR ${CMAKE_CURRENT_BINARY_DIR}/generated)
configure_file(
	${CMAKE_CURRENT_SOURCE_DIR}/cmake/shader_assets.hpp.in
	${VISUAL_MATH_OPENGL_GENERATED_DIR}/visual_math_opengl/shader_assets.hpp
	@ONLY
)

add_custom_target(visual_math_opengl_shaders ALL DEPENDS ${VISUAL_MATH_OPENGL_SHADER_OUTPUTS})

add_library(
	visual_math_opengl_core
	STATIC
		src/gl_app.cpp
		src/gl_program_helpers.cpp
		src/gl_resource_helpers.cpp
		src/gradient_triangle_scene.cpp
		src/launch_options.cpp
		src/renderer_configuration.cpp
		src/scene_catalog.cpp
)
target_include_directories(visual_math_opengl_core PUBLIC include PRIVATE ${VISUAL_MATH_OPENGL_GENERATED_DIR})
target_link_libraries(visual_math_opengl_core PUBLIC OpenGL::GL glfw)

add_executable(visual_math_opengl src/visual_math_opengl.cpp)
set_target_properties(visual_math_opengl PROPERTIES OUTPUT_NAME visual_math_opengl)
target_link_libraries(visual_math_opengl PRIVATE visual_math_opengl_core)
add_dependencies(visual_math_opengl visual_math_opengl_shaders)

enable_testing()
find_package(GTest CONFIG REQUIRED)

add_executable(tests test/visual_math_opengl_test.cpp)
target_link_libraries(
	tests
	PRIVATE visual_math_opengl_core GTest::gtest GTest::gtest_main
)

include(GoogleTest)
gtest_discover_tests(tests DISCOVERY_TIMEOUT 30)
