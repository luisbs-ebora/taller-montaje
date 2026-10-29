// Montaje animado (estilo cartoon): piezas, animación de cada paso y animación del error típico.
// Medidas en centímetros. La caja está tumbada a la izquierda de la mesa; la placa se monta primero
// encima de la mesa y luego entra en la caja con todo lo que lleva puesto.
// Cada paso tiene montar(ctx) y mal(ctx). Las posiciones sobre la placa se dan en coordenadas de la placa
// (ctx.enPlaca), así los pasos funcionan esté la placa en la mesa o dentro de la caja.
import * as THREE from 'three';
import { kit, nuevaTinta, cambiarGeometria, TINTA } from './toon.js';
import { animar, esperar, ease } from './anim.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const E = (x, y, z) => new THREE.Euler(x, y, z);

const C = {
  pcb: 0x2f9a7e, ranura: 0x37405a, metal: 0xc9d0da, metalOscuro: 0x8592a6, oro: 0xf2c14e,
  cobre: 0xe39a5b, naranja: 0xff6a3d, azul: 0x4a86e8, crema: 0xf7f1e3, negro: 0x2e3340,
  rojo: 0xe5484d, verde: 0x3fbf6a, amarillo: 0xffd23f, lila: 0x8b6fe0, cable: 0x454b62, chasis: 0x5b6b82,
};

// Caja tumbada: fondo (bandeja de la placa) abajo, lado abierto arriba.
// x0 = panel trasero, x1 = frontal, z0 = parte de arriba de la torre, z1 = parte de abajo (fuente).
export const CAJA = { x0: -64, x1: -27, z0: -22, z1: 22, suelo: 0.8, alto: 15 };
// Dónde queda la placa dentro de la caja (solo se traslada, no gira)
export const DENTRO = V(-46.45, 1.6, -7.5);
const AGUJEROS = [[-14, -11.4], [14, -11.4], [-14, 11.4], [14, 11.4], [0, -11.4], [0, 11.4]];
const FUENTE_DENTRO = V(-57, 5.1, 13.6);

function nuevaPieza(id, datos) {
  const grupo = new THREE.Group();
  const cuerpo = new THREE.Group();
  grupo.add(cuerpo);
  grupo.userData.id = id;
  // «fijo»: objetos en coordenadas del mundo (cables tendidos al montar). Se pulsan como la pieza.
  const fijo = new THREE.Group();
  fijo.userData.id = id;
  const tinta = nuevaTinta();
  const tintas = [tinta];
  return { id, grupo, cuerpo, fijo, tintas, k: kit(tinta, tintas), hover: 0, salto: 0, montado: false, requiere: [], ...datos };
}

function poner(padre, malla, x, y, z) { malla.position.set(x, y, z); padre.add(malla); return malla; }

const matZona = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
function zona(padre, w, h, d, x, y, z) { return poner(padre, new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matZona), x, y, z); }

async function volar(obj, destino, { rot = null, altura = 8, ms = 900 } = {}) {
  const p0 = obj.position.clone(), q0 = obj.quaternion.clone();
  const q1 = rot ? new THREE.Quaternion().setFromEuler(rot) : q0.clone();
  await animar(ms, t => {
    obj.position.lerpVectors(p0, destino, t);
    obj.position.y += Math.sin(Math.PI * t) * altura;
    obj.quaternion.slerpQuaternions(q0, q1, t);
  });
}

async function mover(obj, destino, ms = 450, e = ease.suave) {
  const p0 = obj.position.clone();
  await animar(ms, t => obj.position.lerpVectors(p0, destino, t), e);
}

async function bajarA(obj, y, ms = 450, e = ease.salida) {
  const y0 = obj.position.y;
  await animar(ms, t => { obj.position.y = y0 + (y - y0) * t; }, e);
}

async function aparecer(obj, ms = 320) {
  obj.visible = true;
  await animar(ms, t => obj.scale.setScalar(Math.max(0.001, t)), ease.muelle);
}

const temblar = (obj, eje = 'z', fuerza = 0.12) => {
  const r0 = obj.rotation[eje];
  return animar(650, (_, t) => { obj.rotation[eje] = r0 + Math.sin(t * Math.PI * 8) * fuerza * (1 - t); }, ease.lineal);
};

const girarTornillo = (t, y0, y1, ms = 420, vueltas = 2) =>
  animar(ms, u => { t.position.y = y0 + (y1 - y0) * u; t.rotation.y = u * Math.PI * 2 * vueltas; }, ease.salida);

function nuevoTornillo(k, padre, x, y, z) {
  const t = new THREE.Group(); t.position.set(x, y, z); t.visible = false; padre.add(t);
  poner(t, k.cil(0.38, 0.18, C.metal, 0.035, 12), 0, 0.1, 0);
  poner(t, k.caja(0.5, 0.04, 0.1, C.metalOscuro, 0), 0, 0.2, 0);
  return t;
}

const crecer = (malla, ms) => {
  const total = malla.geometry.index.count, paso = 60;
  return animar(ms, t => malla.geometry.setDrawRange(0, Math.floor((t * total) / paso) * paso), ease.lineal);
};

// Tiende un cable (en coordenadas del mundo) dentro de P.fijo y lo hace crecer.
async function tender(P, puntos, r, color, ms) {
  const malla = P.k.tubo(new THREE.CatmullRomCurve3(puntos), r, color, 0.06, 90);
  malla.geometry.setDrawRange(0, 0);
  P.fijo.add(malla);
  await crecer(malla, ms);
  return malla;
}

function curvaCordon(a, b, { comba = 1.2, rizo = 0 } = {}) {
  const pts = [];
  const n = rizo ? 28 : 10;
  const dir = b.clone().sub(a);
  const lado = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y += Math.sin(Math.PI * t) * comba;
    if (rizo && i > 0 && i < n) p.addScaledVector(lado, Math.sin(i * 1.9) * rizo);
    pts.push(p);
  }
  return new THREE.CatmullRomCurve3(pts);
}

function brilloRojo(padre, w, h, d, pos) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: 0xff3b2f, transparent: true, opacity: 0, depthWrite: false }));
  m.position.copy(pos); padre.add(m);
  return m;
}
const pulsoRojo = (brillo, ms = 1600, max = 0.55) =>
  animar(ms, (_, t) => { brillo.material.opacity = max * Math.abs(Math.sin(t * Math.PI * 3)); }, ease.lineal);

async function pulsarBoton(ctx) {
  const b = ctx.piezas.caja.boton;
  ctx.enfocar(V(CAJA.x1, 8, -15), 600, V(0.75, 0.7, 0.55));
  await esperar(500);
  ctx.burbuja('Botón de encendido', V(CAJA.x1 + 1, 13, -16));
  await animar(180, t => { b.position.x = CAJA.x1 + 0.15 - 0.3 * t; }, ease.salida);
  await animar(220, t => { b.position.x = CAJA.x1 - 0.15 + 0.3 * t; }, ease.salida);
}

