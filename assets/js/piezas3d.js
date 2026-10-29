// piezas3d.js — Piezas de PC generadas por código, a escala real (1 unidad = 1 cm).
// Cada pieza se construye centrada en el origen, con la cara útil hacia +Z y «arriba» hacia +Y.
// Las subpiezas llevan userData.parte (clave de content/<tema>/piezas.json) para poder tocarlas.
import * as THREE from 'three';

const C = {
  pcb: 0x2f5d4f, pcbOscuro: 0x244a3f, ranura: 0x1d2228, ranuraGris: 0x8a929c, metal: 0xb9c1c9,
  metalOscuro: 0x5e6670, oro: 0xd6aa4e, cobre: 0xc77b45, negro: 0x22262b, plastico: 0x30353c,
  blanco: 0xe9e6df, acento: 0x2b62b8, ambar: 0xe0a13a, verdeRam: 0x2f6f4f, chip: 0x16191d
};
const mats = new Map();
function mat(color, opts = {}) {
  const k = color + JSON.stringify(opts);
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...opts }));
  return mats.get(k);
}
const mm = v => v / 10;

/** Caja en mm. x,y,z = esquina mínima en mm respecto al grupo. */
function caja(g, w, h, d, color, x, y, z, parte, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(mm(w), mm(h), mm(d)), mat(color, opts));
  m.position.set(mm(x + w / 2), mm(y + h / 2), mm(z + d / 2));
  m.castShadow = m.receiveShadow = true;
  if (parte) m.userData.parte = parte;
  g.add(m); return m;
}
function cilindro(g, r, alto, color, x, y, z, eje = 'z', parte, opts, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(mm(r), mm(r), mm(alto), seg), mat(color, opts));
  if (eje === 'z') m.rotation.x = Math.PI / 2;
  if (eje === 'x') m.rotation.z = Math.PI / 2;
  m.position.set(mm(x), mm(y), mm(z));
  m.castShadow = true;
  if (parte) m.userData.parte = parte;
  g.add(m); return m;
}
function ventilador(g, diam, grosor, x, y, z, eje = 'z', parte = 'ventilador', marco = C.negro) {
  // marco cuadrado + aspas; centrado en (x,y,z) en mm
  const f = new THREE.Group();
  const r = diam / 2;
  const marcoG = new THREE.Group();
  [[0, r - 3, diam, 6], [0, -r + 3, diam, 6], [r - 3, 0, 6, diam], [-r + 3, 0, 6, diam]].forEach(([cx, cy, w, h]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(mm(w), mm(h), mm(grosor)), mat(marco));
    b.position.set(mm(cx), mm(cy), 0); marcoG.add(b);
  });
  f.add(marcoG);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(mm(r - 6), mm(1.5), 8, 40), mat(marco)); f.add(aro);
  const buje = new THREE.Mesh(new THREE.CylinderGeometry(mm(r * 0.28), mm(r * 0.28), mm(grosor * 0.9), 24), mat(C.plastico));
  buje.rotation.x = Math.PI / 2; f.add(buje);
  const aspas = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(mm(r * 0.62), mm(r * 0.22), mm(1.2)), mat(0x3a4048));
    a.position.set(mm(r * 0.55), 0, 0); a.rotation.x = 0.35;
    const piv = new THREE.Group(); piv.rotation.z = (i / 7) * Math.PI * 2; piv.add(a); aspas.add(piv);
  }
  aspas.userData.gira = true; f.add(aspas);
  f.traverse(o => { if (o.isMesh) { o.userData.parte = parte; o.castShadow = true; } });
  if (eje === 'x') f.rotation.y = Math.PI / 2;
  if (eje === 'y') f.rotation.x = Math.PI / 2;
  f.position.set(mm(x), mm(y), mm(z));
  g.add(f); return f;
}

// ---------------- PLACA BASE ----------------
// Coordenadas de diseño en mm desde la esquina superior izquierda (panel trasero a la izquierda),
// x hacia la derecha, y hacia abajo. Se convierten a coordenadas 3D centradas.
const DISENOS = {
  'ATX': { w: 244, h: 305, socket: [85, 72], dimm: { x: 150, n: 4, y: 20 }, pcie16: [140, 220], pcie1: [170], m2: [[60, 112], [60, 200]],
    atx24: [228, 70], eps: [22, 4], chipset: [160, 235], sata: [226, 225], pila: [130, 190], bios: [125, 260], fpanel: [205, 292], cpufan: [118, 8] },
  'MicroATX': { w: 244, h: 244, socket: [85, 72], dimm: { x: 150, n: 4, y: 20 }, pcie16: [140], pcie1: [170, 205], m2: [[60, 112]],
    atx24: [228, 70], eps: [22, 4], chipset: [160, 180], sata: [226, 175], pila: [130, 190], bios: [100, 222], fpanel: [205, 232], cpufan: [118, 8] },
  'Mini-ITX': { w: 170, h: 170, socket: [72, 62], dimm: { x: 128, n: 2, y: 14 }, pcie16: [150], pcie1: [], m2: [[24, 118]],
    atx24: [156, 60], eps: [20, 4], chipset: [118, 120], sata: [155, 125], pila: [26, 102], bios: [104, 142], fpanel: [128, 160], cpufan: [104, 6] }
};

