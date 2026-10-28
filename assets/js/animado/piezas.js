// Montaje animado (estilo cartoon): piezas, animación de cada paso y animación del error típico.
// Medidas en centímetros. Cada pieza tiene montar(ctx) y mal(ctx).
import * as THREE from 'three';
import { kit, nuevaTinta, cambiarGeometria } from './toon.js';
import { animar, esperar, ease } from './anim.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const E = (x, y, z) => new THREE.Euler(x, y, z);

const C = {
  pcb: 0x2f9a7e, ranura: 0x37405a, metal: 0xc9d0da, metalOscuro: 0x8592a6, oro: 0xf2c14e,
  cobre: 0xe39a5b, naranja: 0xff6a3d, azul: 0x4a86e8, crema: 0xf7f1e3, negro: 0x2e3340,
  rojo: 0xe5484d, verde: 0x3fbf6a, amarillo: 0xffd23f, lila: 0x8b6fe0, cable: 0x454b62, chasis: 0x5b6b82,
};

function nuevaPieza(id, datos) {
  const grupo = new THREE.Group();
  const cuerpo = new THREE.Group();
  grupo.add(cuerpo);
  grupo.userData.id = id;
  const tinta = nuevaTinta();
  const tintas = [tinta];
  return { id, grupo, cuerpo, tintas, k: kit(tinta, tintas), hover: 0, salto: 0, montado: false, requiere: [], ...datos };
}

function poner(padre, malla, x, y, z) { malla.position.set(x, y, z); padre.add(malla); return malla; }

// Zona invisible para que las piezas pequeñas sean fáciles de pulsar
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

async function bajarA(obj, y, ms = 450, e = ease.salida) {
  const y0 = obj.position.y;
  await animar(ms, t => { obj.position.y = y0 + (y - y0) * t; }, e);
}

async function aparecer(obj, ms = 320) {
  obj.visible = true;
  await animar(ms, t => obj.scale.setScalar(Math.max(0.001, t)), ease.muelle);
}

// Tiembla de lado a lado (no encaja)
const temblar = (obj, eje = 'z', fuerza = 0.12) => {
  const r0 = obj.rotation[eje];
  return animar(650, (_, t) => { obj.rotation[eje] = r0 + Math.sin(t * Math.PI * 8) * fuerza * (1 - t); }, ease.lineal);
};

function cableCreciente(k, puntos, r, color) {
  const malla = k.tubo(new THREE.CatmullRomCurve3(puntos), r, color, 0.07, 90);
  malla.geometry.setDrawRange(0, 0);
  return malla;
}
const crecer = (malla, ms) => {
  const total = malla.geometry.index.count, paso = 60;
  return animar(ms, t => malla.geometry.setDrawRange(0, Math.floor((t * total) / paso) * paso), ease.lineal);
};

function curvaCordon(a, b, { comba = 1.2, rizo = 0 } = {}) {
  const pts = [];
  const n = rizo ? 28 : 8;
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

// Brillo rojo semitransparente para enseñar calor o peligro
function brilloRojo(padre, w, h, d, pos) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: 0xff3b2f, transparent: true, opacity: 0, depthWrite: false }));
  m.position.copy(pos); padre.add(m);
  return m;
}

