// visor3d.js — Visor 3D reutilizable (un único contexto WebGL por vista).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let GLTFLoaderMod = null;
async function cargarGLB(url) {
  if (!GLTFLoaderMod) GLTFLoaderMod = await import('three/addons/loaders/GLTFLoader.js');
  const loader = new GLTFLoaderMod.GLTFLoader();
  return new Promise((ok, ko) => loader.load(url, g => ok(g.scene), undefined, ko));
}

export function webglDisponible() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch (e) { return false; }
}

export class Visor {
  constructor(contenedor, { autoRotar = false, alTocar = null } = {}) {
    this.cont = contenedor;
    this.alTocar = alTocar;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    contenedor.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label', 'Vista 3D: arrastra para girar, rueda o pellizca para acercar');
    this.renderer.domElement.tabIndex = 0;

    this.escena = new THREE.Scene();
    this.camara = new THREE.PerspectiveCamera(35, 1, 0.1, 500);
    this.camara.position.set(30, 22, 45);
    this.escena.add(new THREE.HemisphereLight(0xfff6e8, 0x5a5f6a, 1.15));
    const sol = new THREE.DirectionalLight(0xffffff, 1.6);
    sol.position.set(25, 40, 30); sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    Object.assign(sol.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40 });
    this.escena.add(sol);
    const relleno = new THREE.DirectionalLight(0xbfd4ff, 0.5); relleno.position.set(-30, 10, -20); this.escena.add(relleno);

    this.controles = new OrbitControls(this.camara, this.renderer.domElement);
    this.controles.enableDamping = true;
    this.controles.autoRotate = autoRotar;
    this.controles.autoRotateSpeed = 0.8;
    this.controles.addEventListener('start', () => { this.controles.autoRotate = false; });

    this.raiz = new THREE.Group(); this.escena.add(this.raiz);
    this.resaltados = [];
    this.raycaster = new THREE.Raycaster();
    this._pulsado = null;
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', e => { this._pulsado = [e.clientX, e.clientY]; });
    el.addEventListener('pointerup', e => {
      if (!this._pulsado) return;
      const [x, y] = this._pulsado; this._pulsado = null;
      if (Math.hypot(e.clientX - x, e.clientY - y) < 6) this._tocar(e);
    });

    this._ro = new ResizeObserver(() => this._ajustar());
    this._ro.observe(contenedor);
    this._visible = true;
    this._io = new IntersectionObserver(es => { this._visible = es[0].isIntersecting; });
    this._io.observe(contenedor);
    this._t0 = performance.now();
    const bucle = () => {
      this._raf = requestAnimationFrame(bucle);
      if (!this._visible || document.hidden) return;
      const t = (performance.now() - this._t0) / 1000;
      this.raiz.traverse(o => { if (o.userData.gira) o.rotation.z = t * 6; });
      this.controles.update();
      this.renderer.render(this.escena, this.camara);
    };
    this._ajustar(); bucle();
  }

  _ajustar() {
    const w = this.cont.clientWidth || 300, h = this.cont.clientHeight || 300;
    this.renderer.setSize(w, h, false);
    this.camara.aspect = w / h; this.camara.updateProjectionMatrix();
  }

  /** Sustituye lo que se ve por `objeto` y encuadra la cámara. */
  mostrar(objeto, { vista = 'frente', mantenerCamara = false } = {}) {
    this.raiz.clear(); this.resaltados = [];
    if (!objeto) return;
    this.raiz.add(objeto);
    if (mantenerCamara && this._encuadrado) return;
    this.encuadrar(vista);
  }

  encuadrar(vista = 'frente') {
    const box = new THREE.Box3().setFromObject(this.raiz);
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3());
    const r = box.getSize(new THREE.Vector3()).length() / 2;
    const dist = r / Math.sin((this.camara.fov * Math.PI / 180) / 2) * 0.95;
    const dir = vista === 'arriba' ? new THREE.Vector3(0.25, 0.9, 0.55) : new THREE.Vector3(0.45, 0.35, 1);
    this.camara.position.copy(c).add(dir.normalize().multiplyScalar(dist));
    this.camara.near = dist / 100; this.camara.far = dist * 10; this.camara.updateProjectionMatrix();
    this.controles.target.copy(c);
    this.controles.minDistance = r * 0.3; this.controles.maxDistance = dist * 2.5;
    this.controles.update();
    this._encuadrado = true;
  }

  /** Carga un .glb (modelo descargado) y lo escala para que su lado mayor mida `tamano` cm. */
  async mostrarGLB(url, { tamano = 20, rotacion = [0, 0, 0] } = {}) {
    const obj = await cargarGLB(url);
    const box = new THREE.Box3().setFromObject(obj);
    const s = box.getSize(new THREE.Vector3());
    const k = tamano / Math.max(s.x, s.y, s.z);
    obj.scale.setScalar(k);
    obj.rotation.set(...rotacion.map(g => g * Math.PI / 180));
    const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
    obj.position.sub(c);
    obj.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    this.mostrar(obj);
    return obj;
  }

  /** Ilumina las mallas cuya userData.parte coincide. */
  resaltar(parte) {
    this.resaltados.forEach(([m, mOrig]) => { m.material = mOrig; });
    this.resaltados = [];
    if (!parte) return;
    this.raiz.traverse(o => {
      if (o.isMesh && o.userData.parte === parte) {
        const copia = o.material.clone();
        copia.emissive = new THREE.Color(0xffb020); copia.emissiveIntensity = 0.55;
        this.resaltados.push([o, o.material]); o.material = copia;
      }
    });
  }

  _tocar(e) {
    if (!this.alTocar) return;
    const r = this.renderer.domElement.getBoundingClientRect();
    const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(p, this.camara);
    const hit = this.raycaster.intersectObjects(this.raiz.children, true).find(h => !h.object.userData.noTocar);
    let parte = null;
    if (hit) { let o = hit.object; while (o && !o.userData.parte) o = o.parent; parte = o ? o.userData.parte : null; }
    this.resaltar(parte);
    this.alTocar(parte);
  }

  destruir() {
    cancelAnimationFrame(this._raf);
    this._ro.disconnect(); this._io.disconnect();
    this.controles.dispose(); this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
