cmake_minimum_required(VERSION 4.3.3)

project(visual_math_vulkan VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

find_package(Vulkan REQUIRED COMPONENTS glslc)
find_package(glfw3 CONFIG REQUIRED)

set(VISUAL_MATH_VULKAN_SHADER_DIR ${CMAKE_CURRENT_BINARY_DIR}/shaders)
set(VISUAL_MATH_VULKAN_SHADER_SOURCES
	${CMAKE_CURRENT_SOURCE_DIR}/shaders/gradient_triangle.vert
	${CMAKE_CURRENT_SOURCE_DIR}/shaders/gradient_triangle.frag
	${CMAKE_CURRENT_SOURCE_DIR}/shaders/indexed_polygon.frag
)
set(VISUAL_MATH_VULKAN_SHADER_OUTPUTS)

foreach(shader_source ${VISUAL_MATH_VULKAN_SHADER_SOURCES})
	get_filename_component(shader_name ${shader_source} NAME)
	set(shader_output ${VISUAL_MATH_VULKAN_SHADER_DIR}/${shader_name}.spv)
	add_custom_command(
		OUTPUT ${shader_output}
		COMMAND ${CMAKE_COMMAND} -E make_directory ${VISUAL_MATH_VULKAN_SHADER_DIR}
		COMMAND $<TARGET_FILE:Vulkan::glslc> ${shader_source} -o ${shader_output}
		DEPENDS ${shader_source}
		COMMENT "Compiling ${shader_name} to SPIR-V"
		VERBATIM
	)
	list(APPEND VISUAL_MATH_VULKAN_SHADER_OUTPUTS ${shader_output})
endforeach()

add_custom_target(visual_math_vulkan_shaders ALL DEPENDS ${VISUAL_MATH_VULKAN_SHADER_OUTPUTS})

add_library(
	visual_math_vulkan_core
	STATIC
	include/visual_math_vulkan/gradient_triangle_scene.hpp
	include/visual_math_vulkan/launch_options.hpp
	include/visual_math_vulkan/vulkan_app.hpp
	src/gradient_triangle_scene.cpp
	src/launch_options.cpp
	src/vulkan_app.cpp
)
target_include_directories(visual_math_vulkan_core PUBLIC include)
target_link_libraries(visual_math_vulkan_core PUBLIC Vulkan::Vulkan glfw)

add_executable(visual_math_vulkan src/visual_math_vulkan.cpp)
set_target_properties(visual_math_vulkan PROPERTIES OUTPUT_NAME visual_math_vulkan)
target_link_libraries(visual_math_vulkan PRIVATE visual_math_vulkan_core)
add_dependencies(visual_math_vulkan visual_math_vulkan_shaders)

enable_testing()
find_package(GTest CONFIG REQUIRED)

add_executable(tests test/visual_math_vulkan_test.cpp)
target_link_libraries(
	tests
	PRIVATE visual_math_vulkan_core GTest::gtest GTest::gtest_main
)

include(GoogleTest)
gtest_discover_tests(tests DISCOVERY_TIMEOUT 30)