export function placa(formato = 'ATX', opts = {}) {
  const D = DISENOS[formato] || DISENOS.ATX;
  const g = new THREE.Group(); g.name = 'placa';
  // Contenedor con origen en la esquina superior izquierda (y hacia abajo → usamos -y)
  const L = new THREE.Group(); g.add(L);
  L.position.set(-mm(D.w) / 2, mm(D.h) / 2, 0);
  const b = (w, h, d, color, x, y, z, parte, o) => caja(L, w, h, d, color, x, -y - h, z, parte, o);

  b(D.w, D.h, 1.6, C.pcb, 0, 0, -1.6, 'pcb', { roughness: 0.75 });
  // pistas decorativas
  for (let i = 0; i < 14; i++) b(0.6, D.h * 0.6 * Math.random() + 20, 0.05, C.pcbOscuro, 12 + i * (D.w - 24) / 14, D.h * 0.3 * Math.random() + 10, 0, null);

  // panel trasero (I/O)
  b(18, Math.min(160, D.h * 0.62), 24, C.metalOscuro, -4, 8, 0, 'io', { metalness: 0.5 });
  for (let i = 0; i < 6; i++) b(6, 12, 3, i % 2 ? C.acento : C.negro, -6, 16 + i * 22, 6, 'io');

  // VRM con disipadores
  b(18, 82, 14, C.metalOscuro, D.socket[0] - 62, D.socket[1] - 50, 0, 'vrm', { metalness: 0.6, roughness: 0.4 });
  b(70, 14, 14, C.metalOscuro, D.socket[0] - 40, D.socket[1] - 64, 0, 'vrm', { metalness: 0.6, roughness: 0.4 });

  // socket
  const [sx, sy] = D.socket;
  b(48, 48, 5, C.metal, sx - 24, sy - 24, 0, 'socket', { metalness: 0.7, roughness: 0.3 });
  b(38, 38, 5.5, C.negro, sx - 19, sy - 19, 0, 'socket');
  b(3, 46, 3, C.metal, sx + 26, sy - 23, 1, 'socket', { metalness: 0.8 }); // palanca
  if (opts.conCpu !== false && opts.cpu) {
    const cpuG = cpu(); cpuG.position.set(mm(sx), -mm(sy), mm(5.5)); L.add(cpuG);
  }

  // ranuras DIMM (verticales)
  for (let i = 0; i < D.dimm.n; i++) {
    const x = D.dimm.x + i * 9;
    b(6, 140, 8, i % 2 ? C.ranuraGris : C.ranura, x, D.dimm.y, 0, 'dimm');
    b(7, 6, 10, C.blanco, x - 0.5, D.dimm.y - 4, 0, 'dimm');
    b(7, 6, 10, C.blanco, x - 0.5, D.dimm.y + 138, 0, 'dimm');
  }
  // conectores de alimentación
  b(10, 52, 12, C.blanco, D.atx24[0], D.atx24[1], 0, 'atx24');
  b(20, 8, 12, C.blanco, D.eps[0], D.eps[1], 0, 'eps');
  b(10, 4, 8, C.blanco, D.cpufan[0], D.cpufan[1], 0, 'cpufan');

  // ranuras PCIe (horizontales, desde el borde trasero)
  D.pcie16.forEach(y => { b(89, 7, 10, C.ranura, 30, y, 0, 'pcie16'); b(8, 7, 11, C.metal, 30, y, 0, 'pcie16', { metalness: 0.8 }); });
  D.pcie1.forEach(y => b(25, 7, 10, C.ranura, 30, y, 0, 'pcie1'));

  // M.2
  D.m2.forEach(([x, y]) => { b(8, 22, 5, C.negro, x, y, 0, 'm2'); b(5, 5, 4, C.oro, x + 80 - 2.5, y + 8.5, 0, 'm2', { metalness: 0.9 }); });
  // chipset, SATA, pila, BIOS, F_PANEL
  b(42, 42, 9, C.metalOscuro, D.chipset[0], D.chipset[1], 0, 'chipset', { metalness: 0.6, roughness: 0.35 });
  for (let i = 0; i < 4; i++) b(14, 8, 8, C.negro, D.sata[0], D.sata[1] + i * 11, 0, 'sata');
  const pila = cilindro(L, 10, 3.2, C.metal, D.pila[0] + 10, -D.pila[1] - 10, 1.6, 'z', 'pila', { metalness: 0.9, roughness: 0.25 });
  b(10, 10, 2, C.chip, D.bios[0], D.bios[1], 0, 'bios');
  b(26, 6, 7, C.negro, D.fpanel[0], D.fpanel[1], 0, 'fpanel');

  g.userData = { tipo: 'placa', formato, diseno: D };
  return g;
}

