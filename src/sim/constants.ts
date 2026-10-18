// real numbers (approx)
export const REAL = {
  G: 6.6743e-11,
  M_EARTH: 5.972e24,
  M_MOON: 7.342e22,
  R_EARTH: 6371, // km
  R_MOON: 1737.4,
  DIST: 384400,
  PERIOD_DAYS: 27.32,
};

// convert G so we can work in km and hours
const G_km_h = REAL.G * 1e-9 * 3600 * 3600;
export const GM_EARTH = G_km_h * REAL.M_EARTH;
export const GM_MOON = G_km_h * REAL.M_MOON;

export type Params = {
  gMul: number;
  earthMassMul: number;
  moonMassMul: number;
  earthRadMul: number;
  moonRadMul: number;
  distMul: number;
  speedMul: number;
  inclination: number;
  sunAzimuth: number;
  hoursPerSecond: number;
};

export const DEFAULTS: Params = {
  gMul: 1,
  earthMassMul: 1,
  moonMassMul: 1,
  earthRadMul: 1,
  moonRadMul: 1,
  distMul: 1,
  speedMul: 1,
  inclination: 5.14,
  sunAzimuth: 0,
  hoursPerSecond: 48,
};

export const PRESETS = [
  { name: "Real scale", params: { ...DEFAULTS } },
  { name: "Solar eclipse", params: { distMul: 0.95, sunAzimuth: 0, inclination: 0.1, hoursPerSecond: 16 } },
  { name: "Lunar eclipse", params: { sunAzimuth: 180, inclination: 0.2, hoursPerSecond: 20 } },
  { name: "Just drop it", params: { speedMul: 0, hoursPerSecond: 8, inclination: 0 } },
  { name: "Escape", params: { speedMul: 1.5, hoursPerSecond: 60 } },
];
