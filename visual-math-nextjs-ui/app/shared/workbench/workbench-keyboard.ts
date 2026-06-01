export function stepNumericValue(
  value: number,
  delta: number,
  clamp: (value: number) => number,
): number {
  return clamp(value + delta)
}