/** Posición (en el grupo de la placa, en cm) de un punto de diseño en mm. */
export function puntoPlaca(formato, x, y) {
  const D = DISENOS[formato] || DISENOS.ATX;
  return new THREE.Vector3(mm(x - D.w / 2), mm(D.h / 2 - y), 0);
}
export function disenoPlaca(formato) { return DISENOS[formato] || DISENOS.ATX; }

// ---------------- PROCESADOR ----------------
export function cpu() {
  const g = new THREE.Group(); g.name = 'cpu';
  caja(g, 40, 40, 1.4, 0x2e6b46, -20, -20, 0, 'sustrato');
  caja(g, 32, 32, 2.6, C.metal, -16, -16, 1.4, 'ihs', { metalness: 0.85, roughness: 0.25 });
  const tri = new THREE.Mesh(new THREE.CircleGeometry(mm(4), 3), mat(C.oro, { metalness: 0.9, roughness: 0.2 }));
  tri.position.set(mm(-17), mm(-17), mm(1.45)); tri.rotation.z = Math.PI / 6 + Math.PI; tri.userData.parte = 'triangulo'; g.add(tri);
  g.userData = { tipo: 'cpu' };
  return g;
}

// ---------------- REFRIGERACIÓN ----------------
export function refri(tipo = 'torre') {
  const g = new THREE.Group(); g.name = 'refri';
  if (tipo === 'serie') {
    caja(g, 70, 70, 10, C.metalOscuro, -35, -35, 0, 'base', { metalness: 0.6 });
    for (let i = 0; i < 12; i++) caja(g, 2, 70, 22, C.metal, -33 + i * 6, -35, 10, 'aletas', { metalness: 0.7 });
    ventilador(g, 70, 15, 0, 0, 40, 'z');
  } else if (tipo === 'perfil-bajo') {
    caja(g, 40, 40, 6, C.cobre, -20, -20, 0, 'base', { metalness: 0.8 });
    for (let i = 0; i < 16; i++) caja(g, 1.2, 95, 16, C.metal, -47 + i * 6, -47, 6, 'aletas', { metalness: 0.7 });
    ventilador(g, 92, 14, 0, 0, 30, 'z');
  } else if (tipo === 'liquida') {
    cilindro(g, 32, 18, C.negro, 0, 0, 9, 'z', 'base');
    cilindro(g, 26, 2, C.acento, 0, 0, 19, 'z', 'base', { emissive: 0x112244 });
    [-10, 10].forEach(x => {
      const t = cilindro(g, 5, 90, C.negro, x, 70, 18, 'y', 'heatpipes'); t.rotation.z = 0;
    });
  } else {
    const alto = tipo === 'doble' ? 165 : 155;
    caja(g, 40, 40, 8, C.cobre, -20, -20, 0, 'base', { metalness: 0.85, roughness: 0.3 });
    [-12, -4, 4, 12].forEach(x => cilindro(g, 3, alto - 10, C.cobre, x, 0, 8 + (alto - 10) / 2, 'z', 'heatpipes', { metalness: 0.85, roughness: 0.3 }));
    const n = 34;
    for (let i = 0; i < n; i++) caja(g, 125, tipo === 'doble' ? 120 : 52, 0.8, C.metal, -62.5, tipo === 'doble' ? -60 : -26, 30 + i * ((alto - 34) / n), 'aletas', { metalness: 0.75, roughness: 0.35 });
    ventilador(g, 120, 25, 0, -26 - 14, 30 + (alto - 34) / 2, 'y');
  }
  g.userData = { tipo: 'refri', variante: tipo };
  return g;
}

// ---------------- RAM ----------------
// De pie: largo en X (133 mm), alto en Y (31 mm), grosor en Z.
export function ram(formato = 'DIMM', gen = 'DDR5') {
  const g = new THREE.Group(); g.name = 'ram';
  const largo = formato === 'SO-DIMM' ? 69.6 : 133.35;
  const muesca = gen === 'DDR4' ? largo * 0.55 : (gen === 'DDR5' ? largo * 0.47 : largo * 0.42);
  // placa con hueco en la muesca
  caja(g, muesca - 1.5, 31, 1.2, C.verdeRam, -largo / 2, 0, -0.6, 'chips');
  caja(g, largo - muesca - 1.5, 31, 1.2, C.verdeRam, -largo / 2 + muesca + 1.5, 0, -0.6, 'chips');
  caja(g, 3, 27, 1.2, C.verdeRam, -largo / 2 + muesca - 1.5, 4, -0.6, 'chips');
  // contactos
  caja(g, muesca - 3, 4, 1.3, C.oro, -largo / 2 + 1.5, 0.3, -0.65, 'contactos', { metalness: 0.9, roughness: 0.2 });
  caja(g, largo - muesca - 3, 4, 1.3, C.oro, -largo / 2 + muesca + 1.5, 0.3, -0.65, 'contactos', { metalness: 0.9, roughness: 0.2 });
  // disipador / chips
  if (formato === 'DIMM') {
    caja(g, largo - 4, 26, 2.2, 0x2b2f35, -largo / 2 + 2, 6, 0.6, 'chips', { metalness: 0.5 });
    caja(g, largo - 4, 26, 2.2, 0x2b2f35, -largo / 2 + 2, 6, -2.8, 'chips', { metalness: 0.5 });
    caja(g, largo - 20, 2, 2.4, C.ambar, -largo / 2 + 10, 28, 0.6, 'chips');
  } else {
    for (let i = 0; i < 4; i++) caja(g, 11, 9, 1, C.chip, -largo / 2 + 6 + i * 15, 12, 0.6, 'chips');
  }
  const marca = new THREE.Mesh(new THREE.BoxGeometry(mm(4), mm(6), mm(1.4)), mat(0xff5a3c, { emissive: 0x401008 }));
  marca.position.set(mm(-largo / 2 + muesca), mm(-1), 0); marca.userData.parte = 'muesca'; g.add(marca);
  g.userData = { tipo: 'ram', largo };
  return g;
}

