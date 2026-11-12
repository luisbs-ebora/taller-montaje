// modelos-t4.js — Aparatos del Tema 4 (fundamentos eléctricos) con aspecto realista: polímetro, puntas,
// conector de 24 pines, comprobador de fuentes y SAI. 1 unidad = 1 cm. Se usan en «Piezas 3D» y en «Por dentro».
// Las subpiezas llevan userData.parte (clave de content/tema4/piezas.json).
import * as THREE from 'three';

const cache = new Map();
export function M(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!cache.has(k)) cache.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, ...o }));
  return cache.get(k);
}
export const METAL = { metalness: 0.9, roughness: 0.28 };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function pon(padre, m, x, y, z, parte) {
  m.position.set(x, y, z);
  if (parte) m.traverse(o => { if (o.isMesh && !o.userData.parte) o.userData.parte = parte; });
  m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  padre.add(m); return m;
}
export const caja = (w, h, d, material) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
export const cil = (r, h, material, seg = 28, r2 = r) => new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, seg), material);

/** Caja con las esquinas redondeadas (vista desde arriba) y el canto suavizado. Apoyada en y = 0. */
export function redondo(w, h, d, r, material, bisel = 0.1) {
  const a = w - 2 * bisel, b = d - 2 * bisel, x = -a / 2, y = -b / 2;
  r = Math.min(r, a / 2, b / 2);
  const s = new THREE.Shape();
  s.moveTo(x + r, y); s.lineTo(x + a - r, y); s.quadraticCurveTo(x + a, y, x + a, y + r);
  s.lineTo(x + a, y + b - r); s.quadraticCurveTo(x + a, y + b, x + a - r, y + b);
  s.lineTo(x + r, y + b); s.quadraticCurveTo(x, y + b, x, y + b - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * bisel, bevelEnabled: true, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 3, curveSegments: 10 });
  g.rotateX(-Math.PI / 2); g.translate(0, bisel, 0);
  return new THREE.Mesh(g, material);
}

/** Lienzo 2D convertido en textura (pantallas, serigrafía). */
export function lienzo(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return { c, x: c.getContext('2d'), t };
}
/** Plano horizontal (mirando hacia arriba) con una textura; la parte de arriba del dibujo queda hacia −Z. */
export function rotulo(w, d, tex, opts = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, transparent: true, ...opts }));
  m.rotation.x = -Math.PI / 2; return m;
}

// Símbolos dibujados a mano (no dependen de la tipografía del equipo)
export function simboloCC(x, cx, cy, w, color) {
  x.save(); x.strokeStyle = color; x.lineWidth = Math.max(2, w * 0.12); x.lineCap = 'butt';
  x.beginPath(); x.moveTo(cx - w / 2, cy - w * 0.16); x.lineTo(cx + w / 2, cy - w * 0.16); x.stroke();
  x.setLineDash([w * 0.24, w * 0.14]); x.beginPath(); x.moveTo(cx - w / 2, cy + w * 0.16); x.lineTo(cx + w / 2, cy + w * 0.16); x.stroke();
  x.restore();
}
export function simboloCA(x, cx, cy, w, color) {
  x.save(); x.strokeStyle = color; x.lineWidth = Math.max(2, w * 0.12); x.lineCap = 'round';
  x.beginPath();
  for (let i = 0; i <= 20; i++) { const u = i / 20; const px = cx - w / 2 + u * w, py = cy - Math.sin(u * Math.PI * 2) * w * 0.2; i ? x.lineTo(px, py) : x.moveTo(px, py); }
  x.stroke(); x.restore();
}

/* ---------- Pantalla de 7 segmentos ---------- */
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', L: 'fed', O: 'abcdef', ' ': '' };
function digito(x, ch, ox, oy, w, h, t, tinta, fantasma) {
  const m = h / 2;
  const s = { a: [ox + t, oy, w - 2 * t, t], b: [ox + w - t, oy + t * 0.6, t, m - t * 1.1], c: [ox + w - t, oy + m + t * 0.5, t, m - t * 1.1],
    d: [ox + t, oy + h - t, w - 2 * t, t], e: [ox, oy + m + t * 0.5, t, m - t * 1.1], f: [ox, oy + t * 0.6, t, m - t * 1.1], g: [ox + t, oy + m - t / 2, w - 2 * t, t] };
  const on = SEG[ch] ?? '';
  for (const k in s) { x.fillStyle = on.includes(k) ? tinta : fantasma; x.fillRect(...s[k]); }
}
/** Pantalla LCD de polímetro. pintar({ texto:'12.08', unidad:'V', cc:true|false|null, aviso:'' , apagada }) */
export function pantallaLCD() {
  const L = lienzo(512, 256);
  function pintar({ texto = '', unidad = '', cc = null, aviso = '', apagada = false } = {}) {
    const x = L.x;
    x.fillStyle = apagada ? '#8f9a86' : '#b9c6a6'; x.fillRect(0, 0, 512, 256);
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(0,0,0,.10)');
    x.fillStyle = g; x.fillRect(0, 0, 512, 256);
    if (!apagada) {
      const tinta = '#0b0f08', fantasma = 'rgba(26,32,22,.06)';
      // separa los puntos decimales: van pegados a la cifra anterior
      const cifras = []; for (const ch of texto) { if (ch === '.' && cifras.length) cifras[cifras.length - 1].punto = true; else cifras.push({ ch }); }
      while (cifras.length < 5) cifras.unshift({ ch: ' ' });
      const w = 62, h = 128, t = 13, paso = 78, x0 = 34, y0 = 70;
      x.save(); x.transform(1, 0, -0.09, 1, 22, 0);
      cifras.slice(-5).forEach((c, i) => {
        digito(x, c.ch, x0 + i * paso, y0, w, h, t, tinta, fantasma);
        if (c.punto) { x.fillStyle = tinta; x.fillRect(x0 + i * paso + w + 3, y0 + h - t, t, t); }
      });
      x.restore();
      x.fillStyle = tinta; x.font = 'bold 54px Arial, Helvetica, sans-serif'; x.textAlign = 'right'; x.textBaseline = 'alphabetic';
      x.fillText(unidad, 500, 196);
      if (cc === true) { x.font = 'bold 26px Arial, Helvetica, sans-serif'; x.textAlign = 'left'; x.fillText('DC', 26, 44); simboloCC(x, 100, 34, 34, tinta); }
      if (cc === false) { x.font = 'bold 26px Arial, Helvetica, sans-serif'; x.textAlign = 'left'; x.fillText('AC', 26, 44); simboloCA(x, 100, 34, 34, tinta); }
      if (aviso) { x.font = 'bold 26px Arial, Helvetica, sans-serif'; x.textAlign = 'right'; x.fillText(aviso, 492, 44); }
    }
    L.t.needsUpdate = true;
  }
  pintar({ apagada: true });
  return { tex: L.t, pintar };
}

