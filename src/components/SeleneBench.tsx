import { useEffect, useRef, useState } from "react";
import { DEFAULTS, PRESETS, type Params } from "../sim/constants";
import { Engine, type Snapshot } from "../sim/engine";

export default function SeleneBench() {
  const ref = useRef<HTMLDivElement>(null);
  const eng = useRef<Engine | null>(null);
  const [p, setP] = useState<Params>({ ...DEFAULTS });
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const e = new Engine(ref.current, setSnap);
    eng.current = e;
    return () => e.dispose();
  }, []);

  function change(key: keyof Params, val: number, reset = false) {
    const next = { ...p, [key]: val };
    setP(next);
    eng.current?.setParams(next, reset);
  }

  function loadPreset(partial: Partial<Params>) {
    const next = { ...DEFAULTS, ...partial };
    setP(next);
    eng.current?.setParams(next, true);
  }

  const m = snap?.metrics;

  return (
    <div className="app">
      <header>
        <h1>Selene</h1>
        <div>
          <button onClick={() => eng.current?.toggle()}>
            {snap?.paused ? "Play" : "Pause"}
          </button>
          <button onClick={() => eng.current?.reset()}>Reset</button>
        </div>
      </header>

      <div className="body">
        <div className="view" ref={ref}>
          <div className="hud">
            <div>Dist: {m ? Math.round(m.dist).toLocaleString() + " km" : "—"}</div>
            <div>Speed: {m ? m.speed.toFixed(1) + " km/h" : "—"}</div>
            <div>Period: {m?.period ? m.period.toFixed(1) + " d" : "—"}</div>
            <div>Ecc: {m ? m.ecc.toFixed(3) : "—"}</div>
            {m?.eclipse !== "none" && <div className="ecl">{m.eclipse}</div>}
            {snap?.hit && <div className="hit">impact @ {Math.round(snap.hitSpeed)} km/h</div>}
          </div>
        </div>

        <div className="side">
          <section>
            <h3>presets</h3>
            <div className="btns">
              {PRESETS.map((pr) => (
                <button key={pr.name} onClick={() => loadPreset(pr.params)}>
                  {pr.name}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3>params</h3>
            <label>
              speed × {p.speedMul.toFixed(2)}
              <input type="range" min={0} max={2} step={0.05} value={p.speedMul}
                onChange={(e) => change("speedMul", +e.target.value, true)} />
            </label>
            <label>
              distance × {p.distMul.toFixed(2)}
              <input type="range" min={0.4} max={2.5} step={0.05} value={p.distMul}
                onChange={(e) => change("distMul", +e.target.value, true)} />
            </label>
            <label>
              G × {p.gMul.toFixed(1)}
              <input type="range" min={0.2} max={5} step={0.1} value={p.gMul}
                onChange={(e) => change("gMul", +e.target.value)} />
            </label>
            <label>
              time scale {p.hoursPerSecond} h/s
              <input type="range" min={1} max={120} step={1} value={p.hoursPerSecond}
                onChange={(e) => change("hoursPerSecond", +e.target.value)} />
            </label>
            <label>
              sun angle {p.sunAzimuth}°
              <input type="range" min={0} max={360} step={5} value={p.sunAzimuth}
                onChange={(e) => change("sunAzimuth", +e.target.value)} />
            </label>
          </section>
        </div>
      </div>
    </div>
  );
}