// ---------------- ALMACENAMIENTO ----------------
export function ssdM2() {
  const g = new THREE.Group(); g.name = 'm2';
  caja(g, 80, 22, 0.8, 0x1b3d2e, -40, -11, 0, 'm2');
  caja(g, 3, 22, 0.9, C.oro, -40, -11, -0.05, 'm2', { metalness: 0.9 });
  caja(g, 3, 5, 1, 0x1b3d2e, -41, -2.5, 0, 'muescam2');
  [[-30, 12], [-12, 18], [10, 18]].forEach(([x, w]) => caja(g, w, 14, 1.2, C.chip, x, -7, 0.8, 'm2'));
  const et = caja(g, 50, 16, 0.2, C.blanco, -20, -8, 2.0, 'm2');
  g.userData = { tipo: 'almac', variante: 'm2' };
  return g;
}
export function ssd25() {
  const g = new THREE.Group(); g.name = 'ssd25';
  caja(g, 100, 70, 7, 0x3b4048, -50, -35, 0, 'ssd25', { metalness: 0.5, roughness: 0.4 });
  caja(g, 60, 40, 0.3, C.blanco, -30, -20, 7, 'ssd25');
  caja(g, 2, 22, 4, C.negro, 50, -20, 1.5, 'ssd25');
  g.userData = { tipo: 'almac', variante: '25' };
  return g;
}
export function almacenamiento(formato = 'M.2 2280') {
  return String(formato).startsWith('M.2') ? ssdM2() : ssd25();
}

// ---------------- TARJETA GRÁFICA ----------------
// Largo en X, alto en Y, grosor en Z (cara de ventiladores hacia +Z). Bracket en x mínima.
export function gpu(largo = 240, nVent = 2, conCable = true) {
  const g = new THREE.Group(); g.name = 'gpu';
  const alto = largo < 200 ? 69 : 112, grosor = largo < 200 ? 18 : 40;
  caja(g, largo, alto, 1.6, 0x1f3d34, -largo / 2, -alto / 2, -grosor / 2, 'conector');
  caja(g, largo - 4, alto - 6, grosor - 4, C.negro, -largo / 2 + 4, -alto / 2 + 3, -grosor / 2 + 2, 'ventiladores', { metalness: 0.3 });
  caja(g, 18, 6, 2, C.acento, largo / 2 - 30, alto / 2 - 3, grosor / 2 - 2.5, 'ventiladores');
  const d = Math.min(92, (largo - 30) / nVent - 6);
  for (let i = 0; i < nVent; i++) ventilador(g, d, 8, -largo / 2 + 20 + d / 2 + i * (d + 6), 0, grosor / 2, 'z', 'ventiladores', 0x2a2e34);
  // contactos PCIe (borde inferior)
  caja(g, 89, 8, 1.6, C.oro, -largo / 2 + 20, -alto / 2 - 8, -grosor / 2, 'conector', { metalness: 0.9 });
  // bracket con salidas
  caja(g, 2, alto + 8, grosor, C.metal, -largo / 2 - 2, -alto / 2 - 4, -grosor / 2, 'salidas', { metalness: 0.8 });
  for (let i = 0; i < 3; i++) caja(g, 3, 10, 6, C.negro, -largo / 2 - 3, -alto / 2 + 10 + i * 18, -grosor / 2 + 3, 'salidas');
  if (conCable) caja(g, 20, 8, 10, C.negro, largo / 2 - 60, alto / 2, -grosor / 2 + 10, 'alimentacion');
  g.userData = { tipo: 'gpu', largo, alto, grosor };
  return g;
}

// ---------------- FUENTE ----------------
export function fuente(formato = 'ATX') {
  const g = new THREE.Group(); g.name = 'fuente';
  const [w, h, d] = formato === 'SFX' ? [125, 63.5, 100] : [150, 86, 140];
  caja(g, w, h, d, 0x2b2f35, -w / 2, -h / 2, -d / 2, 'carcasa', { metalness: 0.4, roughness: 0.5 });
  const v = ventilador(g, Math.min(w, d) * 0.8, 6, 0, h / 2 + 1, 0, 'y', 'ventilador', 0x3a3f46);
  caja(g, 2, 14, 10, C.negro, -w / 2 - 2, -h / 2 + 8, d / 2 - 30, 'interruptor');
  caja(g, 2, 20, 26, C.negro, -w / 2 - 2, -h / 2 + 30, d / 2 - 40, 'interruptor');
  g.userData = { tipo: 'fuente', w, h, d };
  return g;
}