/* ---------------- CAJA ---------------- */
function caja() {
  const P = nuevaPieza('caja', {
    nombre: 'Caja (chasis)',
    texto: 'Está tumbada para trabajar mejor. Al fondo va la placa base, sobre separadores; abajo, la fuente. Las piezas de metal sin pintar sirven para conectar la pulsera.',
    foco: () => V(-45, 0, 0),
  });
  const { k } = P, c = P.cuerpo;
  const { x0, x1, z0, z1, suelo, alto } = CAJA;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
  poner(c, k.caja(w, suelo, d, C.chasis, 0.09), cx, suelo / 2, cz);
  // Agujeros del fondo: hay más de los que necesita esta placa
  for (const [hx, hz] of [...AGUJEROS, [7, -11.4], [-7, 11.4], [14, 0], [-14, 0], [7, 11.4], [-7, -11.4]])
    poner(c, k.cil(0.42, 0.03, 0x232733, 0, 14), hx + DENTRO.x, suelo + 0.02, hz + DENTRO.z);
  // Pared de arriba de la torre (al fondo de la escena)
  poner(c, k.caja(w, alto, 0.8, C.chasis, 0.07), cx, alto / 2, z0 + 0.4);
  // Panel trasero, con hueco para la chapa y tapas de las ranuras de expansión
  const tras = (y0, y1, za, zb) => poner(c, k.caja(0.8, y1 - y0, zb - za, C.chasis, 0.05), x0 + 0.4, (y0 + y1) / 2, (za + zb) / 2);
  tras(0, 1.5, z0, 5.6); tras(1.5, alto, z0, -19); tras(5.2, alto, -19, -1); tras(1.5, 5.2, -2, -1); tras(13.5, alto, -1, 5.6);
  const tapas = [[-0.6, 1.4], [1.6, 3.6], [3.8, 5.4]].map(([a, b]) => poner(c, k.caja(0.3, 12, b - a - 0.1, C.metal, 0.03), x0 + 0.5, 7.5, (a + b) / 2));
  // Postes de las esquinas: metal sin pintar
  for (const [x, z] of [[x0 + 0.45, z0 + 0.45], [x1 - 0.45, z0 + 0.45], [x0 + 0.45, z1 - 0.45], [x1 - 0.45, z1 - 0.45]])
    poner(c, k.caja(0.9, alto + 0.3, 0.9, C.metal, 0.05), x, (alto + 0.3) / 2, z);
  // Paredes que miran a la cámara: transparentes para ver el interior
  const vidrio = new THREE.MeshBasicMaterial({ color: 0x9fb6d0, transparent: true, opacity: 0.16, depthWrite: false });
  const linea = new THREE.LineBasicMaterial({ color: TINTA });
  const pared = (pw, ph, pd, x, y, z) => {
    const g = new THREE.BoxGeometry(pw, ph, pd);
    const m = poner(c, new THREE.Mesh(g, vidrio), x, y, z);
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(g), linea);
    m.add(l);
    m.userData.atraviesa = l.userData.atraviesa = true;
  };
  pared(0.8, alto, d - 1.8, x1 - 0.4, alto / 2, cz);
  pared(w - 1.8, alto, 0.8, cx, alto / 2, z1 - 0.4);
  // Frontal: botón, LED y USB por fuera
  poner(c, k.caja(0.5, 4.5, 9, C.negro, 0.05), x1 + 0.1, 10, -13);
  const boton = new THREE.Group(); boton.position.set(x1 + 0.15, 10, -16); c.add(boton);
  const b = k.cil(0.9, 0.5, C.naranja, 0.05, 20); b.rotation.z = Math.PI / 2; boton.add(b);
  const ledFrente = k.cil(0.25, 0.3, 0x3a3f4b, 0.03, 10, { propio: true }); ledFrente.rotation.z = Math.PI / 2;
  poner(c, ledFrente, x1 + 0.45, 10, -14.2);
  for (const z of [-12, -10.4]) poner(c, k.caja(0.3, 0.6, 1.2, 0x232733, 0.03), x1 + 0.45, 10, z);
  Object.assign(P, { tapas, boton, ledFrente });
  return P;
}

/* ---------------- PLACA BASE ---------------- */
function placa() {
  const P = nuevaPieza('placa', {
    nombre: 'Placa base',
    texto: 'La pieza central. El procesador, la refrigeración, la RAM y el SSD se le ponen fuera, sobre la mesa: es más cómodo. Luego se mete en la caja y se atornilla sobre los separadores, sin apretar de más.',
    accion: 'Meterla y atornillarla en la caja',
    tituloMal: 'Apretar demasiado los tornillos',
    textoMal: 'Los tornillos de la placa se aprietan suaves. Si te pasas, la placa se dobla o se raja y puede dejar de funcionar.',
    requiere: ['chapa', 'separadores'],
  });
  const { k } = P, c = P.cuerpo;
  P.foco = () => P.grupo.position.clone();
  poner(c, k.caja(30.5, 0.25, 24.4, C.pcb, 0.09), 0, 0.125, 0);
  for (const [x, z] of AGUJEROS) poner(c, k.cil(0.35, 0.06, C.metal, 0.03, 16), x, 0.28, z);
  const tornillos = AGUJEROS.map(([x, z]) => nuevoTornillo(k, c, x, 2.5, z));

  // Zócalo del procesador
  poner(c, k.caja(5.2, 0.35, 5.6, 0xe9e2d0, 0.05), -3, 0.425, -4);
  poner(c, k.caja(4.0, 0.04, 4.6, 0xb9b09c, 0), -3, 0.62, -4);
  poner(c, k.cil(0.3, 0.04, C.oro, 0.02, 3), -5.15, 0.62, -1.55);
  const marco = new THREE.Group(); marco.position.set(-5.5, 0.82, -4); c.add(marco);
  const barra = (w, d, x, z) => poner(marco, k.caja(w, 0.1, d, C.metal, 0.04), x, 0, z);
  barra(5, 0.9, 2.5, -2.25); barra(5, 0.9, 2.5, 2.25); barra(0.9, 3.6, 0.45, 0); barra(0.9, 3.6, 4.55, 0);
  const palanca = new THREE.Group(); palanca.position.set(-0.1, 0.72, -1.1); c.add(palanca);
  const vara = k.cil(0.13, 5.8, C.metal, 0.04, 10); vara.rotation.x = Math.PI / 2; vara.position.z = -2.9; palanca.add(vara);
  const mango = k.cil(0.2, 0.9, C.metal, 0.04, 10); mango.rotation.z = Math.PI / 2; mango.position.set(0.45, 0, -5.8); palanca.add(mango);

  poner(c, k.caja(8, 1.2, 1.4, C.metalOscuro), -4, 0.85, -9.4);
  poner(c, k.caja(1.4, 1.2, 7, C.metalOscuro), -8.6, 0.85, -3.5);
  // Conectores traseros (encajan en la chapa)
  poner(c, k.caja(2.5, 2.6, 16, C.chasis, 0.07), -14, 1.55, -3);
  for (const [z, col] of [[-9, C.azul], [-5.5, C.negro], [-2, C.azul], [1.5, C.verde]]) poner(c, k.caja(0.1, 1.2, 1.8, col, 0), -15.3, 1.6, z);

  // Ranuras de RAM con pestañas y la llave que encaja en la muesca
  const pestanas = [];
  for (const x of [6.0, 7.4]) {
    poner(c, k.caja(0.6, 0.7, 13.3, C.ranura, 0.05), x, 0.6, -3);
    poner(c, k.caja(0.64, 0.12, 0.3, C.amarillo, 0.02), x, 0.98, -3 - 1.6);
    for (const s of [-1, 1]) {
      const piv = new THREE.Group(); piv.position.set(x, 0.25, -3 + s * 6.85); c.add(piv);
      poner(piv, k.caja(0.62, 0.95, 0.32, C.crema, 0.04), 0, 0.48, 0);
      if (x === 6.0) pestanas.push({ piv, s });
    }
  }

  poner(c, k.caja(1.3, 1.4, 5.2, C.negro), 13.6, 0.95, -1);           // 24 pines
  poner(c, k.caja(2.2, 1.2, 1.0, C.negro), -11.5, 0.85, -11.2);       // EPS 8 pines
  poner(c, k.caja(1.2, 0.55, 0.5, C.negro, 0.03), 1.5, 0.52, -10.6);  // CPU_FAN
  poner(c, k.caja(0.8, 0.5, 2.4, C.negro, 0.04), -9.4, 0.5, 4.5);     // M.2
  poner(c, k.cil(0.28, 0.3, C.oro, 0.03, 12), -1.7, 0.4, 4.5);
  poner(c, k.caja(9, 0.9, 0.8, C.ranura), -6, 0.7, 9.2);              // PCIe x16
  poner(c, k.caja(4, 0.8, 4, C.metalOscuro), 4.5, 0.65, 8.2);         // chipset
  poner(c, k.caja(4.02, 0.12, 0.7, C.naranja, 0), 4.5, 1.1, 8.2);
  poner(c, k.cil(1.0, 0.2, C.metal, 0.04, 24), 8.5, 0.35, 4);
  for (let i = 0; i < 4; i++) poner(c, k.cil(0.4, 1.0, C.lila, 0.04, 14), 10.8, 0.75, -9 + i * 1.1);
  poner(c, k.caja(2.0, 0.5, 0.6, C.negro, 0.03), 13.2, 0.5, 11.2);    // F_PANEL
  poner(c, k.caja(1.6, 0.5, 0.6, C.azul, 0.03), 9.5, 0.5, 11.2);      // USB frontal
  const led = poner(c, k.caja(0.6, 0.25, 0.35, 0x3a3f4b, 0.03, { propio: true }), 11, 0.38, 7.5);

  // Cable del ventilador del procesador (CPU_FAN); crece al montar el disipador
  const cableFan = k.tubo(new THREE.CatmullRomCurve3([V(-0.1, 3.2, -1.2), V(0.9, 1.5, -3), V(1.4, 1.1, -8), V(1.5, 1.0, -10.6)]), 0.13, C.negro, 0.06, 90);
  cableFan.geometry.setDrawRange(0, 0);
  c.add(cableFan);
  // Clavijas de los cables de la fuente (aparecen al conectarlos)
  const p24 = poner(c, k.caja(1.4, 1.2, 5.3, C.cable, 0.05), 13.6, 2.25, -1); p24.scale.setScalar(0.001); p24.visible = false;
  const p8 = poner(c, k.caja(2.3, 1.0, 1.1, C.cable, 0.05), -11.5, 1.95, -11.2); p8.scale.setScalar(0.001); p8.visible = false;

  const gota = k.esfera(1, 0x9aa3ad, 0.04);
  gota.position.set(-3, 1.0, -4); gota.scale.setScalar(0.001);
  c.add(gota);

  Object.assign(P, { marco, palanca, pestanas, led, cableFan, gota, p24, p8 });

  const meter = async (ctx, destino) => {
    ctx.enfocar(V(-46, 2, -8), 900);
    await volar(P.grupo, destino, { altura: 12, ms: 1400 });
    ctx.burbuja('Conectores por la chapa', V(-62, 8, -10));
  };
  P.montar = async ctx => {
    await meter(ctx, DENTRO.clone());
    for (const t of tornillos) { t.visible = true; await girarTornillo(t, 2.5, 0.35, 300); }
    ctx.burbuja('Atornillada, sin apretar de más', V(-46, 6, 4));
  };
  P.mal = async ctx => {
    await meter(ctx, DENTRO.clone());
    for (const t of tornillos.slice(0, 3)) { t.visible = true; await girarTornillo(t, 2.5, 0.35, 300); }
    const t = tornillos[3]; t.visible = true;
    await girarTornillo(t, 2.5, 0.2, 900, 7);
    ctx.burbuja('¡Crac!', ctx.enPlaca(14, 3, 11.4), 'peligro');
    const brillo = brilloRojo(P.cuerpo, 3, 0.5, 3, V(14, 0.2, 11.4));
    await Promise.all([temblar(P.grupo, 'x', 0.02), pulsoRojo(brillo, 1400)]);
  };
  return P;
}

