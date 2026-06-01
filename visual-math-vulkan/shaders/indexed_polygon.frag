#version 450

layout(set = 0, binding = 0) uniform SceneTransform {
  mat4 transform;
  vec4 indexedMaterial;
  vec4 indexedMaterialTuning;
} sceneTransform;

layout(location = 0) in vec4 fragColor;
layout(location = 0) out vec4 outColor;

void main() {
  float luminance = dot(fragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float alphaBoost = sceneTransform.indexedMaterial.y;
  float accent = sceneTransform.indexedMaterial.z;
  float pulseStrength = sceneTransform.indexedMaterial.w;
  float paletteBias = clamp(sceneTransform.indexedMaterialTuning.x, 0.0, 1.0);
  float alphaFloor = clamp(sceneTransform.indexedMaterialTuning.y, 0.0, 1.0);
  float luminanceResponse = clamp(sceneTransform.indexedMaterialTuning.z, 0.0, 1.0);
  float highlightMix = clamp(sceneTransform.indexedMaterial.x + luminanceResponse * luminance, 0.0, 1.0);
  vec3 basePulseColor = mix(vec3(1.0, 0.86, 0.42), vec3(0.45, 0.76, 0.96), paletteBias);
  vec3 peakPulseColor = mix(vec3(0.96, 0.52, 0.18), vec3(0.18, 0.55, 0.92), paletteBias);
  vec3 pulseColor = mix(basePulseColor, peakPulseColor, accent * pulseStrength);
  vec3 highlight = mix(fragColor.rgb, pulseColor, highlightMix);
  outColor = vec4(highlight, clamp(max(alphaFloor, fragColor.a + alphaBoost), 0.0, 1.0));
}
