#version 410 core
in vec4 fragColor;

uniform vec4 uIndexedMaterial;
uniform vec4 uIndexedMaterialTuning;

out vec4 outColor;

void main() {
  float luminance = dot(fragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float alphaBoost = uIndexedMaterial.y;
  float accent = uIndexedMaterial.z;
  float pulseStrength = uIndexedMaterial.w;
  float paletteBias = clamp(uIndexedMaterialTuning.x, 0.0, 1.0);
  float alphaFloor = clamp(uIndexedMaterialTuning.y, 0.0, 1.0);
  float luminanceResponse = clamp(uIndexedMaterialTuning.z, 0.0, 1.0);
  float highlightMix = clamp(uIndexedMaterial.x + luminanceResponse * luminance, 0.0, 1.0);
  vec3 basePulseColor = mix(vec3(1.0, 0.86, 0.42), vec3(0.45, 0.76, 0.96), paletteBias);
  vec3 peakPulseColor = mix(vec3(0.96, 0.52, 0.18), vec3(0.18, 0.55, 0.92), paletteBias);
  vec3 pulseColor = mix(basePulseColor, peakPulseColor, accent * pulseStrength);
  vec3 highlight = mix(fragColor.rgb, pulseColor, highlightMix);
  outColor = vec4(highlight, clamp(max(alphaFloor, fragColor.a + alphaBoost), 0.0, 1.0));
}