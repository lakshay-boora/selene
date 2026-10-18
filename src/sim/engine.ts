import * as THREE from "three";
import { DEFAULTS, type Params } from "./constants";
import { metrics, earthR, moonR, initialState, step, type Metrics, type State } from "./physics";

export type Snapshot = {
  metrics: Metrics;
  t: number;
  hit: boolean;
  hitSpeed: number;
  paused: boolean;
};

export class Engine {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  private raf = 0;
  private el: HTMLElement;
  private cb?: (s: Snapshot) => void;

  private earth: THREE.Mesh;
  private moon: THREE.Mesh;
  private light: THREE.DirectionalLight;
  private trail: THREE.Line;
  private trailBuf: Float32Array;
  private trailIdx = 0;

  state: State;
  params: Params = { ...DEFAULTS };
  paused = false;

  private camDist = 750000;
  private yaw = 0.4;
  private pitch = 0.25;
  private drag = false;
  private lastX = 0;
  private lastY = 0;

  constructor(container: HTMLElement, onUpdate?: (s: Snapshot) => void) {
    this.el = container;
    this.cb = onUpdate;
    this.state = initialState(this.params);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 50, 5e7);

    this.scene.add(new THREE.AmbientLight(0x1a1a22));
    this.light = new THREE.DirectionalLight(0xffffff, 2.2);
    this.scene.add(this.light);

    // simple stars
    const geo = new THREE.BufferGeometry();
    const pts = new Float32Array(1200 * 3);
    for (let i = 0; i < pts.length; i++) pts[i] = (Math.random() - 0.5) * 1.5e7;
    geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    this.scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x778899, size: 1.2 })));

    const sph = new THREE.SphereGeometry(1, 40, 28);
    this.earth = new THREE.Mesh(sph, new THREE.MeshStandardMaterial({ color: 0x1a3a8a, roughness: 0.75 }));
    this.scene.add(this.earth);

    this.moon = new THREE.Mesh(sph, new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.95 }));
    this.scene.add(this.moon);

    // trail
    this.trailBuf = new Float32Array(1200 * 3);
    const tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute("position", new THREE.BufferAttribute(this.trailBuf, 3));
    this.trail = new THREE.Line(tGeo, new THREE.LineBasicMaterial({ color: 0x4477aa, transparent: true, opacity: 0.45 }));
    this.scene.add(this.trail);

    this.setupInput();
    window.addEventListener("resize", this.onResize);
    this.tick();
  }

  private setupInput() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener("mousedown", (e) => {
      this.drag = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    window.addEventListener("mousemove", (e) => {
      if (!this.drag) return;
      this.yaw -= (e.clientX - this.lastX) * 0.005;
      this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch + (e.clientY - this.lastY) * 0.005));
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    window.addEventListener("mouseup", () => (this.drag = false));
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.camDist *= e.deltaY > 0 ? 1.12 : 0.89;
      this.camDist = Math.max(20000, Math.min(2.5e6, this.camDist));
    }, { passive: false });
  }

  private onResize = () => {
    const w = this.el.clientWidth;
    const h = this.el.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  setParams(p: Params, reset = false) {
    this.params = { ...p };
    if (reset) {
      this.state = initialState(this.params);
      this.trailIdx = 0;
      this.trailBuf.fill(0);
      (this.trail.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      this.trail.geometry.setDrawRange(0, 0);
    }
  }

  toggle() {
    this.paused = !this.paused;
  }

  reset() {
    this.setParams(this.params, true);
  }

  private tick = () => {
    this.raf = requestAnimationFrame(this.tick);

    if (!this.paused && !this.state.hit) {
      const dt = 0.016 * this.params.hoursPerSecond;
      this.state = step(this.state, this.params, dt);
    }

    const re = earthR(this.params);
    const rm = moonR(this.params);

    this.earth.position.set(this.state.earth.pos.x, this.state.earth.pos.y, this.state.earth.pos.z);
    this.earth.scale.setScalar(re);
    this.moon.position.set(this.state.moon.pos.x, this.state.moon.pos.y, this.state.moon.pos.z);
    this.moon.scale.setScalar(rm);

    const a = (this.params.sunAzimuth * Math.PI) / 180;
    this.light.position.set(Math.cos(a) * 8e5, Math.sin(a) * 8e5, 1.5e5);

    if (!this.state.hit) {
      const i = (this.trailIdx % 1200) * 3;
      this.trailBuf[i] = this.state.moon.pos.x;
      this.trailBuf[i + 1] = this.state.moon.pos.y;
      this.trailBuf[i + 2] = this.state.moon.pos.z;
      this.trailIdx++;
      (this.trail.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      this.trail.geometry.setDrawRange(0, Math.min(this.trailIdx, 1200));
    }

    // orbit cam
    const cp = Math.cos(this.pitch);
    this.camera.position.set(
      cp * Math.cos(this.yaw) * this.camDist,
      cp * Math.sin(this.yaw) * this.camDist,
      Math.sin(this.pitch) * this.camDist
    );
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);

    if (this.cb) {
      this.cb({
        metrics: metrics(this.state, this.params),
        t: this.state.t,
        hit: this.state.hit,
        hitSpeed: this.state.hitSpeed,
        paused: this.paused,
      });
    }
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    this.renderer.dispose();
    this.el.innerHTML = "";
  }
}