/* ---------- Polímetro digital de rango manual ---------- */
// Posiciones del selector, en grados en el sentido de las agujas desde arriba
export const SELECTOR = { off: 0, v2: 40, v20: 80, v200: 120, vca: 160, ohm: 200, cont: 240, ma: 280, a10: 320 };
// En el autorango solo se elige la magnitud: una sola posición de tensión continua
export const SELECTOR_AUTO = { off: 0, v2: 40, v20: 40, v200: 40, vcc: 40, vca: 80, ohm: 120, cont: 160, hz: 200, temp: 240, ma: 280, a10: 320 };
const ROTULOS = [['OFF', null], ['2', null], ['20', null], ['200', null], ['600', null], ['Ω', null], ['•)))', null], ['mA', null], ['10A', null]];
const ROTULOS_AUTO = [['OFF', null], ['V', 'cc'], ['V', 'ca'], ['Ω', null], ['•)))', null], ['Hz', null], ['°C', null], ['mA', null], ['10A', null]];

/** Polímetro digital. auto: false → rango manual (2/20/200); true → autorango (solo se elige la magnitud). */
export function polimetro({ auto = false } = {}) {
  const g = new THREE.Group(); g.name = 'polimetro';
  pon(g, redondo(9.2, 3.0, 17.6, 1.7, M(auto ? 0x1f8a70 : 0xf2a516, { roughness: 0.85 }), 0.25), 0, 0, 0, 'funda');
  pon(g, redondo(7.9, 3.3, 16.3, 1.1, M(0x24272d, { roughness: 0.5 }), 0.15), 0, 0, 0, 'cuerpo');
  const Y = 3.3;
  // Pantalla
  pon(g, redondo(6.6, 0.16, 3.9, 0.3, M(0x0e1013, { roughness: 0.3 }), 0.05), 0, Y, -5.5, 'pantalla');
  const lcd = pantallaLCD();
  const cristal = new THREE.Mesh(new THREE.PlaneGeometry(5.9, 2.95), new THREE.MeshStandardMaterial({ map: lcd.tex, roughness: 0.22, emissive: 0xffffff, emissiveMap: lcd.tex, emissiveIntensity: 0.18 }));
  cristal.rotation.x = -Math.PI / 2; pon(g, cristal, 0, Y + 0.175, -5.5, 'pantalla');
  // Botones
  [[-2.3, 0xf2c230], [0, 0x596270], [2.3, 0x596270]].forEach(([x, c]) => pon(g, redondo(1.7, 0.3, 0.8, 0.3, M(c, { roughness: 0.7 }), 0.06), x, Y, -2.75, 'botones'));
  // Serigrafía alrededor del selector
  const S = lienzo(768, 768), x = S.x, cx = 384, cy = 384;
  x.clearRect(0, 0, 768, 768);
  x.strokeStyle = '#3b4048'; x.lineWidth = 6; x.beginPath(); x.arc(cx, cy, 262, 0, Math.PI * 2); x.stroke();
  // arcos de color por magnitud
  const arco = (a0, a1, color) => { x.strokeStyle = color; x.lineWidth = 12; x.beginPath(); x.arc(cx, cy, 358, (a0 - 90) * Math.PI / 180, (a1 - 90) * Math.PI / 180); x.stroke(); };
  if (auto) { arco(26, 94, '#f2c230'); arco(106, 174, '#5fd08a'); arco(186, 254, '#6aa8ff'); arco(266, 334, '#ff5b5b'); }
  else { arco(26, 134, '#f2c230'); arco(146, 174, '#ff7a45'); arco(186, 254, '#5fd08a'); arco(266, 334, '#ff5b5b'); }
  (auto ? ROTULOS_AUTO : ROTULOS).forEach(([txt, tipo], i) => {
    const a = i * 40 * Math.PI / 180, px = cx + Math.sin(a) * 306, py = cy - Math.cos(a) * 306;
    x.fillStyle = txt === 'OFF' ? '#ff6b6b' : '#f3f1ea'; x.font = `bold ${txt.length > 3 ? 40 : 48}px Arial, Helvetica, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(txt, tipo ? px - 20 : px, py);
    if (tipo === 'cc') simboloCC(x, px + 22, py, 34, '#f3f1ea'); if (tipo === 'ca') simboloCA(x, px + 22, py, 34, '#f3f1ea');
    x.fillStyle = '#f3f1ea'; x.beginPath(); x.arc(cx + Math.sin(a) * 252, cy - Math.cos(a) * 252, 6, 0, Math.PI * 2); x.fill();
  });
  // nombre de cada grupo, por fuera
  const grupo = (grados, txt, tipo, color) => {
    const a = grados * Math.PI / 180, px = cx + Math.sin(a) * 356, py = cy - Math.cos(a) * 356;
    x.save(); x.translate(px, py); x.fillStyle = '#1b1d21'; const an = txt.length > 2 ? 62 : 44; x.beginPath(); x.roundRect(-an, -22, an * 2, 44, 10); x.fill();
    x.fillStyle = color; x.font = 'bold 34px Arial, Helvetica, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(txt, tipo ? -16 : 0, 2);
    if (tipo === 'cc') simboloCC(x, 20, 0, 30, color); if (tipo === 'ca') simboloCA(x, 20, 0, 30, color);
    x.restore();
  };
  if (auto) { grupo(60, 'AUTO', null, '#f2c230'); grupo(300, 'A', 'cc', '#ff5b5b'); }
  else { grupo(80, 'V', 'cc', '#f2c230'); grupo(160, 'V', 'ca', '#ff7a45'); grupo(300, 'A', 'cc', '#ff5b5b'); }
  S.t.needsUpdate = true;
  pon(g, rotulo(7.7, 7.7, S.t), 0, Y + 0.012, 1.5, 'selector');
  // Selector giratorio
  const selector = new THREE.Group(); selector.position.set(0, Y, 1.5); g.add(selector);
  pon(selector, cil(2.25, 0.55, M(0x33373e, { roughness: 0.45 }), 48), 0, 0.275, 0, 'selector');
  pon(selector, redondo(1.05, 0.75, 4.3, 0.5, M(0x17191c, { roughness: 0.6 }), 0.12), 0, 0.5, 0, 'selector');
  pon(selector, caja(0.26, 0.05, 1.3, M(0xffffff, { roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.25 })), 0, 1.26, -1.4, 'selector');
  // Bornes
  const B = lienzo(768, 128);
  B.x.clearRect(0, 0, 768, 128); B.x.font = 'bold 54px Arial, Helvetica, sans-serif'; B.x.textAlign = 'center'; B.x.textBaseline = 'middle';
  const bornes = {};
  [['a10', '10A', -2.85, 0xd8342c, '#ff6b6b'], ['ma', 'mA', -0.95, 0xd8342c, '#ff6b6b'], ['com', 'COM', 0.95, 0x16181b, '#f3f1ea'], ['v', 'VΩ', 2.85, 0xd8342c, '#ff6b6b']].forEach(([id, txt, bx, color, tinta]) => {
    pon(g, cil(0.66, 0.2, M(color, { roughness: 0.5 }), 32), bx, Y + 0.1, 6.55, id);
    pon(g, cil(0.4, 0.22, M(0x050506, { roughness: 0.9 }), 24), bx, Y + 0.11, 6.55, id);
    B.x.fillStyle = tinta; B.x.fillText(txt, 384 + (bx / 7.6) * 768, 64);
    bornes[id] = V(bx, Y + 0.2, 6.55);
  });
  B.t.needsUpdate = true;
  pon(g, rotulo(7.6, 1.27, B.t), 0, Y + 0.012, 5.15, null);
  const pos = auto ? SELECTOR_AUTO : SELECTOR;
  return { grupo: g, selector, lcd, bornes, auto, pos, girarA: id => { selector.rotation.y = -(pos[id] ?? 0) * Math.PI / 180; } };
}

/** Punta de prueba. El origen es el extremo metálico; el mango sigue hacia +Y. userData.cola = fin del mango. */
export function punta(color) {
  const g = new THREE.Group();
  const acero = M(0xd9dde2, METAL), mango = M(color, { roughness: 0.6 });
  const cono = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.45, 16), acero); cono.rotation.x = Math.PI; pon(g, cono, 0, 0.225, 0, 'punta');
  pon(g, cil(0.09, 1.6, acero, 16), 0, 1.25, 0, 'punta');
  pon(g, cil(0.2, 0.5, mango, 20, 0.34), 0, 2.3, 0, 'punta');
  pon(g, cil(0.62, 0.22, mango, 28), 0, 2.66, 0, 'punta');
  pon(g, cil(0.4, 7.6, mango, 24, 0.44), 0, 6.5, 0, 'punta');
  for (let i = 0; i < 5; i++) pon(g, cil(0.46, 0.14, M(0x15161a, { roughness: 0.8 }), 24), 0, 4.2 + i * 0.5, 0, 'punta');
  pon(g, cil(0.36, 1.3, M(0x15161a, { roughness: 0.8 }), 20, 0.2), 0, 10.95, 0, 'punta');
  g.userData.cola = 11.6;
  return g;
}
/** Clavija (banana) que entra en un borne. Origen en la boca del borne. */
export function clavija(color) {
  const g = new THREE.Group();
  pon(g, cil(0.36, 2.0, M(color, { roughness: 0.6 }), 20), 0, 1.0, 0, 'punta');
  pon(g, cil(0.3, 0.9, M(0x15161a, { roughness: 0.8 }), 20, 0.18), 0, 2.45, 0, 'punta');
  g.userData.cola = 2.9;
  return g;
}
/** Cable flexible entre dos puntos. tender(a, dirA, b, dirB) lo recoloca. */
export function cableFlexible(color, radio = 0.15) {
  const m = new THREE.Mesh(new THREE.BufferGeometry(), M(color, { roughness: 0.7 }));
  m.castShadow = true;
  m.tender = (a, dirA, b, dirB, suelo = 0.3) => {
    const medio = a.clone().lerp(b, 0.5); medio.y = suelo; medio.z += 3.2;
    const c = new THREE.CatmullRomCurve3([a, a.clone().addScaledVector(dirA, 1.6), medio, b.clone().addScaledVector(dirB, 2.2), b], false, 'catmullrom', 0.5);
    m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(c, 36, radio, 7);
  };
  return m;
}

/* ---------- Conector ATX de 24 pines ---------- */
export const SENALES = {
  '33': { color: 0xf08a24, nombre: 'Naranja: +3,3 V', min: 3.14, max: 3.47, v: 3.33 },
  '5': { color: 0xd8342c, nombre: 'Rojo: +5 V', min: 4.75, max: 5.25, v: 5.02 },
  '12': { color: 0xf5cf2e, nombre: 'Amarillo: +12 V', min: 11.4, max: 12.6, v: 12.08 },
  gnd: { color: 0x17181b, nombre: 'Negro: masa (0 V)', v: 0 },
  sb: { color: 0x8a5fd0, nombre: 'Morado: +5 V de reposo', min: 4.75, max: 5.25, v: 5.04 },
  on: { color: 0x2fa85a, nombre: 'Verde: PS_ON', v: 0.02 },
  pg: { color: 0x9aa0a8, nombre: 'Gris: PWR_OK', min: 4.75, max: 5.25, v: 5.01 },
  m12: { color: 0x2d6fd6, nombre: 'Azul: −12 V', min: -13.2, max: -10.8, v: -11.9 },
};
// Pines 1-12 (una fila) y 13-24 (la otra), según la tabla de los apuntes
const FILA_A = ['33', '33', 'gnd', '5', 'gnd', '5', 'gnd', 'pg', 'sb', '12', '12', '33'];
const FILA_B = ['33', 'm12', 'gnd', 'on', 'gnd', 'gnd', 'gnd', null, '5', '5', '5', 'gnd'];

/** Conector de 24 pines de pie (cables hacia arriba). fin(x, fila) → punto donde termina cada cable. */
export function conector24({ paso = 0.6, fin = null } = {}) {
  const g = new THREE.Group(); g.name = 'conector24';
  const L = 12 * paso + 0.3, W = 2 * paso + 0.3, H = 2.0;
  const nailon = M(0x1b1c20, { roughness: 0.45 });
  pon(g, caja(L, H, W, nailon), 0, H / 2, 0, 'carcasa');
  // pestaña de seguridad
  pon(g, caja(1.1, H * 0.95, 0.2, nailon), 0, H * 0.55, W / 2 + 0.1, 'pestana');
  pon(g, caja(1.1, 0.35, 0.36, nailon), 0, 0.32, W / 2 + 0.2, 'pestana');
  pon(g, caja(1.3, 0.3, 0.3, nailon), 0, H + 0.1, W / 2 + 0.16, 'pestana');
  const hilos = [];
  [FILA_A, FILA_B].forEach((fila, f) => fila.forEach((id, i) => {
    const x = (i - 5.5) * paso, z = (f ? -1 : 1) * paso / 2;
    // alojamiento de cada pin
    pon(g, caja(paso * 0.78, 0.06, paso * 0.78, M(0x08090a, { roughness: 0.9 })), x, H + 0.03, z, 'carcasa');
    if (!id) return;
    const s = SENALES[id];
    const b = fin ? fin(x, f) : V(x * 0.55, H + 4.4, z - 7.5);
    const curva = new THREE.CatmullRomCurve3([V(x, H - 0.4, z), V(x, H + 1.5, z), V(x * 0.9, H + 3.1, z - 1.6 - f * 0.25), V((x * 0.9 + b.x) / 2, (H + 3.3 + b.y) / 2 + 0.5, (z - 2 + b.z) / 2), b], false, 'catmullrom', 0.5);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curva, 28, paso * 0.23, 8), new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.6 }));
    m.userData.parte = 'c' + id; m.castShadow = true; g.add(m);
    hilos.push({ pin: f * 12 + i + 1, id, mesh: m, x, z, sonda: V(x + paso * 0.2, H + 0.02, z + (f ? -1 : 1) * paso * 0.12) });
  }));
  return { grupo: g, hilos, alto: H, largo: L, ancho: W };
}

/* ---------- Comprobador de fuentes ATX ---------- */
export function comprobador() {
  const g = new THREE.Group(); g.name = 'comprobador';
  pon(g, redondo(14, 2.6, 7.2, 0.5, M(0xaab2bb, { metalness: 0.85, roughness: 0.35 }), 0.12), 0, 0, 0, 'cuerpo');
  const P = lienzo(640, 256), x = P.x;
  x.fillStyle = '#0c2a52'; x.fillRect(0, 0, 640, 256);
  x.fillStyle = '#dff1ff'; x.font = 'bold 34px Consolas, "Courier New", monospace'; x.textBaseline = 'middle';
  [['+12V1', '12.1'], ['+5V', '5.0'], ['+3.3V', '3.3'], ['5VSB', '5.0'], ['-12V', '11.9'], ['PG', '280ms']].forEach(([n, v], i) => {
    const cx = 24 + (i % 3) * 205, cy = 70 + Math.floor(i / 3) * 110;
    x.font = 'bold 26px Consolas, "Courier New", monospace'; x.fillStyle = '#8fc7ff'; x.fillText(n, cx, cy - 26);
    x.font = 'bold 50px Consolas, "Courier New", monospace'; x.fillStyle = '#ffffff'; x.fillText(v, cx, cy + 16);
  });
  P.t.needsUpdate = true;
  pon(g, redondo(8.6, 0.12, 3.9, 0.2, M(0x0b0c0e, { roughness: 0.3 }), 0.04), -1.6, 2.6, -0.6, 'lcd');
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.2), new THREE.MeshStandardMaterial({ map: P.t, emissive: 0xffffff, emissiveMap: P.t, emissiveIntensity: 0.75, roughness: 0.25 }));
  lcd.rotation.x = -Math.PI / 2; pon(g, lcd, -1.6, 2.735, -0.6, 'lcd');
  // conectores de entrada: cada uno, un zócalo de nailon con sus huecos
  const zocalo = (cols, filas, color, parte, px, py, pz, giro = 0) => {
    const z = new THREE.Group(), p = 0.5;
    pon(z, caja(cols * p + 0.3, filas * p + 0.3, 0.9, M(color, { roughness: 0.5 })), 0, 0, 0, parte);
    for (let i = 0; i < cols; i++) for (let j = 0; j < filas; j++) pon(z, caja(p * 0.7, p * 0.7, 0.1, M(0x060607, { roughness: 0.9 })), (i - (cols - 1) / 2) * p, (j - (filas - 1) / 2) * p, 0.46, parte);
    z.rotation.y = giro; pon(g, z, px, py, pz, parte); return z;
  };
  zocalo(12, 2, 0xf3efe6, 'atx24', -2.4, 1.3, 3.25);
  zocalo(4, 2, 0xf3efe6, 'eps', 3.6, 1.3, 3.25);
  zocalo(4, 2, 0x25272b, 'pcie', -3.6, 1.3, -3.25, Math.PI);
  zocalo(4, 1, 0xf3efe6, 'molex', 1.4, 1.3, -3.25, Math.PI);
  pon(g, caja(0.9, 0.6, 2.4, M(0x101114, { roughness: 0.5 })), 6.9, 1.3, 0, 'sata');
  // LED de estado
  [[4.6, 0x35d06a], [5.6, 0x35d06a], [4.6, 0x35d06a]].forEach(([lx, c], i) => pon(g, cil(0.2, 0.1, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.2 }), 16), lx, 2.65, -1.6 + i * 0.9, 'led'));
  return g;
}

/* ---------- SAI (torre) ---------- */
/** SAI de torre: el frontal mira a +X y la trasera (entrada y tomas) a −X. abierto → se quita un lateral. */
export function sai({ abierto = false } = {}) {
  const g = new THREE.Group(); g.name = 'sai';
  const LX = 30, H = 17, D = 11;
  const chapa = M(0x1f2226, { roughness: 0.5, metalness: 0.35 });
  pon(g, caja(LX, 0.4, D, chapa), 0, 0.2, 0, 'carcasa');
  pon(g, caja(LX, 0.4, D, chapa), 0, H - 0.2, 0, 'carcasa');
  pon(g, caja(LX, H, 0.4, chapa), 0, H / 2, -D / 2 + 0.2, 'carcasa');
  pon(g, caja(0.4, H, D, chapa), -LX / 2 + 0.2, H / 2, 0, 'carcasa');
  const lateral = pon(g, caja(LX, H, 0.4, abierto ? new THREE.MeshStandardMaterial({ color: 0xbfd8e8, transparent: true, opacity: 0.14, roughness: 0.1, depthWrite: false }) : chapa), 0, H / 2, D / 2 - 0.2, abierto ? null : 'carcasa');
  if (abierto) { lateral.castShadow = false; lateral.userData.noTocar = true; }
  // Frontal de plástico con pantalla y botón
  pon(g, redondo(1.2, H, D, 0.4, M(0x121417, { roughness: 0.35 }), 0.1), LX / 2 + 0.4, 0, 0, 'frontal');
  const P = lienzo(512, 384);
  const pintarLCD = ({ entrada = 230, salida = 230, carga = 45, bateria = 100, modo = 'RED', alarma = false } = {}) => {
    const x = P.x;
    x.fillStyle = alarma ? '#3a0d0d' : '#07233f'; x.fillRect(0, 0, 512, 384);
    x.textBaseline = 'middle';
    const fila = (y, n, v) => { x.font = 'bold 34px Arial, Helvetica, sans-serif'; x.fillStyle = '#8fc7ff'; x.textAlign = 'left'; x.fillText(n, 24, y); x.font = 'bold 46px Arial, Helvetica, sans-serif'; x.fillStyle = '#ffffff'; x.textAlign = 'right'; x.fillText(v, 488, y); };
    fila(52, 'ENTRADA', entrada + ' V'); fila(122, 'SALIDA', salida + ' V'); fila(192, 'CARGA', carga + ' %'); fila(262, 'BATERÍA', Math.round(bateria) + ' %');
    x.fillStyle = alarma ? '#ff5b5b' : modo === 'RED' ? '#35d06a' : '#ffb020'; x.fillRect(0, 312, 512, 72);
    x.fillStyle = '#10151a'; x.font = 'bold 40px Arial, Helvetica, sans-serif'; x.textAlign = 'center'; x.fillText(alarma ? alarma : modo === 'RED' ? 'RED ELÉCTRICA' : 'BATERÍA', 256, 350);
    P.t.needsUpdate = true;
  };
  pintarLCD();
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(6, 4.5), new THREE.MeshStandardMaterial({ map: P.t, emissive: 0xffffff, emissiveMap: P.t, emissiveIntensity: 0.8, roughness: 0.25 }));
  lcd.rotation.y = Math.PI / 2; pon(g, lcd, LX / 2 + 1.02, 11.6, 0, 'lcd');
  const boton = cil(0.9, 0.3, M(0x2b3038, { roughness: 0.4, metalness: 0.4 }), 28); boton.rotation.z = Math.PI / 2; pon(g, boton, LX / 2 + 1.1, 6.6, 0, 'boton');
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 10, 36), new THREE.MeshStandardMaterial({ color: 0x35d06a, emissive: 0x35d06a, emissiveIntensity: 1.3 })); aro.rotation.y = Math.PI / 2; pon(g, aro, LX / 2 + 1.12, 6.6, 0, 'boton');
  // Trasera: entrada, tomas y USB
  const xr = -LX / 2 - 0.05;
  const c14 = pon(g, caja(0.5, 2.2, 3.2, M(0x0c0d0f, { roughness: 0.6 })), xr - 0.1, 3, 2.4, 'entrada');
  const toma = (y, z, parte, color) => {
    const t = new THREE.Group();
    const base = cil(2.05, 0.4, M(color, { roughness: 0.5 }), 36); base.rotation.z = Math.PI / 2; pon(t, base, 0, 0, 0, parte);
    const fondo = cil(1.7, 0.3, M(0x0b0c0d, { roughness: 0.8 }), 36); fondo.rotation.z = Math.PI / 2; pon(t, fondo, -0.12, 0, 0, parte);
    [-0.95, 0.95].forEach(dz => { const a = cil(0.24, 0.1, M(0x000000), 12); a.rotation.z = Math.PI / 2; pon(t, a, -0.3, 0, dz, parte); });
    pon(g, t, xr - 0.15, y, z, parte); return t;
  };
  const tomas = [toma(13.6, -2.6, 'salidabat', 0x1c1e22), toma(13.6, 2.6, 'salidabat', 0x1c1e22), toma(8.6, -2.6, 'salidaprot', 0x8d949c), toma(8.6, 2.6, 'salidaprot', 0x8d949c)];
  pon(g, caja(0.3, 0.9, 1.2, M(0xc8ccd2, METAL)), xr - 0.05, 3, -3, 'usb');
  // Interior
  const dentro = {};
  dentro.bateria = pon(g, redondo(15, 9.4, 6.6, 0.5, M(0x2c3138, { roughness: 0.6 }), 0.15), 6, 0.45, -0.6, 'bateria');
  pon(g, caja(1.1, 0.8, 0.5, M(0xd8342c)), 0.4, 10.2, -1.8, 'bateria'); pon(g, caja(1.1, 0.8, 0.5, M(0x111214)), 0.4, 10.2, 0.6, 'bateria');
  const E = lienzo(512, 256); E.x.fillStyle = '#e9e6df'; E.x.fillRect(0, 0, 512, 256); E.x.fillStyle = '#1c1e22'; E.x.font = 'bold 64px Arial, Helvetica, sans-serif'; E.x.textAlign = 'center'; E.x.fillText('12 V   9 Ah', 256, 112); E.x.font = 'bold 36px Arial, Helvetica, sans-serif'; E.x.fillText('Batería de plomo sellada', 256, 190); E.t.needsUpdate = true;
  const etq = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), new THREE.MeshStandardMaterial({ map: E.t, roughness: 0.6 })); pon(g, etq, 6, 5.2, 2.73, 'bateria');
  const pcb = M(0x1f6a48, { roughness: 0.5 });
  // filtro de entrada
  dentro.filtro = pon(g, caja(4.6, 0.25, 6, pcb), -11.6, 0.9, 0, 'filtro');
  const bob = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.5, 12, 28), M(0xc77b45, { metalness: 0.6, roughness: 0.4 })); bob.rotation.x = Math.PI / 2; pon(g, bob, -11.2, 1.7, -1.2, 'filtro');
  pon(g, caja(1.0, 1.8, 2.4, M(0xe8c42a, { roughness: 0.5 })), -12.4, 1.95, 1.6, 'filtro');
  // cargador (rectificador)
  dentro.cargador = pon(g, caja(5.2, 0.25, 6, pcb), -5.6, 0.9, 0, 'cargador');
  pon(g, caja(2.4, 2.2, 2.4, M(0xe0b63a, { roughness: 0.5 })), -5.2, 2.1, -1, 'cargador');
  [[-7, 1.6], [-6, 1.9], [-4.2, 1.8]].forEach(([cx, cz]) => pon(g, cil(0.45, 1.6, M(0x16263f, { roughness: 0.4 }), 18), cx, 1.8, cz, 'cargador'));
  // regulador (AVR): transformador con bobinado de cobre
  pon(g, caja(5.4, 4.6, 5.4, M(0x3a3d43, { metalness: 0.5, roughness: 0.5 })), -4.4, 12.6, -0.4, 'avr');
  dentro.avr = pon(g, caja(3.6, 4.9, 6.2, M(0xc77b45, { metalness: 0.55, roughness: 0.4 })), -4.4, 12.6, -0.4, 'avr');
  // relé de conmutación
  dentro.rele = pon(g, caja(2.6, 2.4, 3.2, new THREE.MeshStandardMaterial({ color: 0x2a5fc4, roughness: 0.35, transparent: true, opacity: 0.85 })), -11.4, 12.6, 0, 'rele');
  const brazo = new THREE.Group(); brazo.position.set(-11.4, 14.2, 0); g.add(brazo);
  pon(brazo, caja(0.18, 1.6, 0.4, M(0xe6e9ed, METAL)), 0, 0.8, 0, 'rele');
  // inversor
  dentro.inversor = pon(g, caja(11, 0.25, 6, pcb), 5.6, 11.3, 0, 'inversor');
  for (let i = 0; i < 9; i++) pon(g, caja(0.22, 3.2, 5, M(0xcfd4da, METAL)), 2 + i * 0.75, 13.1, 0, 'inversor');
  pon(g, caja(7.2, 0.5, 5, M(0xcfd4da, METAL)), 5, 11.7, 0, 'inversor');
  [[10, -1.4], [10, 1.2]].forEach(([cx, cz]) => pon(g, cil(0.7, 2.6, M(0x16263f, { roughness: 0.4 }), 20), cx, 12.7, cz, 'inversor'));
  // placa de control junto al frontal
  dentro.control = pon(g, caja(0.25, 7, 6.5, pcb), 14.2, 11, 0, 'control');
  pon(g, caja(0.5, 1.4, 1.4, M(0x0e0f11, { roughness: 0.4 })), 13.9, 11.6, 0, 'control');
  return { grupo: g, dentro, brazo, tomas, c14, pintarLCD, dim: { LX, H, D } };
}

/** Piezas del Tema 4 para el explorador de piezas (centradas y listas para tocar). */
export function piezaTema4(cat, datos = {}) {
  switch (cat) {
    case 'polimetro': {
      const p = polimetro({ auto: !!datos.auto }); p.lcd.pintar({ texto: '12.08', unidad: 'V', cc: true, aviso: datos.auto ? 'AUTO' : '' });
      p.girarA('v20');
      const g = new THREE.Group(); g.add(p.grupo);
      [[0xd8342c, 'v', 7.6], [0x17181b, 'com', 10.2]].forEach(([c, b, x]) => {
        const pt = punta(c); pt.rotation.x = Math.PI / 2; pt.position.set(x, 0.62, -5); g.add(pt);
        const cl = clavija(c); cl.position.copy(p.bornes[b]); g.add(cl);
        const cb = cableFlexible(c); cb.tender(p.bornes[b].clone().add(V(0, 2.9, 0)), V(0, 1, 0), V(x, 0.62, 6.6), V(0, 0, 1), 0.3); cb.userData.parte = 'punta'; g.add(cb);
      });
      return g;
    }
    case 'conector24': { const c = conector24({ paso: 0.9 }); return c.grupo; }
    case 'comprobador': return comprobador();
    case 'sai': return sai({ abierto: !!datos.abierto }).grupo;
    default: return null;
  }
}

/* ---------- Banco de medida: polímetro (manual y autorango) + placa con el conector de 24 pines + fuente ---------- */
// Lo comparten la animación «Medir con el polímetro» y la práctica «¿Está bien la fuente?».
export function bancoMedida() {
  const g = new THREE.Group();
  const add = (m, x, y, z) => { m.position.set(x, y, z); m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.add(m); return m; };
  const ARRIBA = V(0, 1, 0);
  // Los dos polímetros ocupan el mismo sitio: solo se ve el elegido
  const polis = { manual: polimetro(), auto: polimetro({ auto: true }) };
  for (const k in polis) { polis[k].grupo.position.set(-14, 0, 4); polis[k].grupo.rotation.y = 0.14; g.add(polis[k].grupo); }
  polis.auto.grupo.visible = false;
  let poli = polis.manual;
  g.updateMatrixWorld(true);
  const borne = id => poli.bornes[id].clone().applyMatrix4(poli.grupo.matrixWorld);

  // Trozo de placa base
  const PX = 9, PZ = 4, FZ = -17;
  add(redondo(24, 0.25, 17, 0.5, M(0x1d5a40, { roughness: 0.45 }), 0.04), PX, 0, PZ);
  for (let i = 0; i < 2; i++) add(caja(0.9, 0.9, 13.5, M(0x15171a, { roughness: 0.5 })), PX - 9 + i * 1.5, 0.7, PZ + 0.5);
  add(caja(3.2, 0.3, 3.2, M(0x101215, { roughness: 0.35 })), PX + 1, 0.4, PZ + 5);
  add(caja(4.2, 1.1, 4.2, M(0x8f979f, METAL)), PX + 7, 0.8, PZ + 4.5);
  [[-3, 6.5], [-1.8, 6.5], [-3, 5.2], [4.5, 1], [5.6, 1], [9, -1]].forEach(([dx, dz]) => { add(cil(0.38, 1.1, M(0x1a1c20, { roughness: 0.35 }), 16), PX + dx, 0.8, PZ + dz); add(cil(0.38, 0.03, M(0xc9ced6, METAL), 16), PX + dx, 1.36, PZ + dz); });
  const led = add(cil(0.22, 0.25, new THREE.MeshStandardMaterial({ color: 0x35d06a, emissive: 0x35d06a, emissiveIntensity: 1.6 }), 16), PX + 10, 0.38, PZ + 7);
  // Fuente
  add(caja(15, 8.6, 14, M(0x17181b, { roughness: 0.45, metalness: 0.5 })), PX, 4.3, FZ);
  const rejilla = add(cil(5.6, 0.12, M(0x0a0b0c, { roughness: 0.6 }), 40), PX, 8.62, FZ);
  for (let i = 1; i <= 4; i++) { const a = new THREE.Mesh(new THREE.TorusGeometry(i * 1.3, 0.07, 8, 40), M(0xc9ced6, METAL)); a.rotation.x = Math.PI / 2; add(a, PX, 8.72, FZ); }
  const E = lienzo(512, 256); E.x.fillStyle = '#e9e6df'; E.x.fillRect(0, 0, 512, 256); E.x.fillStyle = '#17181b'; E.x.textAlign = 'center';
  E.x.font = 'bold 76px Arial, Helvetica, sans-serif'; E.x.fillText('450 W', 256, 110); E.x.font = 'bold 38px Arial, Helvetica, sans-serif'; E.x.fillText('Fuente ATX', 256, 180); E.t.needsUpdate = true;
  const etq = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshStandardMaterial({ map: E.t, roughness: 0.6 })); etq.rotation.y = Math.PI / 2; add(etq, PX + 7.52, 4.6, FZ);
  // Conector de 24 pines enchufado en la placa
  const CX = PX + 2, CZ = PZ - 1.5, CY = 1.05;
  add(caja(7.9, 0.9, 1.9, M(0xefeadf, { roughness: 0.5 })), CX, 0.65, CZ);
  const con = conector24({ paso: 0.6, fin: (x, f) => V(x * 0.42 + (PX - CX), 3.2 + f * 0.5 - CY, FZ + 7.1 - CZ) });
  con.grupo.position.set(CX, CY, CZ); g.add(con.grupo);
  const hilo = (id, n = 0) => { const l = con.hilos.filter(h => h.id === id); return l[Math.min(n, l.length - 1)]; };
  const sonda = h => h.sonda.clone().add(con.grupo.position);
  const hiloGnd = hilo('gnd', 1);
  function brillo(h) { for (const o of con.hilos) { o.mesh.material.emissive.setHex(o === h ? SENALES[o.id].color : 0x000000); o.mesh.material.emissiveIntensity = o === h ? 0.5 : 0; } }

  // Puntas, clavijas y cables
  const mk = (color, reposoPunta, reposoDir) => {
    const p = { punta: punta(color), clavija: clavija(color), cable: cableFlexible(color), tip: reposoPunta.clone(), dir: reposoDir.clone().normalize(), reposoPunta, reposoDir: reposoDir.clone().normalize() };
    g.add(p.punta, p.clavija, p.cable); return p;
  };
  const roja = mk(0xd8342c, V(-4.5, 0.75, 13), V(1, 0.012, 0.1));
  const negra = mk(0x17181b, V(-4.5, 0.75, 16), V(1, 0.012, -0.05));
  function colocar(p) {
    p.punta.position.copy(p.tip); p.punta.quaternion.setFromUnitVectors(ARRIBA, p.dir);
    const cola = p.tip.clone().addScaledVector(p.dir, p.punta.userData.cola);
    p.cable.tender(p.clavija.position.clone().add(V(0, p.clavija.userData.cola, 0)), ARRIBA, cola, p.dir, 0.3);
  }
  const DIR_ROJA = V(0.42, 0.8, 0.5).normalize(), DIR_NEGRA = V(-0.5, 0.78, 0.45).normalize();
  // Chispa del cortocircuito
  const chispa = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0, depthWrite: false }));
  const luzChispa = new THREE.PointLight(0xffe08a, 0, 30); chispa.add(luzChispa); g.add(chispa);

  const b = {
    grupo: g, polis, con, hilo, sonda, hiloGnd, brillo, roja, negra, colocar, led, chispa, luzChispa, rejilla, borne, DIR_ROJA, DIR_NEGRA, PX, PZ, FZ,
    get poli() { return poli; },
    usar(tipo) { poli = polis[tipo] || polis.manual; for (const k in polis) polis[k].grupo.visible = polis[k] === poli; return poli; },
    // Todo como al empezar: puntas en la mesa, roja en VΩ, selector en OFF
    reposo() {
      for (const p of [roja, negra]) { p.tip.copy(p.reposoPunta); p.dir.copy(p.reposoDir); }
      roja.clavija.position.copy(borne('v')); negra.clavija.position.copy(borne('com'));
      for (const k in polis) { polis[k].girarA('off'); polis[k].lcd.pintar({ apagada: true }); }
      brillo(null); chispa.material.opacity = 0; luzChispa.intensity = 0; led.material.emissiveIntensity = 1.6;
      colocar(roja); colocar(negra);
    },
    // Coloca una punta sobre un cable (sin animación)
    tocar(p, h) { p.tip.copy(sonda(h)); p.dir.copy(p === roja ? DIR_ROJA : DIR_NEGRA); },
  };
  b.reposo();
  return b;
}