/* ---------------- PULSERA ANTIESTÁTICA ---------------- */
function pulsera() {
  const P = nuevaPieza('pulsera', {
    nombre: 'Pulsera antiestática',
    texto: 'Descarga la electricidad estática de tu cuerpo. La pinza va a una parte metálica sin pintar de la caja. Se pone lo primero, antes de tocar ningún componente.',
    accion: 'Ponerla y conectar la pinza',
    tituloMal: 'Tocar las piezas sin pulsera',
    textoMal: 'Una descarga de electricidad estática puede estropear un chip sin que se note a simple vista. El equipo puede fallar días después.',
    foco: () => V(-23, 2, 16),
  });
  const { k } = P, c = P.cuerpo;
  const banda = k.toro(2.0, 0.55, C.azul); banda.rotation.x = Math.PI / 2; poner(c, banda, -21, 0.55, 15);
  poner(c, k.cil(0.45, 0.5, C.metal, 0.04, 16), -18.9, 0.6, 15);
  zona(c, 6, 2, 6, -21, 0.8, 15);
  const pinza = new THREE.Group(); pinza.position.set(-17.5, 0.35, 21); pinza.rotation.y = 0.6; c.add(pinza);
  poner(pinza, k.caja(2.0, 0.3, 0.8, C.rojo, 0.04), 0, 0, 0);
  const mand2 = poner(pinza, k.caja(2.0, 0.3, 0.8, C.rojo, 0.04), 0, 0.45, 0);
  mand2.rotation.z = 0.35;
  zona(pinza, 3.5, 2, 2.5, 0, 0.3, 0);

  const a = V(-18.9, 0.6, 15);
  const cordon = k.tubo(curvaCordon(a, V(-17.5, 0.4, 21), { rizo: 0.35 }), 0.12, C.amarillo, 0.05, 60);
  P.grupo.add(cordon);
  const ult = new THREE.Vector3(Infinity, 0, 0), tmp = new THREE.Vector3();
  P.actualizarCordon = () => {
    pinza.getWorldPosition(tmp);
    if (tmp.distanceToSquared(ult) < 1e-4) return;
    ult.copy(tmp);
    const ini = a.clone(); ini.y += P.cuerpo.position.y;
    cambiarGeometria(cordon, new THREE.TubeGeometry(curvaCordon(ini, tmp, { rizo: 0.35, comba: 2.5 }), 60, 0.12, 6, false));
  };

  P.montar = async ctx => {
    ctx.enfocar(V(-24, 6, 18));
    await volar(pinza, V(CAJA.x1 - 0.45, CAJA.alto + 0.5, CAJA.z1 - 0.45), { rot: E(0, Math.PI / 2, 0), altura: 6, ms: 1000 });
    await animar(220, t => { mand2.rotation.z = 0.35 * (1 - t); }, ease.salida);
    ctx.burbuja('Pinza a metal sin pintar', V(CAJA.x1, CAJA.alto + 3, CAJA.z1));
  };
  P.mal = async ctx => {
    const cpu = ctx.piezas.cpu;
    ctx.enfocar(cpu.grupo.position.clone());
    await esperar(400);
    ctx.chispas(cpu.grupo.position.clone().add(V(0, 1.5, 0)), false);
    ctx.burbuja('¡Zas! Descarga', cpu.grupo.position.clone().add(V(0, 4, 0)), 'peligro');
    await pulsoRojo(brilloRojo(cpu.grupo, 4.2, 0.8, 4.8, V(0, 0.3, 0)));
  };
  return P;
}

/* ---------------- PROCESADOR ---------------- */
function cpu() {
  const P = nuevaPieza('cpu', {
    nombre: 'Procesador (CPU)',
    texto: 'Se abre la palanca, se alinea el triángulo dorado del procesador con el del zócalo y se deja caer sin presionar. Luego se cierra la palanca.',
    accion: 'Colocar en el zócalo',
    tituloMal: 'Ponerlo girado',
    textoMal: 'Girado no encaja. Si se fuerza, se doblan los contactos del zócalo y la placa queda inservible. Triángulo con triángulo y sin apretar.',
    requiere: ['pulsera'],
  });
  const { k } = P, c = P.cuerpo;
  poner(c, k.caja(3.8, 0.15, 4.4, 0x2c8a4a, 0.04), 0, 0.075, 0);
  poner(c, k.caja(3.0, 0.25, 3.4, C.metal, 0.04), 0, 0.275, 0);
  poner(c, k.cil(0.28, 0.02, C.oro, 0, 3), -1.6, 0.16, 1.9);
  poner(c, k.caja(1.4, 0.02, 0.5, C.naranja, 0), 0, 0.41, 0.6);
  P.grupo.position.set(-14, 0, 18.5); P.grupo.rotation.y = 0.7;
  P.foco = () => P.grupo.getWorldPosition(new THREE.Vector3());

  const abrir = async B => {
    await animar(350, t => { B.palanca.rotation.x = 1.2 * t; }, ease.salida);
    await animar(450, t => { B.marco.rotation.z = 2.0 * t; }, ease.salida);
  };
  P.montar = async ctx => {
    const B = ctx.placa, dest = ctx.enPlaca(-3, 0.6, -4);
    ctx.enfocar(dest);
    await abrir(B);
    await volar(P.grupo, dest.clone().add(V(0, 3, 0)), { rot: E(0, 0, 0), altura: 8, ms: 950 });
    ctx.burbuja('Triángulo con triángulo', ctx.enPlaca(-5.2, 2.2, -1.6));
    await bajarA(P.grupo, dest.y, 520);
    await animar(420, t => { B.marco.rotation.z = 2.0 * (1 - t); }, ease.rebote);
    await animar(320, t => { B.palanca.rotation.x = 1.2 * (1 - t); }, ease.salida);
    ctx.burbuja('¡clac!', ctx.enPlaca(0.3, 2, -6.5));
    ctx.alPlaca(P.grupo);
  };
  P.mal = async ctx => {
    const B = ctx.placa, dest = ctx.enPlaca(-3, 1.1, -4);
    ctx.enfocar(dest);
    await abrir(B);
    await volar(P.grupo, dest.clone().add(V(0, 2.5, 0)), { rot: E(0, Math.PI / 2, 0), altura: 8, ms: 950 });
    await bajarA(P.grupo, dest.y, 450);
    ctx.burbuja('¡No encaja!', dest.clone().add(V(0, 3, 0)), 'peligro');
    await temblar(P.grupo, 'z', 0.1);
  };
  return P;
}

