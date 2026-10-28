// Estilo cartoon: sombreado por bandas (MeshToonMaterial) y contorno negro
// hecho con una copia de la pieza un poco más grande, vista por detrás.
import * as THREE from 'three';

export const TINTA = 0x1d1b24;
export const SELECCION = 0xff6a3d;

const bandas = new Uint8Array([90, 170, 255]);
const GRADIENTE = new THREE.DataTexture(bandas, bandas.length, 1, THREE.RedFormat);
GRADIENTE.minFilter = GRADIENTE.magFilter = THREE.NearestFilter;
GRADIENTE.generateMipmaps = false;
GRADIENTE.needsUpdate = true;

const cache = new Map();
export function toon(color, { propio = false, ...extra } = {}) {
  if (propio) return new THREE.MeshToonMaterial({ color, gradientMap: GRADIENTE, ...extra });
  const clave = color + JSON.stringify(extra);
  if (!cache.has(clave)) cache.set(clave, new THREE.MeshToonMaterial({ color, gradientMap: GRADIENTE, ...extra }));
  return cache.get(clave);
}

export const nuevaTinta = () => new THREE.MeshBasicMaterial({ color: TINTA, side: THREE.BackSide });

// Para formas no convexas (toros, cables): se empuja cada vértice hacia fuera.
function tintaExtruida(grosor) {
  const m = new THREE.MeshBasicMaterial({ color: TINTA, side: THREE.BackSide });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace(
      '#include <begin_vertex>',
      `vec3 transformed = vec3(position) + normal * ${grosor.toFixed(3)};`
    );
  };
  m.customProgramCacheKey = () => 'tinta-' + grosor.toFixed(3);
  return m;
}

// Fábrica de formas que comparten el material de contorno de una pieza.
export function kit(tinta, tintas) {
  function contorno(malla, g) {
    const geo = malla.geometry;
    geo.computeBoundingBox();
    const tam = new THREE.Vector3(), cen = new THREE.Vector3();
    geo.boundingBox.getSize(tam); geo.boundingBox.getCenter(cen);
    const f = s => (s > 1e-4 ? (s + 2 * g) / s : 1);
    const h = new THREE.Mesh(geo, tinta);
    h.scale.set(f(tam.x), f(tam.y), f(tam.z));
    h.position.set(cen.x * (1 - h.scale.x), cen.y * (1 - h.scale.y), cen.z * (1 - h.scale.z));
    h.userData.tinta = true;
    malla.add(h);
    return malla;
  }
  function malla(geo, color, g, opts) {
    const m = new THREE.Mesh(geo, toon(color, opts));
    m.castShadow = true; m.receiveShadow = true;
    if (g > 0) contorno(m, g);
    return m;
  }
  function conExtruida(geo, color, g, opts) {
    const m = new THREE.Mesh(geo, toon(color, opts));
    m.castShadow = true; m.receiveShadow = true;
    if (g > 0) {
      const t = tintaExtruida(g); tintas.push(t);
      const h = new THREE.Mesh(geo, t); h.userData.tinta = true;
      m.add(h); m.userData.casco = h;
    }
    return m;
  }
  return {
    caja: (w, h, d, color, g = 0.06, opts) => malla(new THREE.BoxGeometry(w, h, d), color, g, opts),
    cil: (r, h, color, g = 0.05, seg = 24, opts) => malla(new THREE.CylinderGeometry(r, r, h, seg), color, g, opts),
    cono: (r1, r2, h, color, g = 0.05, seg = 24) => malla(new THREE.CylinderGeometry(r1, r2, h, seg), color, g),
    esfera: (r, color, g = 0.05, opts) => malla(new THREE.SphereGeometry(r, 24, 16), color, g, opts),
    toro: (R, r, color, g = 0.07) => conExtruida(new THREE.TorusGeometry(R, r, 14, 40), color, g),
    tubo: (curva, r, color, g = 0.07, segs = 80) => conExtruida(new THREE.TubeGeometry(curva, segs, r, 10, false), color, g),
  };
}

// Cambia la geometría de un tubo (y de su contorno).
export function cambiarGeometria(malla, geo) {
  malla.geometry.dispose();
  malla.geometry = geo;
  if (malla.userData.casco) malla.userData.casco.geometry = geo;
}