// ---------------- CAJA ----------------
// Vista lateral abierta: fondo (bandeja) en z mínima, parte trasera en x mínima.
const CAJAS = {
  'ATX': { prof: 440, alto: 460, ancho: 210 },
  'MicroATX': { prof: 380, alto: 400, ancho: 200 },
  'Mini-ITX': { prof: 300, alto: 250, ancho: 180 }
};
export function dimCaja(formatoMayor) { return CAJAS[formatoMayor] || CAJAS.ATX; }
export function chasis(formatoMayor = 'ATX') {
  const g = new THREE.Group(); g.name = 'caja';
  const { prof: P, alto: A, ancho: W } = dimCaja(formatoMayor);
  const x0 = -P / 2, y0 = -A / 2, z0 = -W / 2;
  caja(g, P, A, 3, 0x9aa1aa, x0, y0, z0 - 3, 'bandeja', { metalness: 0.3, roughness: 0.6 });
  // paredes semitransparentes para ver el interior desde cualquier ángulo
  const pared = { transparent: true, opacity: 0.22, metalness: 0.2, roughness: 0.5, depthWrite: false };
  [[P, 4, W, x0, y0 - 4, z0], [P, 4, W, x0, y0 + A, z0], [4, A + 8, W, x0 - 4, y0 - 4, z0], [4, A + 8, W, x0 + P, y0 - 4, z0]]
    .forEach(([w, h, d, x, y, z]) => { const m = caja(g, w, h, d, 0x6b737e, x, y, z, null, pared); m.userData.noTocar = true; m.castShadow = false; });
  // aristas del chasis
  const aristas = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(mm(P + 8), mm(A + 8), mm(W))), new THREE.LineBasicMaterial({ color: 0x4a515b }));
  aristas.position.set(0, 0, 0); g.add(aristas);
  // cubierta de la fuente (abajo)
  if (formatoMayor !== 'Mini-ITX') caja(g, P - 10, 4, W - 10, 0x30353c, x0 + 5, y0 + 92, z0 + 5, 'hueco-fuente');
  // tapas traseras de ranuras
  const nTapas = formatoMayor === 'ATX' ? 7 : formatoMayor === 'MicroATX' ? 4 : 2;
  for (let i = 0; i < nTapas; i++) caja(g, 4, 14, W * 0.7, C.metal, x0 - 4, y0 + A - 200 - i * 20.3 + (formatoMayor === 'Mini-ITX' ? 120 : 0), z0 + 4, 'ranuras', { metalness: 0.8 });
  // panel lateral de cristal (transparente)
  const vidrio = new THREE.Mesh(new THREE.BoxGeometry(mm(P), mm(A), mm(3)),
    new THREE.MeshPhysicalMaterial({ color: 0xcfe3ff, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0, depthWrite: false }));
  vidrio.position.set(0, 0, mm(W / 2 + 2)); vidrio.userData.noTocar = true; g.add(vidrio);
  // ventiladores frontales
  const nv = formatoMayor === 'Mini-ITX' ? 1 : 2;
  for (let i = 0; i < nv; i++) ventilador(g, formatoMayor === 'Mini-ITX' ? 92 : 120, 25, P / 2 - 16, A / 2 - 110 - i * 130, 0, 'x', 'ventilador');
  g.userData = { tipo: 'caja', formato: formatoMayor, P, A, W };
  return g;
}


// ---------------- DISCO DURO 3,5" ----------------
// Tumbado, etiqueta hacia +Z. Largo en X (conectores en x máxima).
export function hdd35(abierto = false) {
  const g = new THREE.Group(); g.name = 'hdd';
  const L = 147, A = 101.6;
  caja(g, L, A, 22, 0xa9b0b8, -L / 2, -A / 2, -11, 'carcasa', { metalness: 0.6, roughness: 0.4 });
  caja(g, 120, 90, 2.5, 0x1f3d34, -L / 2 + 12, -45, -13.5, 'pcb');
  [[-60, -50.8], [40, -50.8], [-60, 48.8], [40, 48.8]].forEach(([x, y]) => caja(g, 8, 2, 6, 0x5e6670, x, y, -6, 'tornillos'));
  caja(g, 2, 13, 6, C.negro, L / 2, -18, -9, 'sata-datos');
  caja(g, 2, 24, 6, C.negro, L / 2, 0, -9, 'sata-corriente');
  if (!abierto) {
    caja(g, 95, 66, 0.4, C.blanco, -60, -33, 11, 'carcasa');
    caja(g, 30, 8, 0.5, C.acento, -55, 20, 11.2, 'carcasa');
  } else {
    // sin tapa: plato, eje y brazo con cabezal
    const plato = cilindro(g, 47.5, 1.6, 0xd5dbe2, -22, 0, 12, 'z', 'platos', { metalness: 0.35, roughness: 0.25 }, 48);
    cilindro(g, 12, 3, C.metal, -22, 0, 13.5, 'z', 'platos', { metalness: 0.8 });
    const piv = new THREE.Group(); piv.position.set(mm(45), mm(-32), mm(14)); piv.rotation.z = 2.35; g.add(piv);
    cilindro(piv, 7, 5, C.metalOscuro, 0, 0, 0, 'z', 'brazo', { metalness: 0.7 });
    caja(piv, 58, 7, 2, C.metal, 0, -3.5, -0.5, 'brazo', { metalness: 0.8 });
    caja(piv, 8, 5, 2.5, C.ambar, 56, -2.5, -1.5, 'brazo');
  }
  g.userData = { tipo: 'hdd' };
  return g;
}

