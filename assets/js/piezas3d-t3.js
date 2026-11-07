// piezas3d-t3.js — Piezas del Tema 3 (ensamblado): herramientas, tornillos, cables de la fuente,
// panel frontal (F_PANEL) y LED de diagnóstico. Mismo sistema que piezas3d.js: 1 unidad = 1 cm,
// medidas en mm y cada subpieza con userData.parte para poder tocarla.
// Ojo: aquí no se usa nada de piezas3d.js fuera de las funciones (los dos ficheros se importan entre sí).
import * as THREE from 'three';
import { caja, cilindro, mat, C } from './piezas3d.js';

const mm = v => v / 10;
const marcar = (obj, parte) => { obj.traverse(o => { if (o.isMesh) { o.userData.parte = parte; o.castShadow = true; } }); return obj; };

// Rosca: anillos finos a lo largo de la caña (eje Y), separados por el paso de rosca
function rosca(g, r, largo, paso, y0, color, parte) {
  for (let y = y0 + paso / 2; y < y0 + largo; y += paso) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(mm(r), mm(Math.min(0.35, paso * 0.3)), 6, 20), mat(color, { metalness: 0.8, roughness: 0.35 }));
    t.rotation.x = Math.PI / 2; t.position.y = mm(y); t.userData.parte = parte; g.add(t);
  }
}

/* ---------- Herramientas y útiles ---------- */
export function herramientas() {
  const g = new THREE.Group(); g.name = 'herram';
  const destornillador = (x, y, largoMango, rMango, largoCana, rCana, color, parte) => {
    cilindro(g, rMango, largoMango, color, x + largoMango / 2, y, 0, 'x', parte, { roughness: 0.5 });
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      cilindro(g, 1.6, largoMango * 0.8, 0x1d1b24, x + largoMango / 2, y + Math.cos(a) * rMango, Math.sin(a) * rMango, 'x', parte);
    }
    cilindro(g, rCana, largoCana, C.metal, x + largoMango + largoCana / 2, y, 0, 'x', parte, { metalness: 0.8, roughness: 0.3 });
    const punta = new THREE.Mesh(new THREE.ConeGeometry(mm(rCana * 1.1), mm(rCana * 3), 4), mat(C.metal, { metalness: 0.8 }));
    punta.rotation.z = -Math.PI / 2; punta.position.set(mm(x + largoMango + largoCana + rCana * 1.5), mm(y), 0); punta.userData.parte = parte; g.add(punta);
  };
  destornillador(-150, 60, 100, 15, 110, 3, 0xe5484d, 'ph2');
  destornillador(-150, 20, 70, 10, 70, 1.8, 0x3b82f6, 'ph1');
  // Pulsera antiestática: muñequera, cable en espiral y pinza
  const banda = new THREE.Mesh(new THREE.TorusGeometry(mm(32), mm(7), 10, 36), mat(0x2b2a33, { roughness: 0.8 }));
  banda.position.set(mm(-110), mm(-45), 0); banda.userData.parte = 'pulsera'; g.add(banda);
  caja(g, 22, 16, 12, C.metal, -121, -16, -6, 'pulsera', { metalness: 0.8 });
  const espiral = new THREE.CatmullRomCurve3(Array.from({ length: 40 }, (_, i) => new THREE.Vector3(mm(-100 + i * 3.2), mm(-12 + Math.sin(i * 1.3) * 5), mm(Math.cos(i * 1.3) * 5))));
  const cable = new THREE.Mesh(new THREE.TubeGeometry(espiral, 160, mm(1.4), 6), mat(0xe5484d)); cable.userData.parte = 'pulsera'; g.add(cable);
  caja(g, 34, 10, 10, 0xe5484d, 28, -18, -5, 'pulsera');
  caja(g, 14, 4, 12, C.metal, 60, -16, -6, 'pulsera', { metalness: 0.8 });
  // Bandeja de tornillos con unos tornillos dentro
  caja(g, 80, 6, 60, 0x9aa3b2, 90, -70, -30, 'bandeja', { roughness: 0.7 });
  for (const [x, z] of [[105, -12], [118, 6], [132, -4], [150, 14], [158, -16]]) cilindro(g, 3, 2, C.metal, x, -61, z, 'y', 'bandeja', { metalness: 0.9 });
  // Pinzas de plástico
  const pinza = new THREE.Group(); pinza.position.set(mm(110), mm(50), 0); pinza.rotation.z = -0.4; g.add(pinza);
  caja(pinza, 90, 5, 6, 0xffd23f, 0, 3, -3, 'pinzas'); caja(pinza, 90, 5, 6, 0xffd23f, 0, -8, -3, 'pinzas'); caja(pinza, 12, 16, 6, 0xffd23f, -4, -8, -3, 'pinzas');
  // Bridas
  for (let i = 0; i < 3; i++) caja(g, 4, 110, 1.5, 0xf4f1ea, 40 + i * 10, -100, 30, 'bridas');
  // Pasta térmica (jeringa)
  cilindro(g, 7, 70, 0x9aa3b2, 170, 30, 0, 'x', 'pasta', { roughness: 0.4 });
  cilindro(g, 2.5, 18, 0x9aa3b2, 214, 30, 0, 'x', 'pasta');
  // Alcohol isopropílico
  cilindro(g, 18, 80, 0xf4f1ea, 210, -55, 0, 'y', 'alcohol', { roughness: 0.3 });
  cilindro(g, 8, 18, 0x3b82f6, 210, -6, 0, 'y', 'alcohol');
  g.userData = { tipo: 'herram' };
  return g;
}

