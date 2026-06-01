#include "visual_math_opengl/gl_app.hpp"
#include "visual_math_opengl/launch_options.hpp"

#include <cstdlib>
#include <iostream>
#include <string>
#include <string_view>
#include <vector>

int main(int argc, char** argv) {
	std::vector<std::string_view> arguments;
	arguments.reserve(static_cast<std::size_t>(std::max(argc - 1, 0)));
	for (int index = 1; index < argc; ++index) {
		arguments.emplace_back(argv[index]);
	}

	visual_math::opengl::OpenGLLaunchOptions options;
	std::string error_message;
	if (!visual_math::opengl::parse_opengl_launch_options(arguments, options, error_message)) {
		std::cerr << error_message << '\n';
		return EXIT_FAILURE;
	}

	visual_math::opengl::GLApp app(argc > 0 ? argv[0] : "", options.scene, options.scene_kind);
	std::cout << app.startup_summary() << '\n';
	app.run(options.max_frames);
	std::cout << app.runtime_summary() << '\n';
	return EXIT_SUCCESS;
}
