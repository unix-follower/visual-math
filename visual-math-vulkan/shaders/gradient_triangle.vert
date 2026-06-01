#version 450

layout(location = 0) in vec2 inPosition;
layout(location = 1) in vec4 inColor;
layout(set = 0, binding = 0) uniform SceneTransform {
  mat4 transform;
  vec4 indexedMaterial;
  vec4 indexedMaterialTuning;
} sceneTransform;

layout(location = 0) out vec4 fragColor;

void main() {
  gl_Position = sceneTransform.transform * vec4(inPosition, 0.0, 1.0);
  fragColor = inColor;
}