/* ---------- Tornillos 6-32, M3, M2 y separador ---------- */
export function tornillos() {
  const g = new THREE.Group(); g.name = 'tornillos';
  const tornillo = (x, rCabeza, altoCabeza, hex, rCana, largo, paso, parte) => {
    const t = new THREE.Group(); t.position.x = mm(x); g.add(t);
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(mm(rCabeza), mm(rCabeza), mm(altoCabeza), hex ? 6 : 28), mat(C.metal, { metalness: 0.85, roughness: 0.3 }));
    cab.position.y = mm(largo + altoCabeza / 2); cab.userData.parte = parte; t.add(cab);
    // cruz de la cabeza
    caja(t, rCabeza * 1.2, 0.6, rCabeza * 0.28, 0x1d1b24, -rCabeza * 0.6, largo + altoCabeza, -rCabeza * 0.14, parte);
    caja(t, rCabeza * 0.28, 0.6, rCabeza * 1.2, 0x1d1b24, -rCabeza * 0.14, largo + altoCabeza, -rCabeza * 0.6, parte);
    const cana = new THREE.Mesh(new THREE.CylinderGeometry(mm(rCana * 0.85), mm(rCana * 0.85), mm(largo), 16), mat(C.metal, { metalness: 0.85, roughness: 0.3 }));
    cana.position.y = mm(largo / 2); cana.userData.parte = parte; t.add(cana);
    rosca(t, rCana * 0.88, largo, paso, 0, C.metal, parte);
    return t;
  };
  // tamaños reales aproximados (6-32: 3,5 mm de diámetro y 32 hilos por pulgada; M3: 3 mm, paso 0,5; M2: 2 mm, paso 0,4)
  tornillo(-30, 4.0, 2.6, true, 1.75, 6, 0.79, '632');
  tornillo(-10, 3.0, 2.0, false, 1.5, 5, 0.5, 'm3');
  tornillo(6, 2.0, 1.4, false, 1.0, 3, 0.4, 'm2');
  // Separador: cuerpo hexagonal con rosca hembra arriba y macho abajo
  const s = new THREE.Group(); s.position.x = mm(24); g.add(s);
  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(mm(2.75), mm(2.75), mm(6), 6), mat(0xd6aa4e, { metalness: 0.8, roughness: 0.35 }));
  cuerpo.position.y = mm(5 + 3); cuerpo.userData.parte = 'separador'; s.add(cuerpo);
  const agujero = new THREE.Mesh(new THREE.CylinderGeometry(mm(1.3), mm(1.3), mm(0.4), 16), mat(0x1d1b24)); agujero.position.y = mm(11.05); agujero.userData.parte = 'separador'; s.add(agujero);
  const macho = new THREE.Mesh(new THREE.CylinderGeometry(mm(1.5), mm(1.5), mm(5), 16), mat(0xd6aa4e, { metalness: 0.8 })); macho.position.y = mm(2.5); macho.userData.parte = 'separador'; s.add(macho);
  rosca(s, 1.55, 5, 0.79, 0, 0xd6aa4e, 'separador');
  g.userData = { tipo: 'tornillos' };
  return g;
}