// ---------------- UNIDAD ÓPTICA 5,25" ----------------
// Frontal hacia +Z.
export function optica(abierta = false) {
  const g = new THREE.Group(); g.name = 'optica';
  const W = 146, H = 41.3, D = 170;
  caja(g, W, H, D, 0x2b2f35, -W / 2, -H / 2, -D / 2, 'carcasa', { metalness: 0.4, roughness: 0.5 });
  caja(g, W + 2, H + 1, 5, 0x1d2025, -W / 2 - 1, -H / 2 - 0.5, D / 2, 'frontal');
  caja(g, 120, 1.5, 1, C.negro, -60, 6, D / 2 + 5, 'bandeja');
  caja(g, 12, 5, 2, C.metal, 50, -13, D / 2 + 5, 'frontal');
  caja(g, 4, 2, 1, 0x3fbf6a, 36, -12.5, D / 2 + 5, 'frontal', { emissive: 0x1f7a3c });
  caja(g, 13, 6, 2, C.negro, -30, -10, -D / 2 - 2, 'sata-datos');
  caja(g, 24, 6, 2, C.negro, -12, -10, -D / 2 - 2, 'sata-corriente');
  if (abierta) {
    caja(g, 128, 3, 120, 0x1d2025, -64, -2, D / 2 + 5, 'bandeja');
    const disco = cilindro(g, 60, 1.2, 0xd9e0ea, 0, 2, D / 2 + 62, 'y', 'disco', { metalness: 0.35, roughness: 0.2 }, 48);
    cilindro(g, 7.5, 1.4, 0x9aa1aa, 0, 2.1, D / 2 + 62, 'y', 'disco', {}, 24);
  }
  g.userData = { tipo: 'optica' };
  return g;
}

// ---------------- TARJETAS DE RED ----------------
// Como la gráfica: largo en X, alto en Y, chapa en x mínima.
export function tarjetaRed(tipo = 'wifi') {
  const g = new THREE.Group(); g.name = 'red';
  const L = tipo === 'wifi' ? 110 : 95, Al = tipo === 'wifi' ? 70 : 55;
  caja(g, L, Al, 1.6, 0x1f3d34, -L / 2, -Al / 2, -0.8, 'chip');
  caja(g, 25, 7, 1.6, C.oro, -L / 2 + 12, -Al / 2 - 7, -0.8, 'contactos', { metalness: 0.9 });
  caja(g, 1.5, Al + 18, 16, C.metal, -L / 2 - 1.5, -Al / 2 - 6, -2, 'bracket', { metalness: 0.8 });
  if (tipo === 'wifi') {
    caja(g, 22, 30, 1.2, 0x2b3a67, -10, -10, 0.8, 'modulo');
    caja(g, 16, 16, 1, C.metal, -7, -3, 2, 'modulo', { metalness: 0.7 });
    [-22, 12].forEach(y => {
      cilindro(g, 3.5, 6, 0xc9a24a, -L / 2 - 4.5, y, 4, 'x', 'antenas', { metalness: 0.8 });
      const ant = cilindro(g, 5, 110, C.negro, -L / 2 - 8, y + 55, 4, 'y', 'antenas');
      ant.rotation.z = -0.25;
    });
    const usb = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(mm(30), mm(10), mm(1)), new THREE.Vector3(mm(50), mm(25), mm(8)), new THREE.Vector3(mm(70), mm(5), mm(10))]), 20, mm(1.5), 8), mat(C.negro));
    usb.userData.parte = 'bluetooth'; g.add(usb);
    caja(g, 8, 5, 3, C.blanco, 66, 3, 8, 'bluetooth');
  } else {
    caja(g, 21, 14, 16, C.metal, -L / 2 + 0.5, -10, 0.8, 'rj45', { metalness: 0.7 });
    caja(g, 2, 3, 2, 0x3fbf6a, -L / 2 - 1.5, 1, 4, 'rj45', { emissive: 0x1f7a3c });
    caja(g, 2, 3, 2, C.ambar, -L / 2 - 1.5, 1, 11, 'rj45', { emissive: 0x6b4a10 });
    caja(g, 2, 9, 10, C.chip, -L / 2 - 1.6, -8, 3, 'rj45');
    caja(g, 14, 14, 1.5, C.chip, 10, -5, 0.8, 'chip');
  }
  g.userData = { tipo: 'red', variante: tipo };
  return g;
}