/* ---------------- PLACA BASE ---------------- */
function placa() {
  const P = nuevaPieza('placa', {
    nombre: 'Placa base',
    texto: 'La pieza central: une el procesador, la memoria, el almacenamiento y la fuente. Se coge siempre por los bordes.',
    foco: () => V(0, 0, 0),
  });
  const { k } = P, c = P.cuerpo;
  poner(c, k.caja(30.5, 0.25, 24.4, C.pcb, 0.09), 0, 0.125, 0);
  for (const [x, z] of [[-14, -11.4], [14, -11.4], [-14, 11.4], [14, 11.4], [0, -11.4], [0, 11.4]])
    poner(c, k.cil(0.35, 0.06, C.metal, 0.03, 16), x, 0.28, z);

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
  poner(c, k.caja(2.5, 2.6, 16, C.chasis, 0.07), -14, 1.55, -3);

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

  poner(c, k.caja(1.3, 1.4, 5.2, C.negro), 13.6, 0.95, -1);
  poner(c, k.caja(2.2, 1.2, 1.0, C.negro), -11.5, 0.85, -11.2);
  poner(c, k.caja(1.2, 0.55, 0.5, C.negro, 0.03), 1.5, 0.52, -10.6);
  poner(c, k.caja(0.8, 0.5, 2.4, C.negro, 0.04), -9.4, 0.5, 4.5);
  poner(c, k.cil(0.28, 0.3, C.oro, 0.03, 12), -1.7, 0.4, 4.5);
  poner(c, k.caja(9, 0.9, 0.8, C.ranura), -6, 0.7, 9.2);
  poner(c, k.caja(4, 0.8, 4, C.metalOscuro), 4.5, 0.65, 8.2);
  poner(c, k.caja(4.02, 0.12, 0.7, C.naranja, 0), 4.5, 1.1, 8.2);
  poner(c, k.cil(1.0, 0.2, C.metal, 0.04, 24), 8.5, 0.35, 4);
  for (let i = 0; i < 4; i++) poner(c, k.cil(0.4, 1.0, C.lila, 0.04, 14), 10.8, 0.75, -9 + i * 1.1);
  const led = poner(c, k.caja(0.6, 0.25, 0.35, 0x3a3f4b, 0.03, { propio: true }), 12, 0.38, 10.5);

  // Cable del ventilador del procesador (CPU_FAN); aparece al montar el disipador
  const cableFan = cableCreciente(k, [V(-0.1, 3.2, -1.2), V(0.9, 1.5, -3), V(1.4, 1.1, -8), V(1.5, 1.0, -10.6)], 0.13, C.negro);
  c.add(cableFan);

  const gota = k.esfera(1, 0x9aa3ad, 0.04);
  gota.position.set(-3, 1.0, -4); gota.scale.setScalar(0.001);
  c.add(gota);

  Object.assign(P, { marco, palanca, pestanas, led, cableFan, gota });
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
    foco: () => V(-29, 2, 6),
  });
  const { k } = P, c = P.cuerpo;
  const banda = k.toro(2.0, 0.55, C.azul); banda.rotation.x = Math.PI / 2; poner(c, banda, -28, 0.55, 14);
  poner(c, k.cil(0.45, 0.5, C.metal, 0.04, 16), -25.9, 0.6, 14);
  zona(c, 6, 2, 6, -28, 0.8, 14);
  const pinza = new THREE.Group(); pinza.position.set(-22.5, 0.35, 20); pinza.rotation.y = 0.6; c.add(pinza);
  poner(pinza, k.caja(2.0, 0.3, 0.8, C.rojo, 0.04), 0, 0, 0);
  const mand2 = poner(pinza, k.caja(2.0, 0.3, 0.8, C.rojo, 0.04), 0, 0.45, 0);
  mand2.rotation.z = 0.35;
  zona(pinza, 3.5, 2, 2.5, 0, 0.3, 0);

  // Trozo de la caja: chapa pintada con el borde metálico sin pintar
  poner(c, k.caja(1.0, 9, 14, C.chasis, 0.07), -35, 4.5, 3);
  poner(c, k.caja(1.04, 0.7, 14.04, C.metal, 0), -35, 8.75, 3);
  poner(c, k.caja(0.1, 3, 8, C.negro, 0.03), -34.45, 5, 3);
  for (const z of [-3.2, 9.2]) poner(c, k.cil(0.3, 0.15, C.metal, 0.03, 12), -34.45, 2, z).rotation.z = Math.PI / 2;

  const cordon = k.tubo(curvaCordon(V(-25.9, 0.6, 14), V(-22.5, 0.4, 20), { rizo: 0.35 }), 0.12, C.amarillo, 0.05, 60);
  P.grupo.add(cordon);
  const a = V(-25.9, 0.6, 14), ult = new THREE.Vector3(Infinity, 0, 0), tmp = new THREE.Vector3();
  P.actualizarCordon = () => {
    pinza.getWorldPosition(tmp);
    if (tmp.distanceToSquared(ult) < 1e-4) return;
    ult.copy(tmp);
    const ini = a.clone(); ini.y += P.cuerpo.position.y;
    cambiarGeometria(cordon, new THREE.TubeGeometry(curvaCordon(ini, tmp, { rizo: 0.35, comba: 2.5 }), 60, 0.12, 6, false));
  };

  P.montar = async ctx => {
    ctx.enfocar(V(-30, 2, 7));
    await volar(pinza, V(-35, 9.35, 5), { rot: E(0, Math.PI / 2, 0), altura: 5, ms: 900 });
    await animar(220, t => { mand2.rotation.z = 0.35 * (1 - t); }, ease.salida);
    ctx.burbuja('Pinza a metal sin pintar', V(-35, 12, 5));
  };

  P.mal = async ctx => {
    const cpu = ctx.piezas.cpu;
    ctx.enfocar(cpu.grupo.position.clone());
    await esperar(400);
    ctx.chispas(cpu.grupo.position.clone().add(V(0, 1.5, 0)), false);
    ctx.burbuja('¡Zas! Descarga', cpu.grupo.position.clone().add(V(0, 4, 0)), 'peligro');
    const brillo = brilloRojo(cpu.grupo, 4.2, 0.8, 4.8, V(0, 0.3, 0));
    await animar(1600, (_, t) => { brillo.material.opacity = 0.55 * Math.abs(Math.sin(t * Math.PI * 3)); }, ease.lineal);
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
  P.foco = () => P.grupo.position.clone();

  const abrir = async B => {
    await animar(350, t => { B.palanca.rotation.x = 1.2 * t; }, ease.salida);
    await animar(450, t => { B.marco.rotation.z = 2.0 * t; }, ease.salida);
  };
  P.montar = async ctx => {
    const B = ctx.placa;
    ctx.enfocar(V(-3, 0, -4));
    await abrir(B);
    await volar(P.grupo, V(-3, 3.6, -4), { rot: E(0, 0, 0), altura: 8, ms: 950 });
    ctx.burbuja('Triángulo con triángulo', V(-5.2, 2.2, -1.6));
    await bajarA(P.grupo, 0.6, 520);
    await animar(420, t => { B.marco.rotation.z = 2.0 * (1 - t); }, ease.rebote);
    await animar(320, t => { B.palanca.rotation.x = 1.2 * (1 - t); }, ease.salida);
    ctx.burbuja('¡clac!', V(0.3, 2, -6.5));
  };
  P.mal = async ctx => {
    const B = ctx.placa;
    ctx.enfocar(V(-3, 0, -4));
    await abrir(B);
    await volar(P.grupo, V(-3, 3.6, -4), { rot: E(0, Math.PI / 2, 0), altura: 8, ms: 950 });
    await bajarA(P.grupo, 1.1, 450);
    ctx.burbuja('¡No encaja!', V(-3, 4, -4), 'peligro');
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
    ctx.enfocar(V(-3, 0, -4));
    await volar(P.grupo, V(-3, 5.6, -4), { rot: E(0, 0, -Math.PI / 2), altura: 7, ms: 900 });
    await bajarA(P.grupo, 4.35, 300);
    const gota = ctx.placa.gota;
    await animar(escala > 1 ? 1300 : 650, t => gota.scale.set(0.8 * escala * t + 0.001, 0.35 * Math.min(escala, 1.6) * t + 0.001, 0.8 * escala * t + 0.001), ease.salida);
    ctx.burbuja(texto, V(-3, 3.5, -4), tipo);
    await bajarA(P.grupo, 6, 250);
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
    texto: 'Se apoya sobre el procesador, se atornilla en cruz y su ventilador se conecta a CPU_FAN. Sin él, el procesador se calienta y se apaga en segundos.',
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
  P.grupo.position.set(-27, 0, -16); P.grupo.rotation.y = Math.PI / 2;
  P.foco = () => P.grupo.position.clone();
  Object.assign(P, { rotor, velocidad: 0 });

  const bajarSobreCpu = async ctx => {
    ctx.enfocar(V(-3, 3, -4));
    await volar(P.grupo, V(-3, 7, -4), { rot: E(0, 0, 0), altura: 6, ms: 1000 });
    const gota = ctx.placa.gota, s0 = gota.scale.clone();
    await animar(550, t => {
      P.grupo.position.y = 7 + (1.05 - 7) * t;
      if (t > 0.85 && s0.x > 0.01) { const u = (t - 0.85) / 0.15; gota.scale.set(s0.x + 0.75 * u, s0.y * (1 - 0.85 * u), s0.z + 0.75 * u); }
    }, ease.salida);
  };
  const atornillar = async () => {
    for (const t of tornillos) await animar(380, u => { t.position.y = 1.7 - 1.1 * u; t.rotation.y = u * Math.PI * 4; }, ease.salida);
  };

  P.montar = async ctx => {
    await bajarSobreCpu(ctx);
    ctx.burbuja('La pasta se reparte', V(-3, 2.5, 1));
    await atornillar();
    ctx.burbuja('¡Atornillado!', V(-3, 13, -4));
    await crecer(ctx.placa.cableFan, 700);
    ctx.burbuja('A CPU_FAN', V(1.5, 3, -10.6));
    P.velocidad = 18;
  };
  P.mal = async ctx => {
    ctx.placa.gota.scale.setScalar(0.001);
    ctx.burbuja('Sin pasta…', V(-3, 4, -4));
    await bajarSobreCpu(ctx);
    await atornillar();
    ctx.placa.cableFan.geometry.setDrawRange(0, Infinity);
    P.velocidad = 22;
    const brillo = brilloRojo(P.grupo, 5, 1.2, 5, V(0, 0.2, 0));
    const temps = ['45 °C', '70 °C', '95 °C', '¡Se apaga!'];
    for (let i = 0; i < temps.length; i++) {
      ctx.burbuja(temps[i], V(-3, 6 + i * 2.2, 1), i === temps.length - 1 ? 'peligro' : '');
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
  P.foco = () => P.grupo.position.clone();
  P.luz = luz;

  const pestanas = (B, abrir, ms, e) => animar(ms, t => B.pestanas.forEach(({ piv, s }) => { piv.rotation.x = s * 0.6 * (abrir ? t : 1 - t); }), e);

  P.montar = async ctx => {
    const B = ctx.placa;
    ctx.enfocar(V(6.5, 2, -3));
    await pestanas(B, true, 300, ease.salida);
    await volar(P.grupo, V(6.0, 6.5, -3), { rot: E(0, Math.PI / 2, 0), altura: 6, ms: 1000 });
    ctx.burbuja('Muesca con muesca', V(6, 5, -4.6));
    await bajarA(P.grupo, 0.55, 450, ease.suave);
    await pestanas(B, false, 260, ease.rebote);
    ctx.burbuja('¡clic!', V(6, 2.5, -9.9));
    ctx.burbuja('¡clic!', V(6, 2.5, 3.9));
  };
  P.mal = async ctx => {
    const B = ctx.placa;
    ctx.enfocar(V(6.5, 2, -3));
    await pestanas(B, true, 300, ease.salida);
    await volar(P.grupo, V(6.0, 6.5, -3), { rot: E(0, -Math.PI / 2, 0), altura: 6, ms: 1000 });
    await bajarA(P.grupo, 1.3, 400, ease.suave);
    ctx.burbuja('¡No entra!', V(6, 5.5, -3), 'peligro');
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
  P.grupo.position.set(24, 0, 18); P.grupo.rotation.y = -0.5;
  P.foco = () => P.grupo.position.clone();

  const meter = async ctx => {
    ctx.enfocar(V(-5.5, 0, 4.5));
    await volar(P.grupo, V(-7.0, 0.6, 4.5), { rot: E(0, 0, 0.35), altura: 7, ms: 950 });
    ctx.burbuja('En diagonal', V(-6, 3, 4.5));
    await animar(450, t => { P.grupo.position.x = -7.0 - 2.5 * t; P.grupo.position.y = 0.6 - 0.16 * t; }, ease.suave);
    await animar(380, t => { P.grupo.rotation.z = 0.35 * (1 - t); }, ease.salida);
  };
  P.montar = async ctx => {
    await meter(ctx);
    tornillo.visible = true;
    await animar(500, t => { tornillo.position.y = 2.4 - 2.2 * t; tornillo.rotation.y = t * Math.PI * 4; }, ease.salida);
    ctx.burbuja('¡Fijado!', V(-1.7, 2.5, 4.5));
  };
  P.mal = async ctx => {
    await meter(ctx);
    await esperar(300);
    await animar(500, t => { P.grupo.rotation.z = 0.32 * t; }, ease.muelle);
    ctx.burbuja('¡Se levanta!', V(-3, 4, 4.5), 'peligro');
    await esperar(600);
  };
  return P;
}

/* ---------------- FUENTE DE ALIMENTACIÓN ---------------- */
function fuente() {
  const P = nuevaPieza('fuente', {
    nombre: 'Fuente de alimentación',
    texto: 'Convierte la corriente del enchufe en la que necesitan los componentes. El conector de 24 pines va a la placa y el de 8 pines (EPS) al procesador. La fuente no se abre nunca.',
    accion: 'Conectar los cables',
    tituloMal: 'Olvidar el de 8 pines',
    textoMal: 'Con solo el de 24 pines el equipo no arranca: el procesador se alimenta por el conector EPS de 8 pines.',
    requiere: ['cpu', 'disipador', 'ram', 'ssd'],
    foco: () => V(22, 0, -6),
  });
  const { k } = P, c = P.cuerpo;
  poner(c, k.caja(14, 8.6, 15, 0x4c566a, 0.09), 25, 4.3, -6);
  poner(c, k.cil(5.6, 0.12, C.negro, 0.05, 36), 25, 8.66, -6);
  const rotor = new THREE.Group(); rotor.position.set(25, 8.75, -6); c.add(rotor);
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Group(); b.rotation.y = (i / 5) * Math.PI * 2; rotor.add(b);
    const pala = poner(b, k.caja(4.4, 0.06, 1.3, C.metalOscuro, 0.03), 2.4, 0, 0); pala.rotation.x = 0.3;
  }
  for (let i = 0; i < 4; i++) { const r = poner(c, k.caja(11.2, 0.1, 0.25, C.metal, 0.02), 25, 8.95, -6); r.rotation.y = (i * Math.PI) / 4; }
  poner(c, k.caja(0.05, 3.2, 6, C.amarillo, 0), 17.97, 5.2, -9);
  poner(c, k.caja(0.3, 1.6, 3.2, C.negro, 0.04), 17.85, 3.2, -5);
  poner(c, k.caja(0.3, 1.2, 2.2, C.negro, 0.04), 17.85, 6, -11);

  const c24 = cableCreciente(k, [V(17.8, 3.2, -5), V(16, 4.6, -3.6), V(13.6, 6.2, -1.4), V(13.6, 4.2, -1), V(13.6, 2.85, -1)], 0.5, C.cable);
  const c8 = cableCreciente(k, [V(17.8, 6, -11), V(12, 8.5, -14), V(0, 9, -14.5), V(-11.5, 6.5, -13), V(-11.5, 3.8, -11.4), V(-11.5, 2.45, -11.2)], 0.35, C.cable);
  c.add(c24, c8);
  const p24 = poner(c, k.caja(1.4, 1.2, 5.3, C.cable, 0.05), 13.6, 2.25, -1); p24.scale.setScalar(0.001); p24.visible = false;
  const p8 = poner(c, k.caja(2.3, 1.0, 1.1, C.cable, 0.05), -11.5, 1.95, -11.2); p8.scale.setScalar(0.001); p8.visible = false;
  Object.assign(P, { rotor, velocidad: 0 });

  const conectar24 = async ctx => {
    ctx.enfocar(V(14, 1, -3));
    await crecer(c24, 1000);
    await aparecer(p24);
    ctx.burbuja('24 pines: placa', V(13.6, 4.5, -1));
  };
  P.montar = async ctx => {
    await conectar24(ctx);
    ctx.enfocar(V(-4, 1, -9));
    await crecer(c8, 1300);
    await aparecer(p8);
    ctx.burbuja('8 pines: procesador', V(-11.5, 4, -11.2));
  };
  P.mal = async ctx => {
    await conectar24(ctx);
    await esperar(500);
    ctx.enfocar(V(0, 2, -5));
    ctx.burbuja('Botón de encendido…', V(12, 4, 10.5));
    await esperar(1100);
    ctx.burbuja('…y no arranca', V(-3, 8, -4), 'peligro');
    await animar(900, (_, t) => { ctx.placa.led.material.emissive.setHex(Math.sin(t * Math.PI * 6) > 0 ? 0x7a1f1f : 0x000000); }, ease.lineal);
    ctx.placa.led.material.emissive.setHex(0);
    ctx.burbuja('Falta el EPS', V(-11.5, 4, -11.2), 'peligro');
    await esperar(900);
  };
  return P;
}

/* ---------------- CABLE DE CORRIENTE ---------------- */
function enchufe() {
  const P = nuevaPieza('enchufe', {
    nombre: 'Cable de corriente',
    texto: 'Se trabaja siempre desenchufado. El cable de corriente va lo último, cuando todo está montado y revisado. Luego se enciende para comprobar el POST.',
    accion: 'Enchufar y encender',
    tituloMal: 'Enchufar mientras montas',
    textoMal: 'Nunca se monta con el equipo enchufado, ni siquiera «para que haga de toma de tierra». Para eso está la pulsera.',
    requiere: ['fuente'],
    foco: () => V(32, 0, 3),
  });
  const { k } = P, c = P.cuerpo;
  poner(c, k.caja(10, 1.4, 3.2, C.crema, 0.07), 33, 0.7, 7);
  const interruptor = poner(c, k.caja(1.3, 0.5, 1.7, C.rojo, 0.04, { propio: true }), 36.6, 1.6, 7);
  for (const x of [29.5, 32.3]) poner(c, k.cil(0.95, 0.05, 0xd6cfbf, 0.03, 20), x, 1.42, 7);
  const salida = k.tubo(new THREE.CatmullRomCurve3([V(38, 0.6, 7), V(40, 0.4, 8), V(44, 0.3, 11)]), 0.3, C.crema, 0.05, 20);
  c.add(salida);

  const clavija = new THREE.Group(); clavija.position.set(36, 0.85, -2.5); clavija.rotation.set(0, 0.4, Math.PI / 2); c.add(clavija);
  poner(clavija, k.caja(1.7, 2.2, 1.7, C.negro, 0.05), 0, 0, 0);
  for (const x of [-0.45, 0.45]) poner(clavija, k.cil(0.13, 0.9, C.metal, 0.03, 8), x, -1.5, 0);
  zona(clavija, 3, 4, 3, 0, -0.5, 0);

  const ancla = V(32, 2.6, -9), codo = V(34.5, 1.0, -9.6);
  const curvaEnchufe = e => {
    const m = codo.clone().lerp(e, 0.5); m.x = Math.max(m.x, 33.5) + 0.8; m.y = Math.max(0.6, Math.min(m.y, e.y) - 0.4);
    return new THREE.CatmullRomCurve3([ancla, codo, m, e]);
  };
  const cordon = k.tubo(curvaEnchufe(V(35, 0.85, -2.9)), 0.28, C.negro, 0.05, 40);
  P.grupo.add(cordon);
  const ult = new THREE.Vector3(Infinity, 0, 0), tmp = new THREE.Vector3(), arriba = new THREE.Vector3();
  P.actualizarCordon = () => {
    arriba.set(0, 1.1, 0); clavija.localToWorld(arriba); tmp.copy(arriba);
    if (tmp.distanceToSquared(ult) < 1e-4) return;
    ult.copy(tmp);
    cambiarGeometria(cordon, new THREE.TubeGeometry(curvaEnchufe(tmp.clone()), 40, 0.28, 8, false));
  };
  const reposo = { p: clavija.position.clone(), r: clavija.rotation.clone() };

  P.montar = async ctx => {
    ctx.enfocar(V(31, 0, 3));
    await volar(clavija, V(29.5, 3.6, 7), { rot: E(0, 0, 0), altura: 4, ms: 900 });
    await bajarA(clavija, 2.75, 300, ease.rebote);
    await esperar(150);
    await animar(250, t => { interruptor.rotation.x = -0.4 * t; }, ease.salida);
    interruptor.material.color.set(C.verde); interruptor.material.emissive.set(0x1b7a3c);
  };
  P.mal = async ctx => {
    ctx.enfocar(V(31, 0, 3));
    await volar(clavija, V(29.5, 3.8, 7), { rot: E(0, 0, 0), altura: 4, ms: 800 });
    await bajarA(clavija, 3.1, 160);
    ctx.chispas(V(29.5, 1.8, 7), true);
    await esperar(500);
    await volar(clavija, reposo.p, { rot: reposo.r, altura: 4, ms: 750 });
  };
  return P;
}

export const ORDEN = ['pulsera', 'cpu', 'pasta', 'disipador', 'ram', 'ssd', 'fuente', 'enchufe'];

export function construirPiezas() {
  return { placa: placa(), pulsera: pulsera(), cpu: cpu(), pasta: pasta(), disipador: disipador(), ram: ram(), ssd: ssd(), fuente: fuente(), enchufe: enchufe() };
}
