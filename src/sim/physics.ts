import { GM_EARTH, GM_MOON, REAL, type Params } from "./constants";

export type V3 = { x: number; y: number; z: number };

export function v3(x = 0, y = 0, z = 0): V3 {
  return { x, y, z };
}

export type Body = {
  pos: V3;
  vel: V3;
};

export type State = {
  earth: Body;
  moon: Body;
  t: number; // hours
  hit: boolean;
  hitSpeed: number;
};

export type Metrics = {
  dist: number;
  speed: number;
  period: number;
  ecc: number;
  eclipse: "none" | "solar" | "lunar";
};

export function earthR(p: Params) {
  return REAL.R_EARTH * p.earthRadMul;
}

export function moonR(p: Params) {
  return REAL.R_MOON * p.moonRadMul;
}

export function initialState(p: Params): State {
  const r0 = REAL.DIST * p.distMul;
  const mu = GM_EARTH * p.gMul * p.earthMassMul;
  let v = Math.sqrt(mu / Math.max(r0, 1)) * p.speedMul;
  const inc = (p.inclination * Math.PI) / 180;

  const mE = REAL.M_EARTH * p.earthMassMul;
  const mM = REAL.M_MOON * p.moonMassMul;
  const tot = mE + mM;

  // barycenter
  const re = (mM / tot) * r0;
  const rm = (mE / tot) * r0;

  return {
    earth: {
      pos: v3(-re, 0, 0),
      vel: v3(0, -v * (mM / tot) * Math.cos(inc), -v * (mM / tot) * Math.sin(inc)),
    },
    moon: {
      pos: v3(rm * Math.cos(inc), 0, rm * Math.sin(inc)),
      vel: v3(0, v * (mE / tot) * Math.cos(inc), v * (mE / tot) * Math.sin(inc)),
    },
    t: 0,
    hit: false,
    hitSpeed: 0,
  };
}

export function step(state: State, p: Params, dt: number): State {
  if (state.hit) return state;

  const muE = GM_EARTH * p.gMul * p.earthMassMul;
  const muM = GM_MOON * p.gMul * p.moonMassMul;
  const col = earthR(p) + moonR(p);

  // more steps when close
  const dx = state.moon.pos.x - state.earth.pos.x;
  const dy = state.moon.pos.y - state.earth.pos.y;
  const dz = state.moon.pos.z - state.earth.pos.z;
  const d = Math.hypot(dx, dy, dz);
  const n = d < col * 2 ? 20 : d < col * 5 ? 6 : 2;
  const h = dt / n;

  let ePos = { ...state.earth.pos };
  let eVel = { ...state.earth.vel };
  let mPos = { ...state.moon.pos };
  let mVel = { ...state.moon.vel };

  for (let i = 0; i < n; i++) {
    const rx = mPos.x - ePos.x;
    const ry = mPos.y - ePos.y;
    const rz = mPos.z - ePos.z;
    const r = Math.hypot(rx, ry, rz);

    if (r <= col) {
      const vx = mVel.x - eVel.x;
      const vy = mVel.y - eVel.y;
      const vz = mVel.z - eVel.z;
      return {
        ...state,
        earth: { pos: ePos, vel: eVel },
        moon: { pos: mPos, vel: mVel },
        hit: true,
        hitSpeed: Math.hypot(vx, vy, vz),
      };
    }

    const inv = 1 / (r * r * r);
    const aMx = -muE * rx * inv;
    const aMy = -muE * ry * inv;
    const aMz = -muE * rz * inv;
    const aEx = muM * rx * inv;
    const aEy = muM * ry * inv;
    const aEz = muM * rz * inv;

    // simple euler for now (good enough)
    mVel.x += aMx * h;
    mVel.y += aMy * h;
    mVel.z += aMz * h;
    mPos.x += mVel.x * h;
    mPos.y += mVel.y * h;
    mPos.z += mVel.z * h;

    eVel.x += aEx * h;
    eVel.y += aEy * h;
    eVel.z += aEz * h;
    ePos.x += eVel.x * h;
    ePos.y += eVel.y * h;
    ePos.z += eVel.z * h;
  }

  return {
    ...state,
    earth: { pos: ePos, vel: eVel },
    moon: { pos: mPos, vel: mVel },
    t: state.t + dt,
  };
}

export function metrics(state: State, p: Params): Metrics {
  const rx = state.moon.pos.x - state.earth.pos.x;
  const ry = state.moon.pos.y - state.earth.pos.y;
  const rz = state.moon.pos.z - state.earth.pos.z;
  const dist = Math.hypot(rx, ry, rz);

  const vx = state.moon.vel.x - state.earth.vel.x;
  const vy = state.moon.vel.y - state.earth.vel.y;
  const vz = state.moon.vel.z - state.earth.vel.z;
  const speed = Math.hypot(vx, vy, vz);

  const mu = GM_EARTH * p.gMul * p.earthMassMul;
  const energy = 0.5 * speed * speed - mu / dist;

  let period = 0;
  let ecc = 0;

  if (energy < 0) {
    const a = -mu / (2 * energy);
    const hx = ry * vz - rz * vy;
    const hy = rz * vx - rx * vz;
    const hz = rx * vy - ry * vx;
    const h2 = hx * hx + hy * hy + hz * hz;
    ecc = Math.sqrt(Math.max(0, 1 - h2 / (a * mu)));
    period = (2 * Math.PI * Math.sqrt((a * a * a) / mu)) / 24;
  }

  // rough eclipse check
  const ang = (p.sunAzimuth * Math.PI) / 180;
  const sx = Math.cos(ang);
  const sy = Math.sin(ang);
  const mx = rx / dist;
  const my = ry / dist;
  const align = sx * mx + sy * my;

  let eclipse: "none" | "solar" | "lunar" = "none";
  if (align > 0.997) eclipse = "solar";
  if (align < -0.997) eclipse = "lunar";

  return { dist, speed, period, ecc, eclipse };
}