/* ---------------- PASTA TÉRMICA ---------------- */
function pasta() {
  const P = nuevaPieza('pasta', {
    nombre: 'Pasta térmica',
    texto: 'Rellena los huecos microscópicos entre el procesador y el disipador para que el calor pase bien. Basta una gota pequeña en el centro: al apretar el disipador se reparte sola.',
    accion: 'Poner una gota',
    tituloMal: 'Poner demasiada',
    textoMal: 'Más pasta no enfría más. Si te pasas, se sale por los bordes y mancha el zócalo y la placa.',
    requiere: ['cpu'],
  });
  const { k } = P, c = P.cuerpo;
  const cuerpoJ = k.cil(0.5, 4, C.crema, 0.05, 16); cuerpoJ.rotation.z = Math.PI / 2; poner(c, cuerpoJ, 0, 0, 0);
  const banda = k.cil(0.52, 1.2, C.naranja, 0.0, 16); banda.rotation.z = Math.PI / 2; poner(c, banda, -0.4, 0, 0);
  const punta = k.cono(0.12, 0.5, 1.0, C.metalOscuro, 0.04, 12); punta.rotation.z = -Math.PI / 2; poner(c, punta, 2.5, 0, 0);
  const embolo = k.cil(0.7, 0.2, C.negro, 0.04, 16); embolo.rotation.z = Math.PI / 2; poner(c, embolo, -2.2, 0, 0);
  zona(c, 6, 2, 2, 0, 0, 0);
  P.grupo.position.set(-7, 0.55, 20); P.grupo.rotation.y = -0.3;
  const reposo = { p: P.grupo.position.clone(), r: P.grupo.rotation.clone() };
  P.foco = () => P.grupo.position.clone();

  const aplicar = async (ctx, escala, texto, tipo) => {
    const sobre = ctx.enPlaca(-3, 5.6, -4);
    ctx.enfocar(ctx.enPlaca(-3, 0, -4));
    await volar(P.grupo, sobre, { rot: E(0, 0, -Math.PI / 2), altura: 7, ms: 900 });
    await bajarA(P.grupo, ctx.enPlaca(0, 4.35, 0).y, 300);
    const gota = ctx.placa.gota;
    await animar(escala > 1 ? 1300 : 650, t => gota.scale.set(0.8 * escala * t + 0.001, 0.35 * Math.min(escala, 1.6) * t + 0.001, 0.8 * escala * t + 0.001), ease.salida);
    ctx.burbuja(texto, ctx.enPlaca(-3, 3.5, -4), tipo);
    await bajarA(P.grupo, sobre.y + 0.4, 250);
    await volar(P.grupo, reposo.p, { rot: reposo.r, altura: 6, ms: 800 });
  };
  P.montar = ctx => aplicar(ctx, 1, 'Una gota pequeña');
  P.mal = ctx => aplicar(ctx, 3.2, '¡Demasiada!', 'peligro');
  return P;
}

/* ---------------- DISIPADOR ---------------- */
function disipador() {
  const P = nuevaPieza('disipador', {
    nombre: 'Disipador con ventilador',
    texto: 'Se apoya sobre el procesador, se atornilla y su ventilador se conecta a CPU_FAN. Sin él, el procesador se calienta y se apaga en segundos.',
    accion: 'Montar, atornillar y conectar',
    tituloMal: 'Montarlo sin pasta',
    textoMal: 'Sin pasta queda aire entre el procesador y el disipador, y el aire conduce muy mal el calor. El procesador se calienta y se apaga para protegerse.',
    requiere: ['pasta'],
  });
  const { k } = P, c = P.cuerpo;
  poner(c, k.caja(4, 0.5, 4, C.cobre, 0.05), 0, 0.25, 0);
  for (const x of [-1.2, -0.4, 0.4, 1.2]) poner(c, k.cil(0.22, 9, C.cobre, 0.04, 10), 0, 5, x * 2.5);
  for (let i = 0; i < 13; i++) poner(c, k.caja(4.5, 0.14, 11, C.metal, 0.035), 0, 2.2 + i * 0.75, 0);
  poner(c, k.caja(4.8, 0.5, 11.3, C.negro, 0.06), 0, 11.6, 0);
  poner(c, k.caja(1.0, 0.04, 11.32, C.naranja, 0), 0, 11.87, 0);
  for (const [w, h, d, y, z] of [[1, 0.9, 10.5, 2.2, 0], [1, 0.9, 10.5, 11.8, 0], [1, 10.5, 0.9, 7, -4.8], [1, 10.5, 0.9, 7, 4.8]])
    poner(c, k.caja(w, h, d, C.negro, 0.05), 2.75, y, z);
  const rotor = new THREE.Group(); rotor.position.set(2.75, 7, 0); c.add(rotor);
  const buje = k.cil(1.3, 0.9, C.negro, 0.05, 20); buje.rotation.z = Math.PI / 2; rotor.add(buje);
  for (let i = 0; i < 7; i++) {
    const brazo = new THREE.Group(); brazo.rotation.x = (i / 7) * Math.PI * 2; rotor.add(brazo);
    const pala = poner(brazo, k.caja(0.15, 3.3, 1.9, C.naranja, 0.04), 0, 2.9, 0); pala.rotation.y = 0.45;
  }
  poner(c, k.caja(0.8, 0.25, 7.6, C.metalOscuro, 0.04), 0, 0.4, 0);
  const tornillos = [-3.5, 3.5].map(z => {
    const t = new THREE.Group(); t.position.set(0, 1.7, z); c.add(t);
    poner(t, k.cil(0.4, 0.2, C.metal, 0.04, 12), 0, 0.5, 0);
    poner(t, k.cil(0.18, 0.9, C.metal, 0.03, 8), 0, 0, 0);
    return t;
  });
  P.grupo.position.set(-6, 0, -20); P.grupo.rotation.y = Math.PI / 2;
  P.foco = () => P.grupo.getWorldPosition(new THREE.Vector3());
  Object.assign(P, { rotores: [{ obj: rotor, eje: 'x' }], velocidad: 0 });

  const bajarSobreCpu = async ctx => {
    const dest = ctx.enPlaca(-3, 1.05, -4);
    ctx.enfocar(dest.clone().add(V(0, 3, 0)));
    await volar(P.grupo, dest.clone().add(V(0, 6, 0)), { rot: E(0, 0, 0), altura: 6, ms: 1000 });
    const gota = ctx.placa.gota, s0 = gota.scale.clone(), y0 = P.grupo.position.y;
    await animar(550, t => {
      P.grupo.position.y = y0 + (dest.y - y0) * t;
      if (t > 0.85 && s0.x > 0.01) { const u = (t - 0.85) / 0.15; gota.scale.set(s0.x + 0.75 * u, s0.y * (1 - 0.85 * u), s0.z + 0.75 * u); }
    }, ease.salida);
  };
  const atornillar = async () => {
    for (const t of tornillos) await girarTornillo(t, 1.7, 0.6, 380);
  };

  P.montar = async ctx => {
    await bajarSobreCpu(ctx);
    ctx.burbuja('La pasta se reparte', ctx.enPlaca(-3, 2.5, 1));
    await atornillar();
    ctx.burbuja('¡Atornillado!', ctx.enPlaca(-3, 13, -4));
    await crecer(ctx.placa.cableFan, 700);
    ctx.burbuja('A CPU_FAN', ctx.enPlaca(1.5, 3, -10.6));
    P.velocidad = 18;
    ctx.alPlaca(P.grupo);
  };
  P.mal = async ctx => {
    ctx.placa.gota.scale.setScalar(0.001);
    ctx.burbuja('Sin pasta…', ctx.enPlaca(-3, 4, -4));
    await bajarSobreCpu(ctx);
    await atornillar();
    ctx.placa.cableFan.geometry.setDrawRange(0, Infinity);
    P.velocidad = 22;
    const brillo = brilloRojo(P.cuerpo, 5, 1.2, 5, V(0, 0.2, 0));
    const temps = ['45 °C', '70 °C', '95 °C', '¡Se apaga!'];
    for (let i = 0; i < temps.length; i++) {
      ctx.burbuja(temps[i], ctx.enPlaca(-3, 6 + i * 2.2, 1), i === temps.length - 1 ? 'peligro' : '');
      await animar(650, t => { brillo.material.opacity = 0.15 + 0.17 * (i + t); }, ease.lineal);
    }
    P.velocidad = 0;
  };
  return P;
}