/* ---------- Conectores de la fuente ---------- */
function conector(g, x, y, cols, filas, paso, parte, { color = 0x1d1b24, cables = [], ancho, alto, hueco = [] } = {}) {
  const w = ancho || cols * paso + 3, h = alto || filas * paso + 3;
  caja(g, w, h, 12, color, x, y, 0, parte);
  for (let c = 0; c < cols; c++) for (let f = 0; f < filas; f++) {
    if (hueco.some(([hc, hf]) => hc === c && hf === f)) continue;
    caja(g, paso * 0.55, paso * 0.55, 0.6, 0x0b0b0d, x + 1.5 + c * paso + paso * 0.22, y + 1.5 + f * paso + paso * 0.22, 12, parte);
  }
  // pestaña de enganche
  caja(g, Math.min(8, w * 0.4), 2.5, 4, color, x + w / 2 - Math.min(8, w * 0.4) / 2, y + h, 4, parte);
  // cables por detrás
  cables.forEach((col, i) => {
    const n = cables.length, cx = x + (i + 0.5) * (w / n);
    cilindro(g, 1.3, 60, col, cx, y + h / 2, -30, 'z', parte);
  });
  return { w, h };
}
export function cablesFuente() {
  const g = new THREE.Group(); g.name = 'cables';
  const Am = 0xffd23f, Ro = 0xe5484d, Na = 0xff8a3d, Ne = 0x2b2a33, Mo = 0x8b6fe0, Ve = 0x3fbf6a, Gr = 0x9aa3b2;
  // ATX de 24 pines (2 × 12)
  conector(g, -120, -20, 2, 12, 4.2, 'atx24', { cables: [Na, Am, Ro, Ne, Mo, Gr, Ve, Ne, Ro, Ne, Am, Na], ancho: 12, alto: 52 });
  // EPS 4+4
  conector(g, -90, 10, 2, 2, 4.2, 'eps', { cables: [Am, Am, Ne, Ne] });
  conector(g, -78, 10, 2, 2, 4.2, 'eps', { cables: [Am, Am, Ne, Ne] });
  // PCIe 6+2
  conector(g, -90, -30, 3, 2, 4.2, 'pcie', { cables: [Am, Am, Am, Ne, Ne, Ne] });
  conector(g, -75, -30, 1, 2, 4.2, 'pcie', { cables: [Ne, Ne] });
  // 12V-2x6: 12 pines grandes y 4 pequeños de señal encima
  conector(g, -50, -30, 6, 2, 3.0, '12v2x6', { cables: Array(12).fill(Am).map((c, i) => i % 2 ? Ne : c) });
  caja(g, 12, 3, 12, 0x1d1b24, -50, -18, 0, '12v2x6');
  // SATA de alimentación: plano en L, 15 contactos
  caja(g, 24, 5, 12, 0x1d1b24, -45, 15, 0, 'sata-corriente'); caja(g, 3, 8, 12, 0x1d1b24, -45, 15, 0, 'sata-corriente');
  [Am, Ne, Ro, Ne, Na].forEach((c, i) => cilindro(g, 1.1, 50, c, -42 + i * 4.5, 17.5, -25, 'z', 'sata-corriente'));
  // SATA de datos: más pequeño, 7 contactos, cable plano rojo
  caja(g, 13, 4, 10, 0xe5484d, -10, 15, 0, 'sata-datos'); caja(g, 2.5, 6, 10, 0xe5484d, -10, 15, 0, 'sata-datos');
  caja(g, 8, 1, 60, 0xe5484d, -8, 16.5, -60, 'sata-datos');
  // Molex: 4 pines redondos en una carcasa blanca
  caja(g, 22, 9, 14, 0xf4f1ea, -10, -30, 0, 'molex');
  [Am, Ne, Ne, Ro].forEach((c, i) => { cilindro(g, 1.2, 1, 0x7a7f88, -6 + i * 4.8, -25.5, 14.2, 'z', 'molex'); cilindro(g, 1.3, 55, c, -6 + i * 4.8, -25.5, -27, 'z', 'molex'); });
  g.position.x = mm(40);
  const raiz = new THREE.Group(); raiz.add(g); raiz.userData = { tipo: 'cables' };
  return raiz;
}