// ---------------- MONITOR ----------------
// Pantalla hacia +Z. 27" 16:9.
export function monitor() {
  const g = new THREE.Group(); g.name = 'monitor';
  const W = 612, H = 360;
  caja(g, W, H, 18, 0x1d2025, -W / 2, -H / 2 + 120, -9, 'marco', { roughness: 0.5 });
  caja(g, W - 16, H - 30, 1, 0x16243a, -W / 2 + 8, -H / 2 + 142, 9, 'pantalla', { emissive: 0x0c1a30, roughness: 0.15, metalness: 0.2 });
  caja(g, 260, 180, 30, 0x24282e, -130, 120 - 90, -39, 'marco');
  // VESA 100 × 100 en la espalda
  [[-50, 70], [50, 70], [-50, 170], [50, 170]].forEach(([x, y]) => cilindro(g, 3, 2, C.metal, x, y, -40, 'z', 'vesa', { metalness: 0.8 }));
  caja(g, 120, 120, 1, 0x30353c, -60, 60, -40.5, 'vesa');
  // entradas, mirando hacia abajo en la espalda
  [['HDMI', -90], ['HDMI', -60], ['DP', -25]].forEach(([, x]) => caja(g, 16, 6, 10, C.negro, x, 32, -30, 'entradas'));
  // brazo y peana
  caja(g, 50, 260, 24, 0x30353c, -25, -150, -60, 'peana', { metalness: 0.3 });
  caja(g, 260, 12, 190, 0x30353c, -130, -160, -150, 'peana', { metalness: 0.3 });
  g.userData = { tipo: 'monitor' };
  return g;
}

// ---------------- SOPORTES DE MEMORIA AUXILIAR ----------------
export function auxiliar() {
  const g = new THREE.Group(); g.name = 'auxiliar';
  // memoria USB
  caja(g, 45, 18, 9, C.acento, -110, -9, -4.5, 'pendrive');
  caja(g, 12, 12, 4.5, C.metal, -122, -6, -2.25, 'pendrive', { metalness: 0.8 });
  caja(g, 6, 6, 1, C.blanco, -95, -3, 4.6, 'pendrive');
  // SD
  caja(g, 24, 32, 2.1, 0x2b2f35, -45, -16, -1, 'sd');
  caja(g, 18, 14, 0.3, C.ambar, -42, 0, 1.1, 'sd');
  for (let i = 0; i < 8; i++) caja(g, 1.6, 3, 0.3, C.oro, -44 + i * 2.6, -15, 1.1, 'sd', { metalness: 0.9 });
  // microSD
  caja(g, 11, 15, 1, 0x2b2f35, -10, -7.5, -0.5, 'microsd');
  caja(g, 9, 6, 0.3, C.ambar, -9, 2, 0.5, 'microsd');
  // SSD externo
  caja(g, 85, 55, 10, 0x3b4048, 25, -27.5, -5, 'externo', { metalness: 0.5, roughness: 0.35 });
  caja(g, 2, 8, 3, C.negro, 110, -4, -1.5, 'externo');
  caja(g, 30, 8, 0.3, C.blanco, 35, 10, 5.1, 'externo');
  g.userData = { tipo: 'auxiliar' };
  return g;
}

// ---------------- Pieza suelta por categoría (para el explorador) ----------------
export function piezaSuelta(cat, datos = {}) {
  switch (cat) {
    case 'placa': return placa(datos.formato || 'ATX');
    case 'cpu': return cpu();
    case 'refri': return refri(tipoRefri(datos));
    case 'ram': { const g = new THREE.Group(); const r = ram(datos.formato, datos.gen); g.add(r); return g; }
    case 'almac': {
      if (datos.formato) return almacenamiento(datos.formato);
      const g = new THREE.Group(); const a = ssdM2(); a.position.x = -6; const b = ssd25(); b.position.set(6, 0, 0); g.add(a, b); return g;
    }
    case 'gpu': return gpu(datos.largo || 240, (datos.largo || 240) > 300 ? 3 : 2, (datos.pcie8 ?? 1) > 0);
    case 'fuente': return fuente(datos.formato);
    case 'caja': return montaje(datos.formato ? { caja: { formatos: [datos.formato] } } : {}, { soloCaja: true });
    case 'hdd': return hdd35(!!datos.abierto);
    case 'optica': return optica(!!datos.abierta);
    case 'red': return tarjetaRed(datos.tipo || 'wifi');
    case 'monitor': return monitor();
    case 'auxiliar': return auxiliar();
    default: return new THREE.Group();
  }
}
export function tipoRefri(d = {}) {
  if (d.serie) return 'serie';
  if (d.tipo === 'liquida') return 'liquida';
  if ((d.altura || 155) < 80) return 'perfil-bajo';
  if ((d.altura || 0) >= 160) return 'doble';
  return 'torre';
}