/* ---------------- MEMORIA RAM ---------------- */
function ram() {
  const P = nuevaPieza('ram', {
    nombre: 'Memoria RAM',
    texto: 'Se abren las pestañas, se alinea la muesca del módulo con la de la ranura y se empuja por los dos extremos hasta oír «clic».',
    accion: 'Insertar en la ranura',
    tituloMal: 'Ponerla al revés',
    textoMal: 'La muesca no está en el centro: solo entra en una posición. Si no entra, no se aprieta más: se le da la vuelta.',
    requiere: ['pulsera'],
  });
  const { k } = P, c = P.cuerpo;
  poner(c, k.caja(13.3, 3.1, 0.12, 0x2c8a4a, 0.035), 0, 1.55, 0);
  poner(c, k.caja(12.6, 0.45, 0.14, C.oro, 0.02), 0, 0.225, 0);
  poner(c, k.caja(0.3, 0.47, 0.18, C.amarillo, 0.02), 1.6, 0.225, 0);
  poner(c, k.caja(13.0, 2.3, 0.34, C.rojo, 0.05), 0, 1.85, 0);
  poner(c, k.caja(4.5, 0.35, 0.36, C.crema, 0), -2.8, 2.2, 0);
  const luz = poner(c, k.caja(12.8, 0.35, 0.3, 0xf2f2f2, 0.04, { propio: true }), 0, 3.25, 0);
  P.grupo.position.set(14, 0.17, 20.5); P.grupo.rotation.set(-Math.PI / 2, 0, 0);
  P.foco = () => P.grupo.getWorldPosition(new THREE.Vector3());
  P.luz = luz;

  const pestanas = (B, abrir, ms, e) => animar(ms, t => B.pestanas.forEach(({ piv, s }) => { piv.rotation.x = s * 0.6 * (abrir ? t : 1 - t); }), e);

  P.montar = async ctx => {
    const B = ctx.placa, dest = ctx.enPlaca(6.0, 0.55, -3);
    ctx.enfocar(ctx.enPlaca(6.5, 2, -3));
    await pestanas(B, true, 300, ease.salida);
    await volar(P.grupo, dest.clone().add(V(0, 6, 0)), { rot: E(0, Math.PI / 2, 0), altura: 6, ms: 1000 });
    ctx.burbuja('Muesca con muesca', ctx.enPlaca(6, 5, -4.6));
    await bajarA(P.grupo, dest.y, 450, ease.suave);
    await pestanas(B, false, 260, ease.rebote);
    ctx.burbuja('¡clic!', ctx.enPlaca(6, 2.5, -9.9));
    ctx.burbuja('¡clic!', ctx.enPlaca(6, 2.5, 3.9));
    ctx.alPlaca(P.grupo);
  };
  P.mal = async ctx => {
    const B = ctx.placa, dest = ctx.enPlaca(6.0, 1.3, -3);
    ctx.enfocar(ctx.enPlaca(6.5, 2, -3));
    await pestanas(B, true, 300, ease.salida);
    await volar(P.grupo, dest.clone().add(V(0, 5, 0)), { rot: E(0, -Math.PI / 2, 0), altura: 6, ms: 1000 });
    await bajarA(P.grupo, dest.y, 400, ease.suave);
    ctx.burbuja('¡No entra!', dest.clone().add(V(0, 4, 0)), 'peligro');
    await temblar(P.grupo, 'x', 0.06);
  };
  return P;
}

/* ---------------- SSD M.2 ---------------- */
function ssd() {
  const P = nuevaPieza('ssd', {
    nombre: 'SSD M.2',
    texto: 'Entra en diagonal en su ranura, se baja hasta quedar plano y se fija con su tornillo. No lleva cables.',
    accion: 'Insertar y atornillar',
    tituloMal: 'Olvidar el tornillo',
    textoMal: 'Sin tornillo, el SSD vuelve a levantarse y puede soltarse de la ranura. Siempre se fija.',
    requiere: ['pulsera'],
  });
  const { k } = P, c = P.cuerpo;
  poner(c, k.caja(8, 0.12, 2.2, 0x2b3a67, 0.035), 4, 0.06, 0);
  poner(c, k.caja(0.5, 0.13, 2.0, C.oro, 0.02), 0.25, 0.06, 0);
  poner(c, k.caja(2.0, 0.12, 1.6, C.negro, 0.025), 2.2, 0.18, 0);
  poner(c, k.caja(2.0, 0.12, 1.6, C.negro, 0.025), 5.0, 0.18, 0);
  poner(c, k.caja(4.6, 0.03, 1.7, C.amarillo, 0), 3.6, 0.26, 0);
  const tornillo = new THREE.Group(); tornillo.position.set(7.8, 2.4, 0); tornillo.visible = false; c.add(tornillo);
  poner(tornillo, k.cil(0.35, 0.18, C.metal, 0.035, 12), 0, 0.12, 0);
  P.grupo.position.set(30, 0, 21); P.grupo.rotation.y = -0.5;
  P.foco = () => P.grupo.getWorldPosition(new THREE.Vector3());

  const meter = async ctx => {
    const pre = ctx.enPlaca(-7.0, 0.6, 4.5), fin = ctx.enPlaca(-9.5, 0.44, 4.5);
    ctx.enfocar(ctx.enPlaca(-5.5, 0, 4.5));
    await volar(P.grupo, pre, { rot: E(0, 0, 0.35), altura: 7, ms: 950 });
    ctx.burbuja('En diagonal', ctx.enPlaca(-6, 3, 4.5));
    await mover(P.grupo, fin, 450);
    await animar(380, t => { P.grupo.rotation.z = 0.35 * (1 - t); }, ease.salida);
  };
  P.montar = async ctx => {
    await meter(ctx);
    tornillo.visible = true;
    await animar(500, t => { tornillo.position.y = 2.4 - 2.2 * t; tornillo.rotation.y = t * Math.PI * 4; }, ease.salida);
    ctx.burbuja('¡Fijado!', ctx.enPlaca(-1.7, 2.5, 4.5));
    ctx.alPlaca(P.grupo);
  };
  P.mal = async ctx => {
    await meter(ctx);
    await esperar(300);
    await animar(500, t => { P.grupo.rotation.z = 0.32 * t; }, ease.muelle);
    ctx.burbuja('¡Se levanta!', ctx.enPlaca(-3, 4, 4.5), 'peligro');
    await esperar(600);
  };
  return P;
}

/* ---------------- CHAPA TRASERA (I/O) ---------------- */
function chapa() {
  const P = nuevaPieza('chapa', {
    nombre: 'Chapa trasera (I/O)',
    texto: 'Viene con la placa y tapa el hueco de los conectores traseros. Se encaja desde dentro de la caja, a presión, antes de meter la placa.',
    accion: 'Encajarla en la caja',
    tituloMal: 'Dejarla para después',
    textoMal: 'Con la placa ya dentro, la chapa no entra: los conectores de la placa le tapan el paso. Habría que sacar la placa otra vez.',
    requiere: ['pulsera'],
  });
  const { k } = P, c = P.cuerpo;
  poner(c, k.caja(0.15, 3.9, 17.2, C.metal, 0.04), 0, 0, 0);
  for (const [y, z, h, w] of [[0.6, -6, 1.2, 1.8], [0.6, -2.5, 1.2, 1.8], [0.6, 1, 1.2, 1.8], [0.6, 4.5, 1.2, 1.8], [-0.9, -4, 0.7, 4], [-0.9, 2.5, 0.7, 3]])
    poner(c, k.caja(0.18, h, w, 0x232733, 0), 0, y, z);
  P.grupo.position.set(20, 0.1, -21); P.grupo.rotation.set(0, 0, Math.PI / 2);
  P.foco = () => P.grupo.position.clone();
  const dentro = V(CAJA.x0 + 0.9, 3.35, -10.5);

  P.montar = async ctx => {
    ctx.enfocar(V(-58, 3, -10), 800, V(0.7, 0.75, 0.6));
    await volar(P.grupo, dentro.clone().add(V(2.5, 0, 0)), { rot: E(0, 0, 0), altura: 9, ms: 1100 });
    await mover(P.grupo, dentro, 350, ease.rebote);
    ctx.burbuja('¡Clac! Desde dentro', dentro.clone().add(V(2, 5, 0)));
  };
  P.mal = async ctx => {
    const B = ctx.placa;
    ctx.enfocar(V(-50, 3, -8), 800);
    await volar(B.grupo, DENTRO.clone(), { altura: 12, ms: 1300 });
    ctx.burbuja('La placa ya está dentro…', V(-46, 8, -8));
    const encima = dentro.clone().add(V(2.5, 6, 0));
    await volar(P.grupo, encima, { rot: E(0, 0, 0), altura: 6, ms: 1000 });
    await bajarA(P.grupo, 6.6, 400, ease.rebote);
    ctx.burbuja('¡Ya no entra!', encima.clone().add(V(0, 3, 0)), 'peligro');
    await temblar(P.grupo, 'x', 0.08);
  };
  return P;
}