/* ---------- Panel frontal: cabezal F_PANEL y cables de la caja ---------- */
export function fpanel() {
  const g = new THREE.Group(); g.name = 'fpanel';
  caja(g, 60, 40, 1.6, C.pcb, -30, -20, -1.6, 'pcb', { roughness: 0.75 });
  // Cabezal de 2 × 5 patillas (falta una arriba a la derecha). Arriba: PLED+, PLED−, PWR, PWR, (sin patilla). Abajo: HDD+, HDD−, RST, RST, libre
  const P = 2.54, X0 = -6, Y0 = -2;
  const partes = [['pled', 'pled', 'pwr', 'pwr', null], ['hdd', 'hdd', 'rst', 'rst', 'libre']];
  caja(g, 5 * P + 1, 2 * P + 1, 2.5, 0x1d1b24, X0 - 0.5, Y0 - 0.5, 0, 'cabezal');
  partes.forEach((fila, f) => fila.forEach((p, c) => {
    if (!p) return;
    caja(g, 0.64, 0.64, 8.5, C.oro, X0 + c * P + P / 2 - 0.32, Y0 + (1 - f) * P + P / 2 - 0.32, 2.5, p, { metalness: 0.9, roughness: 0.3 });
  }));
  // serigrafía: un rectángulo blanco alrededor y la marca +
  caja(g, 5 * P + 4, 0.5, 0.1, 0xf4f1ea, X0 - 2, Y0 + 2 * P + 2, 0, 'cabezal');
  caja(g, 5 * P + 4, 0.5, 0.1, 0xf4f1ea, X0 - 2, Y0 - 2.5, 0, 'cabezal');
  // Conectores de los cables de la caja, flotando encima de su sitio
  // cada conector, encima de sus patillas (levantado), con sus cables saliendo hacia arriba o hacia abajo
  const cab = (x, fila, n, color, parte, colores) => {
    const y = Y0 + (1 - fila) * P, dir = fila === 0 ? 1 : -1;
    caja(g, n * P - 0.3, P - 0.3, 6, color, x + 0.15, y + 0.15, 13, parte);
    colores.forEach((c, i) => cilindro(g, 0.55, 22, c, x + P / 2 + i * P, y + P / 2 + dir * 11, 16, 'y', parte));
  };
  cab(X0, 0, 2, 0x2b2a33, 'pled', [0x3fbf6a, 0xf4f1ea]);
  cab(X0 + 2 * P, 0, 2, 0x2b2a33, 'pwr', [0xe5484d, 0xf4f1ea]);
  cab(X0, 1, 2, 0x2b2a33, 'hdd', [0xffd23f, 0xf4f1ea]);
  cab(X0 + 2 * P, 1, 2, 0x2b2a33, 'rst', [0x3b82f6, 0xf4f1ea]);
  // otros cabezales cerca: USB 3 (azul, 19 pines) y HD_AUDIO
  caja(g, 16, 6, 7, 0x3b82f6, -27, -16, 0, 'usb3');
  caja(g, 11, 5, 6, 0x1d1b24, 16, -16, 0, 'audio');
  g.userData = { tipo: 'fpanel' };
  return g;
}

/* ---------- LED de diagnóstico (CPU, DRAM, VGA, BOOT) ---------- */
export function ledsPost({ encendido = null } = {}) {
  const g = new THREE.Group(); g.name = 'postled';
  caja(g, 110, 90, 1.6, C.pcb, -55, -45, -1.6, 'pcb', { roughness: 0.75 });
  // Ranuras de memoria y conector de 24 pines, para situarse
  for (let i = 0; i < 4; i++) caja(g, 6, 80, 8, i % 2 ? C.ranuraGris : C.ranura, -45 + i * 9, -40, 0, 'dimm');
  caja(g, 10, 52, 12, C.blanco, 30, -26, 0, 'atx24');
  // Los cuatro LED con su serigrafía
  const LED = [['led-cpu', 0xe5484d], ['led-dram', 0xffd23f], ['led-vga', 0xf4f1ea], ['led-boot', 0x3fbf6a]];
  LED.forEach(([p, color], i) => {
    const on = encendido === p;
    caja(g, 3, 2, 1.4, color, 12, 24 - i * 8, 0, p, on ? { emissive: color, emissiveIntensity: 1.4 } : { transparent: true, opacity: 0.75 });
    caja(g, 9, 2, 0.1, 0xf4f1ea, 17, 24 - i * 8, 0, p);
  });
  // Puente CLR_CMOS y pila
  caja(g, 2, 2, 6, C.oro, 40, 36, 0, 'clrcmos', { metalness: 0.9 }); caja(g, 2, 2, 6, C.oro, 43.5, 36, 0, 'clrcmos', { metalness: 0.9 });
  cilindro(g, 10, 3.2, C.metal, 35, -38 + 10, 1.6, 'z', 'pila', { metalness: 0.9, roughness: 0.25 });
  g.userData = { tipo: 'postled' };
  return g;
}

export function piezaTema3(cat, datos = {}) {
  switch (cat) {
    case 'herram': return herramientas();
    case 'tornillos': return tornillos();
    case 'cables': return cablesFuente();
    case 'fpanel': return fpanel();
    case 'postled': return ledsPost(datos);
    default: return null;
  }
}