// ---------------- Montaje completo dentro de la caja ----------------
/**
 * sel: { caja, placa, cpu, refri, ram, almac, gpu, fuente } (objetos del catálogo, opcionales)
 * visibles: Set de claves a mostrar (por defecto, todo lo seleccionado)
 */
export function montaje(sel = {}, opts = {}) {
  const raiz = new THREE.Group(); raiz.name = 'montaje';
  const formatoCaja = sel.caja ? sel.caja.formatos[0] : (sel.placa ? sel.placa.formato : 'ATX');
  const ch = chasis(formatoCaja); raiz.add(ch);
  const { P, A, W } = ch.userData;
  const ver = k => !opts.visibles || opts.visibles.has(k);
  if (opts.soloCaja) {
    // caja de ejemplo con placa, fuente y gráfica para entender dónde va cada cosa
    sel = { placa: { formato: formatoCaja }, fuente: { formato: formatoCaja === 'Mini-ITX' ? 'SFX' : 'ATX' } };
  }
  const formatoPlaca = sel.placa ? sel.placa.formato : null;
  let placaG = null, D = null;
  const bandejaZ = -W / 2 + 6;
  if (formatoPlaca && ver('placa')) {
    placaG = placa(formatoPlaca); D = placaG.userData.diseno;
    // esquina superior trasera de la placa a 20 mm del borde trasero y 25 mm del techo
    placaG.position.set(mm(-P / 2 + 20 + D.w / 2), mm(A / 2 - 25 - D.h / 2), mm(bandejaZ + 1.6));
    raiz.add(placaG);
  }
  const enPlaca = (obj, x, y, z = 0) => { const p = puntoPlaca(formatoPlaca, x, y); obj.position.set(p.x, p.y, mm(z)); placaG.add(obj); };
  if (placaG) {
    if (sel.cpu && ver('cpu')) enPlaca(cpu(), D.socket[0], D.socket[1], 5.5);
    if (sel.refri && ver('refri')) {
      const r = refri(tipoRefri(sel.refri));
      enPlaca(r, D.socket[0], D.socket[1], 9.5);
      if (sel.refri.tipo === 'liquida') {
        const rad = new THREE.Group();
        caja(rad, 275, 27, 120, 0x2a2e34, -137, -13, -60, 'base');
        ventilador(rad, 118, 25, -62, -26, 0, 'y'); ventilador(rad, 118, 25, 62, -26, 0, 'y');
        rad.position.set(0, mm(A / 2 - 20), 0); raiz.add(rad);
      }
    }
    if (sel.ram && ver('ram')) {
      const n = Math.min(sel.ram.modulos || 2, D.dimm.n);
      const orden = D.dimm.n === 4 ? [1, 3, 0, 2] : [0, 1];
      for (let i = 0; i < n; i++) {
        const r = ram(sel.ram.formato, sel.ram.gen);
        // la RAM está de pie en la ranura vertical: alto hacia +Z (giro en X) y largo a lo largo de Y (giro en Z)
        r.rotation.order = 'ZYX';
        r.rotation.set(Math.PI / 2, 0, Math.PI / 2);
        enPlaca(r, D.dimm.x + 3 + orden[i] * 9, D.dimm.y + 70, 3);
      }
    }
    if (sel.almac && ver('almac') && String(sel.almac.formato).startsWith('M.2')) {
      const s = ssdM2(); enPlaca(s, D.m2[0][0] + 40 + 4, D.m2[0][1] + 11, 3);
    }
    if (sel.gpu && !sel.gpu.ninguna && ver('gpu')) {
      const gL = sel.gpu.largo || 240;
      const gg = gpu(gL, gL > 300 ? 3 : 2, (sel.gpu.pcie8 || 0) > 0);
      // tarjeta perpendicular a la placa: alto hacia +Z, ventiladores mirando hacia abajo
      gg.rotation.x = Math.PI / 2;
      const { alto, grosor } = gg.userData;
      enPlaca(gg, 28 + gL / 2, D.pcie16[0] + 3 + grosor / 2, 10 + 8 + alto / 2);
    }
  }
  if (sel.fuente && ver('fuente')) {
    const f = fuente(sel.fuente.formato);
    const { w, h, d } = f.userData;
    f.rotation.x = Math.PI; // ventilador hacia abajo
    f.position.set(mm(-P / 2 + 8 + w / 2), mm(-A / 2 + 6 + h / 2), mm(-W / 2 + 10 + d / 2));
    raiz.add(f);
  }
  if (sel.almac && ver('almac') && !String(sel.almac.formato).startsWith('M.2')) {
    const s = ssd25(); s.rotation.x = -Math.PI / 2;
    s.position.set(mm(P / 2 - 80), mm(-A / 2 + (formatoCaja === 'Mini-ITX' ? 20 : 100)), mm(0));
    raiz.add(s);
  }
  raiz.userData = { tipo: 'montaje' };
  return raiz;
}
