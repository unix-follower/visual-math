#version 410 core
layout(location = 0) in vec2 inPosition;
layout(location = 1) in vec4 inColor;

uniform mat4 uTransform;

out vec4 fragColor;

void main() {
  gl_Position = uTransform * vec4(inPosition, 0.0, 1.0);
  fragColor = inColor;
}