/* ---------------- SEPARADORES ---------------- */
function separadores() {
  const P = nuevaPieza('separadores', {
    nombre: 'Separadores',
    texto: 'Elevan la placa para que no toque el metal de la caja. Se ponen solo donde la placa tiene agujeros: ni uno más ni uno menos.',
    accion: 'Ponerlos en su sitio',
    tituloMal: 'Montar sin separadores',
    textoMal: 'Sin separadores, la parte de abajo de la placa toca el metal de la caja: cortocircuito al encender.',
    requiere: ['pulsera'],
    foco: () => V(2, 0, 22),
  });
  const { k } = P, c = P.cuerpo;
  const piezas = AGUJEROS.map((_, i) => {
    const s = new THREE.Group(); s.position.set(0 + (i % 3) * 1.4, 0.4, 21 + Math.floor(i / 3) * 1.4); c.add(s);
    poner(s, k.cil(0.4, 0.8, C.oro, 0.035, 6), 0, 0, 0);
    return s;
  });
  zona(c, 5, 2, 4, 1.4, 0.5, 21.7);

  P.montar = async ctx => {
    ctx.enfocar(V(-46, 0, -8), 900);
    for (let i = 0; i < piezas.length; i++) {
      const [hx, hz] = AGUJEROS[i];
      await volar(piezas[i], V(hx + DENTRO.x, CAJA.suelo + 0.4, hz + DENTRO.z), { altura: 7, ms: 520 });
      if (i === 1) ctx.burbuja('Solo donde hay agujero', V(-46, 5, -19));
    }
  };
  P.mal = async ctx => {
    const B = ctx.placa;
    ctx.enfocar(V(-46, 0, -8), 900);
    await volar(B.grupo, DENTRO.clone().add(V(0, -0.8, 0)), { altura: 12, ms: 1300 });
    await esperar(300);
    ctx.chispas(V(-40, 1.2, -6), false);
    ctx.chispas(V(-52, 1.2, -12), false);
    ctx.burbuja('Toca el metal: ¡cortocircuito!', V(-46, 6, -8), 'peligro');
    await pulsoRojo(brilloRojo(B.cuerpo, 30, 0.4, 24, V(0, 0, 0)), 1500, 0.4);
  };
  return P;
}

/* ---------------- FUENTE DE ALIMENTACIÓN ---------------- */
function fuente() {
  const P = nuevaPieza('fuente', {
    nombre: 'Fuente de alimentación',
    texto: 'Se atornilla en su hueco de la caja con el interruptor en O. Convierte la corriente del enchufe en la que necesitan los componentes. La fuente no se abre nunca.',
    accion: 'Atornillarla en la caja',
    tituloMal: 'Abrir la fuente',
    textoMal: 'La fuente no se abre nunca: sus condensadores pueden guardar carga aunque esté desenchufada. Si falla, se cambia entera.',
    requiere: ['pulsera'],
  });
  const { k } = P, c = P.cuerpo;
  poner(c, k.caja(14, 8.0, 15, 0x4c566a, 0.09), 0, -0.3, 0);
  const tapa = new THREE.Group(); tapa.position.set(0, 3.7, 0); c.add(tapa);
  poner(tapa, k.caja(14, 0.6, 15, 0x4c566a, 0.07), 0, 0.3, 0);
  poner(tapa, k.cil(5.6, 0.12, C.negro, 0.05, 36), 0, 0.66, 0);
  const rotor = new THREE.Group(); rotor.position.set(0, 0.75, 0); tapa.add(rotor);
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Group(); b.rotation.y = (i / 5) * Math.PI * 2; rotor.add(b);
    const pala = poner(b, k.caja(4.4, 0.06, 1.3, C.metalOscuro, 0.03), 2.4, 0, 0); pala.rotation.x = 0.3;
  }
  for (let i = 0; i < 4; i++) { const r = poner(tapa, k.caja(11.2, 0.1, 0.25, C.metal, 0.02), 0, 0.95, 0); r.rotation.y = (i * Math.PI) / 4; }
  poner(c, k.caja(0.05, 3.2, 6, C.amarillo, 0), 7.03, 0.9, -3);
  for (const [y, z, h, d] of [[-1.1, 1, 1.6, 3.2], [1.7, -5, 1.2, 2.2], [-1.6, 5, 1.2, 2.6]]) poner(c, k.caja(0.3, h, d, C.negro, 0.04), 7.1, y, z);
  // Trasera: toma de corriente e interruptor
  poner(c, k.caja(0.3, 1.6, 2.4, 0x232733, 0.04), -7.1, -1.6, 3.4);
  const interruptor = poner(c, k.caja(0.35, 1.2, 0.9, C.rojo, 0.03, { propio: true }), -7.1, -1.6, -0.2);
  P.grupo.position.set(31, 4.3, -12);
  P.foco = () => P.grupo.position.clone();
  Object.assign(P, { rotores: [{ obj: rotor, eje: 'y' }], velocidad: 0, interruptor, tapa });

  P.montar = async ctx => {
    ctx.enfocar(V(-50, 3, 12), 900);
    await volar(P.grupo, FUENTE_DENTRO.clone(), { altura: 14, ms: 1400 });
    ctx.burbuja('En su hueco', V(-57, 12, 13));
    await esperar(300);
    ctx.burbuja('Interruptor en O', V(-63, 7, 13));
  };
  P.mal = async ctx => {
    ctx.enfocar(P.grupo.position.clone(), 700);
    await animar(700, t => { tapa.position.y = 3.7 + 3.2 * t; tapa.rotation.z = 0.5 * t; }, ease.salida);
    ctx.chispas(P.grupo.position.clone().add(V(0, 3, 0)), false);
    ctx.burbuja('¡Nunca se abre!', P.grupo.position.clone().add(V(0, 9, 0)), 'peligro');
    await esperar(1200);
  };
  return P;
}

/* ---------------- CABLE DE 24 PINES ---------------- */
function c24() {
  const P = nuevaPieza('c24', {
    nombre: 'Cable de 24 pines',
    texto: 'Lleva la corriente de la fuente a la placa. Tiene una pestaña: se empuja hasta el fondo, hasta que hace clic.',
    accion: 'Conectarlo a la placa',
    tituloMal: 'Dejarlo a medias',
    textoMal: 'Si no entra hasta el fondo, hace mal contacto: el equipo no arranca o se apaga solo. Se empuja hasta oír el clic de la pestaña.',
    requiere: ['placa', 'fuente'],
  });
  P.foco = () => V(-36, 2, -4);
  const camino = ctx => {
    const fin = ctx.enPlaca(13.6, 2.85, -1);
    return [V(-49.8, 3.5, 8), V(-45, 9, 8), V(-36, 10, 2), V(fin.x, 8, fin.z + 2), V(fin.x, 6, fin.z), fin];
  };
  P.montar = async ctx => {
    ctx.enfocar(V(-40, 3, 0), 800);
    await tender(P, camino(ctx), 0.5, C.cable, 1100);
    await aparecer(ctx.placa.p24);
    ctx.burbuja('¡Clic! 24 pines', ctx.enPlaca(13.6, 5, -1));
  };
  P.mal = async ctx => {
    ctx.enfocar(V(-40, 3, 0), 800);
    await tender(P, camino(ctx), 0.5, C.cable, 1100);
    const p = ctx.placa.p24;
    await aparecer(p);
    await animar(300, t => { p.position.y = 2.25 + 0.9 * t; p.rotation.x = 0.15 * t; }, ease.salida);
    ctx.burbuja('A medias…', ctx.enPlaca(13.6, 5, -1), 'peligro');
    await temblar(p, 'x', 0.08);
  };
  return P;
}

/* ---------------- CABLE EPS (8 PINES) ---------------- */
function eps() {
  const P = nuevaPieza('eps', {
    nombre: 'Cable EPS de 8 pines',
    texto: 'Alimenta el procesador. Su conector está arriba a la izquierda de la placa, junto al panel trasero. El cable se pasa por detrás para que no estorbe.',
    accion: 'Conectarlo junto al procesador',
    tituloMal: 'Olvidar el de 8 pines',
    textoMal: 'Con solo el de 24 pines el equipo no arranca: el procesador se alimenta por el conector EPS de 8 pines.',
    requiere: ['placa', 'fuente'],
  });
  P.foco = () => V(-56, 3, -14);
  P.montar = async ctx => {
    const fin = ctx.enPlaca(-11.5, 2.45, -11.2);
    ctx.enfocar(V(-56, 4, -8), 900);
    await tender(P, [V(-49.8, 6.5, 7), V(-55, 11, 5.6), V(-62.4, 14, 5.4), V(-62.4, 14, -15), V(fin.x - 1.5, 9, fin.z), fin], 0.35, C.cable, 1400);
    await aparecer(ctx.placa.p8);
    ctx.burbuja('8 pines: procesador', fin.clone().add(V(0, 3, 0)));
  };
  P.mal = async ctx => {
    await pulsarBoton(ctx);
    await esperar(400);
    ctx.enfocar(V(-50, 2, -10), 700);
    ctx.burbuja('…y no arranca', V(-49, 12, -11), 'peligro');
    await animar(900, (_, t) => { ctx.placa.led.material.emissive.setHex(Math.sin(t * Math.PI * 6) > 0 ? 0x7a1f1f : 0x000000); }, ease.lineal);
    ctx.placa.led.material.emissive.setHex(0);
    ctx.burbuja('Falta el EPS', ctx.enPlaca(-11.5, 4, -11.2), 'peligro');
    await esperar(900);
  };
  return P;
}

