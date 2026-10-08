/** Normalized illustrative profile, not surveyed elevation or navigable geometry. */
export function courseProfile(values: readonly number[], distanceKm: number) {
  if (values.length < 2 || !Number.isFinite(distanceKm) || distanceKm <= 0 ||
      values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
    return null;
  }
  const points = values.map((value, index) => ({
    x: index / (values.length - 1) * 600,
    y: 156 - value * 128,
  }));
  const line = points.map(({ x, y }, index) => `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  return { line, area: `${line} L600,180 L0,180 Z`, distanceKm };
}

export function sectionWindow(startKm: number, endKm: number, distanceKm: number) {
  if (![startKm, endKm, distanceKm].every(Number.isFinite) || distanceKm <= 0 ||
      startKm < 0 || endKm > distanceKm || endKm <= startKm) return null;
  return { x: startKm / distanceKm * 600, width: (endKm - startKm) / distanceKm * 600 };
}