/* ---------------- TARJETA GRÁFICA ---------------- */
function gpu() {
  const P = nuevaPieza('gpu', {
    nombre: 'Tarjeta gráfica',
    texto: 'Se quita la tapa de la ranura en la caja, se inserta en la ranura PCIe x16 hasta el clic, se atornilla a la caja y se le conecta su cable PCIe de la fuente.',
    accion: 'Insertar, atornillar y conectar',
    tituloMal: 'No atornillarla',
    textoMal: 'La gráfica pesa. Sin tornillo a la caja, se inclina y dobla la ranura y la placa.',
    requiere: ['placa', 'fuente'],
  });
  const { k } = P, c = P.cuerpo;
  // Local: x a lo largo (soporte en x = 0), y hacia arriba desde los contactos, z grosor (ventiladores hacia +z)
  poner(c, k.caja(24, 11, 0.15, 0x2c8a4a, 0.035), 12, 5.5, 0);
  poner(c, k.caja(23.5, 10.4, 2.6, 0x3b4252, 0.06), 12.2, 5.6, 1.45);
  poner(c, k.caja(23.6, 0.6, 2.7, C.naranja, 0), 12.2, 10.6, 1.45);
  poner(c, k.caja(9, 0.5, 0.18, C.oro, 0.02), 9, -0.25, 0);
  poner(c, k.caja(0.15, 12.4, 2.0, C.metal, 0.03), -0.1, 6.0, 1.0);
  poner(c, k.caja(1.6, 0.15, 2.0, C.metal, 0.03), -0.85, 12.15, 1.0);
  poner(c, k.caja(2.2, 0.8, 1.2, C.negro, 0.03), 20, 11.3, 1.2);
  const rotores = [6.5, 17.5].map(x => {
    const r = new THREE.Group(); r.position.set(x, 5.6, 2.85); c.add(r);
    const buje = k.cil(1.0, 0.3, C.negro, 0.04, 16); buje.rotation.x = Math.PI / 2; r.add(buje);
    for (let i = 0; i < 7; i++) {
      const brazo = new THREE.Group(); brazo.rotation.z = (i / 7) * Math.PI * 2; r.add(brazo);
      const pala = poner(brazo, k.caja(1.2, 2.8, 0.08, C.metalOscuro, 0.03), 0, 2.4, 0); pala.rotation.y = 0.4;
    }
    return { obj: r, eje: 'z' };
  });
  const tornillo = nuevoTornillo(k, c, -0.85, 13.6, 1.0);
  P.grupo.position.set(19, 0.35, 12); P.grupo.rotation.set(-Math.PI / 2, 0, 0);
  P.foco = () => P.grupo.getWorldPosition(new THREE.Vector3()).add(V(12, 0, -5));
  Object.assign(P, { rotores, velocidad: 0 });

  const insertar = async ctx => {
    const dest = ctx.enPlaca(-15, 0.85, 9.2);
    ctx.enfocar(dest.clone().add(V(12, 4, 0)), 900);
    const tapa = ctx.piezas.caja.tapas[1];
    await animar(400, t => { tapa.position.y = 7.5 + 14 * t; tapa.scale.setScalar(Math.max(0.001, 1 - t)); }, ease.salida);
    tapa.visible = false;
    await volar(P.grupo, dest.clone().add(V(0, 5, 0)), { rot: E(0, 0, 0), altura: 8, ms: 1100 });
    await bajarA(P.grupo, dest.y, 450, ease.suave);
    ctx.burbuja('¡Clic! PCIe x16', dest.clone().add(V(12, 13, 0)));
  };
  P.montar = async ctx => {
    await insertar(ctx);
    tornillo.visible = true;
    await girarTornillo(tornillo, 13.6, 12.25, 450);
    ctx.alPlaca(P.grupo);
    P.cuerpo.updateWorldMatrix(true, false);
    ctx.burbuja('Atornillada a la caja', P.cuerpo.localToWorld(V(0, 15, 1)));
    const fin = P.cuerpo.localToWorld(V(20, 11.7, 1.2));
    await tender(P, [V(-49.8, 5, 9.5), V(-44, 10, 8), fin.clone().add(V(0, 3.5, 2)), fin], 0.35, C.cable, 900);
    ctx.burbuja('Cable PCIe', fin.clone().add(V(0, 3, 0)));
  };
  P.mal = async ctx => {
    await insertar(ctx);
    await esperar(300);
    const brillo = brilloRojo(ctx.placa.cuerpo, 10, 0.5, 1.6, V(-6, 0.9, 9.2));
    await animar(900, t => { P.grupo.rotation.x = 0.22 * t; }, ease.rebote);
    ctx.burbuja('Se dobla la ranura', P.grupo.position.clone().add(V(12, 12, 4)), 'peligro');
    await pulsoRojo(brillo, 1300);
  };
  return P;
}

/* ---------------- PANEL FRONTAL ---------------- */
function frontal() {
  const P = nuevaPieza('frontal', {
    nombre: 'Panel frontal',
    texto: 'Los cables del botón de encendido y los LED van a F_PANEL, y los USB del frontal a su conector. Cada pin, donde dice el manual de la placa.',
    accion: 'Conectar según el manual',
    tituloMal: 'Conectarlo sin mirar el manual',
    textoMal: 'Los pines de F_PANEL tienen un orden. Si se conectan al azar, el botón no enciende el equipo o los LED no funcionan.',
    requiere: ['placa'],
    foco: () => V(-32, 4, -4),
  });
  const cables = ctx => {
    const fp = ctx.enPlaca(13.2, 1.0, 11.2), usb = ctx.enPlaca(9.5, 1.0, 11.2);
    return {
      fp, usb,
      a: [V(CAJA.x1 - 1, 9.5, -15.5), V(-29.2, 6, -6), V(-30, 3.5, 1), V(fp.x + 0.5, 2.5, fp.z - 0.5), fp],
      b: [V(CAJA.x1 - 1, 9.5, -11.2), V(-29.6, 6.5, -4), V(-33, 4, 1.5), V(usb.x, 2.6, usb.z - 0.6), usb],
    };
  };
  P.montar = async ctx => {
    const r = cables(ctx);
    ctx.enfocar(V(-31, 3, -5), 900, V(0.75, 0.8, 0.6));
    await tender(P, r.a, 0.16, C.amarillo, 900);
    ctx.burbuja('F_PANEL según el manual', r.fp.clone().add(V(0, 3, 0)));
    await tender(P, r.b, 0.2, C.azul, 800);
    ctx.burbuja('USB del frontal', r.usb.clone().add(V(0, 4, 0)));
  };
  P.mal = async ctx => {
    const r = cables(ctx);
    ctx.enfocar(V(-31, 3, -5), 900, V(0.75, 0.8, 0.6));
    const malo = r.a.slice(0, -1).concat(r.usb.clone().add(V(0.6, 0, 0)));
    await tender(P, malo, 0.16, C.amarillo, 900);
    ctx.burbuja('¿Aquí? A ojo…', r.usb.clone().add(V(0, 3, 0)));
    await pulsarBoton(ctx);
    ctx.burbuja('No enciende', V(CAJA.x1, 15, -12), 'peligro');
    await esperar(1000);
  };
  return P;
}

/* ---------------- REVISIÓN FINAL ---------------- */
function revisar() {
  const P = nuevaPieza('revisar', {
    nombre: 'Revisión final',
    texto: 'Antes de enchufar: que no quede ningún tornillo suelto dentro de la caja y que ningún cable roce los ventiladores.',
    accion: 'Revisar el interior',
    tituloMal: 'Saltarse la revisión',
    textoMal: 'Un tornillo olvidado encima de la placa puede hacer cortocircuito al encender. Por eso se revisa todo antes de enchufar.',
    requiere: ['cpu', 'pasta', 'disipador', 'ram', 'ssd', 'chapa', 'separadores', 'placa', 'fuente', 'c24', 'eps', 'gpu', 'frontal'],
  });
  const { k } = P, c = P.cuerpo;
  const lupa = new THREE.Group(); lupa.position.set(40, 0.35, 23); lupa.rotation.y = 0.5; c.add(lupa);
  const aro = k.toro(1.8, 0.3, C.naranja, 0.05); aro.rotation.x = Math.PI / 2; lupa.add(aro);
  const cristal = new THREE.Mesh(new THREE.CircleGeometry(1.7, 24), new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
  cristal.rotation.x = -Math.PI / 2; lupa.add(cristal);
  const mango = k.cil(0.35, 3.5, C.negro, 0.04, 10); mango.rotation.z = Math.PI / 2; mango.position.x = 3.8; lupa.add(mango);
  zona(lupa, 8, 2, 4.5, 1.5, 0, 0);
  const reposo = { p: lupa.position.clone(), r: lupa.rotation.clone() };
  P.foco = () => V(40, 0, 20);

  const recorrer = async ctx => {
    ctx.enfocar(V(-45, 2, -2), 900);
    const ruta = new THREE.CatmullRomCurve3([V(-36, 16, -14), V(-52, 16, -14), V(-52, 16, 0), V(-38, 16, 2), V(-45, 16, 12)]);
    await volar(lupa, ruta.getPoint(0), { rot: E(0, 0, 0), altura: 10, ms: 1000 });
    await animar(2200, t => lupa.position.copy(ruta.getPoint(t)), ease.suave);
  };
  P.montar = async ctx => {
    await recorrer(ctx);
    ctx.burbuja('Sin tornillos sueltos ✓', V(-45, 14, -8));
    await esperar(500);
    ctx.burbuja('Cables lejos de ventiladores ✓', V(-45, 11, 6));
    await volar(lupa, reposo.p, { rot: reposo.r, altura: 8, ms: 1000 });
  };
  P.mal = async ctx => {
    const pos = ctx.enPlaca(1.5, 0.45, 1.5);
    ctx.enfocar(pos, 800);
    const suelto = new THREE.Group(); suelto.position.copy(pos).add(V(0, 8, 0)); P.fijo.add(suelto);
    poner(suelto, k.cil(0.38, 0.18, C.metal, 0.035, 12), 0, 0.1, 0);
    poner(suelto, k.cil(0.16, 0.9, C.metal, 0.03, 8), 0, 0.1, 0.5).rotation.x = Math.PI / 2;
    await bajarA(suelto, pos.y, 600, ease.rebote);
    ctx.burbuja('Un tornillo olvidado…', pos.clone().add(V(0, 3, 0)));
    await esperar(900);
    ctx.burbuja('Al encender…', pos.clone().add(V(0, 6, 0)));
    await esperar(600);
    ctx.chispas(pos.clone().add(V(0, 0.4, 0)), true);
    await esperar(900);
  };
  return P;
}

/* ---------------- CABLE DE CORRIENTE ---------------- */
function enchufe() {
  const P = nuevaPieza('enchufe', {
    nombre: 'Enchufar y encender',
    texto: 'Se trabaja siempre desenchufado. Al final, con todo revisado: cable a la fuente, enchufe, interruptor de la fuente en I y botón de encendido.',
    accion: 'Enchufar y encender',
    tituloMal: 'Enchufar mientras montas',
    textoMal: 'Nunca se monta con el equipo enchufado, ni siquiera «para que haga de toma de tierra». Para eso está la pulsera.',
    requiere: ['revisar'],
    foco: () => V(-68, 1, 16),
    focoDir: V(-0.55, 0.8, 0.6),
  });
  const { k } = P, c = P.cuerpo;
  poner(c, k.caja(3.2, 1.4, 10, C.crema, 0.07), -71, 0.7, 22);
  const interruptor = poner(c, k.caja(1.7, 0.5, 1.3, C.rojo, 0.04, { propio: true }), -71, 1.6, 25.6);
  for (const z of [18.8, 21.6]) poner(c, k.cil(0.95, 0.05, 0xd6cfbf, 0.03, 20), -71, 1.42, z);
  c.add(k.tubo(new THREE.CatmullRomCurve3([V(-71, 0.6, 27), V(-72, 0.4, 29), V(-75, 0.3, 33)]), 0.3, C.crema, 0.05, 20));

  // Clavija de enchufe y conector de la fuente (C13), unidos por el cable
  const clavija = new THREE.Group(); clavija.position.set(-75, 0.85, 12); clavija.rotation.set(0, 0.4, Math.PI / 2); c.add(clavija);
  poner(clavija, k.caja(1.7, 2.2, 1.7, C.negro, 0.05), 0, 0, 0);
  for (const x of [-0.45, 0.45]) poner(clavija, k.cil(0.13, 0.9, C.metal, 0.03, 8), x, -1.5, 0);
  zona(clavija, 3, 4, 3, 0, -0.5, 0);
  const iec = new THREE.Group(); iec.position.set(-68.5, 0.7, 8); iec.rotation.y = 0.5; c.add(iec);
  poner(iec, k.caja(1.8, 1.4, 2.2, C.negro, 0.05), 0, 0, 0);
  zona(iec, 3, 2.5, 3, 0, 0, 0);

  const cordon = k.tubo(new THREE.CatmullRomCurve3([V(-69, 0.6, 8), V(-74, 0.6, 12)]), 0.28, C.negro, 0.05, 40);
  P.grupo.add(cordon);
  const ua = new THREE.Vector3(Infinity, 0, 0), ub = new THREE.Vector3(Infinity, 0, 0), ta = new THREE.Vector3(), tb = new THREE.Vector3();
  P.actualizarCordon = () => {
    ta.set(-0.9, 0, 0); iec.localToWorld(ta);
    tb.set(0, 1.1, 0); clavija.localToWorld(tb);
    if (ta.distanceToSquared(ua) < 1e-4 && tb.distanceToSquared(ub) < 1e-4) return;
    ua.copy(ta); ub.copy(tb);
    cambiarGeometria(cordon, new THREE.TubeGeometry(curvaCordon(ta.clone(), tb.clone(), { comba: -0.4 }), 40, 0.28, 8, false));
  };
  const reposoClavija = { p: clavija.position.clone(), r: clavija.rotation.clone() };

  const enchufar = async (ctx, chispa) => {
    await volar(clavija, V(-71, 3.8, 18.8), { rot: E(0, 0, 0), altura: 4, ms: 800 });
    if (chispa) {
      await bajarA(clavija, 3.1, 160);
      ctx.chispas(V(-71, 1.8, 18.8), true);
      await esperar(500);
      await volar(clavija, reposoClavija.p, { rot: reposoClavija.r, altura: 4, ms: 750 });
      return;
    }
    await bajarA(clavija, 2.75, 300, ease.rebote);
  };
  P.montar = async ctx => {
    ctx.enfocar(V(-67, 2, 16), 900, V(-0.55, 0.8, 0.6));
    await volar(iec, V(CAJA.x0 - 0.95, 3.5, 17), { rot: E(0, 0, 0), altura: 5, ms: 900 });
    ctx.burbuja('Cable a la fuente', V(CAJA.x0 - 1, 7, 17));
    await enchufar(ctx, false);
    await animar(250, t => { interruptor.rotation.x = -0.4 * t; }, ease.salida);
    interruptor.material.color.set(C.verde); interruptor.material.emissive.set(0x1b7a3c);
    const sw = ctx.piezas.fuente.interruptor;
    sw.material.color.set(C.verde); sw.material.emissive.set(0x1b7a3c);
    ctx.burbuja('Fuente en I', V(CAJA.x0 - 1, 7, 13));
    await esperar(500);
    await pulsarBoton(ctx);
  };
  P.mal = async ctx => {
    ctx.enfocar(V(-70, 1, 19), 800, V(-0.4, 0.8, 0.7));
    await enchufar(ctx, true);
  };
  return P;
}

export const ORDEN = ['pulsera', 'cpu', 'pasta', 'disipador', 'ram', 'ssd', 'chapa', 'separadores', 'placa', 'fuente', 'c24', 'eps', 'gpu', 'frontal', 'revisar', 'enchufe'];

export function construirPiezas() {
  return {
    caja: caja(), placa: placa(), pulsera: pulsera(), cpu: cpu(), pasta: pasta(), disipador: disipador(), ram: ram(), ssd: ssd(),
    chapa: chapa(), separadores: separadores(), fuente: fuente(), c24: c24(), eps: eps(), gpu: gpu(), frontal: frontal(), revisar: revisar(), enchufe: enchufe(),
  };
}
