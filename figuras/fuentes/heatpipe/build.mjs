// El disipador por dentro: una torre cortada por la mitad sobre el procesador, con el heat pipe a la vista.
// ANATOMY=/ruta/al/clon node build.mjs  →  ../../heatpipe.html (con la cabecera y los colores del taller)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as M from "./model.mjs";
import { paginaTaller, mat } from "../marco.mjs";

// La skill Anatomy (MIT, github.com/wheresryan22/anatomy) no va en este repo: indica dónde la tienes clonada.
const ANATOMY = process.env.ANATOMY ?? "/home/claude/terceros/anatomy";
const k = await import(`${ANATOMY}/kit/iso-kit.mjs`);
const { kitScript } = await import(`${ANATOMY}/scripts/inline-kit.mjs`);

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 720, HEIGHT = 500;
// El corte es el plano y = 0: detrás (y < 0) queda media torre; el ventilador y la placa base están enteros.
const BANCO = { x: -136, y: -112, w: 312, d: 206, r: 8 };
const PCB = { x: -64, y: -100, w: 226, d: 174, r: 3 }, Z_PCB = 5, Z_PLACA = 7.5;
const ZOCALO = { x: 6, y: -34, w: 68, d: 34, r: 0 };
const SUSTRATO = { x: 12, y: -28, w: 56, d: 28, r: 0 }, IHS = { x: 15, y: -25, w: 50, d: 25, r: 0 }, PASTA = { x: 17, y: -23, w: 46, d: 23, r: 0 };
const Z_ZOCALO = 12, Z_SUSTRATO = 14, Z_IHS = 20, Z_PASTA = 21, Z_BASE = 41;
const BASE = { x: 6, y: -30, w: 68, d: 30, r: 0 };
const ALETA = { x: -10, y: -50, w: 100, d: 50, r: 0 }, Z_ALETA0 = 49, PASO = 6, N_ALETAS = 18, GRUESO = 1.2;
const VENT = { x: 98, y: -55, w: 24, d: 110, r: 2.5 }, ZC = 103, XF = VENT.x + VENT.w;
const TERMO = { x: -128, y: 36, w: 54, d: 24, r: 3 }, ALTO_TERMO = 30;

const P = k.fitProjection(
  [...k.boxCorners(BANCO, -12, 0), [ALETA.x, -50, 164], [XF, -55, 160], [XF, 55, 160], [ALETA.x, 0, 164]],
  WIDTH, HEIGHT, { pad: 14, azimuth: 70, elevation: 21 },
);
const at = (p) => k.iso(p, P);
const U = Math.hypot(at([1, 0, 0])[0] - at([0, 0, 0])[0], at([1, 0, 0])[1] - at([0, 0, 0])[1]);     // px por unidad en el plano del corte
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const fondo = (x, y, z = 0) => k.depthOf([x, y, z], P);
const corte = (pts, cerrada = true) => k.pathOf(pts.map(([x, z]) => at([x, 0, z])), cerrada);
const n1 = (v) => Math.round(v * 10) / 10;

function banco() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BANCO, -12, 12, P)}"/>`];
  for (const [x, y] of k.corners(BANCO, 20).sort((a, b) => fondo(...a) - fondo(...b))) out.push(mat("grafito", S(k.cylinder(x, y, 7, -12, 4, P, 28), { tone: "hi" })));
  out.push(S(k.slabOf(BANCO, -8, 8, P, 8, 1.4), { tone: "hi" }));
  out.push(Ln(k.planOutline(k.insetPlan(BANCO, 5), 0, P), { tone: "lo" }));
  const tornillos = k.corners(BANCO, 11);
  out.push(Ln(tornillos.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }), Dots(tornillos.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// Placa base sobre sus separadores, con lo que hay alrededor del zócalo.
function placa() {
  const out = [];
  for (const [x, y] of k.corners(PCB, 7).sort((a, b) => fondo(...a) - fondo(...b))) out.push(mat("amarillo", S(k.cylinder(x, y, 2.6, 0, Z_PCB, P, 14), { tone: "hi" })));
  out.push(S(k.slabOf(PCB, Z_PCB, Z_PLACA - Z_PCB, P, 4, 0.3), { tone: "hi" }));
  const agujeros = k.corners(PCB, 7);
  out.push(Ln(agujeros.map(([x, y]) => k.ring(x, y, 2.4, Z_PLACA, P, 14)).join(""), { tone: "mid" }), Dots(agujeros.map(([x, y]) => at([x, y, Z_PLACA])), { size: 0.5, tone: "hi" }));
  // Silueta de la mitad del zócalo que se ha quitado.
  out.push(Ln(k.pathOf([[ZOCALO.x, 0], [ZOCALO.x, 34], [ZOCALO.x + ZOCALO.w, 34], [ZOCALO.x + ZOCALO.w, 0]].map(([x, y]) => at([x, y, Z_PLACA]))), { tone: "lo", dashed: true, free: true }));
  return out.join("");
}
// Condensadores y el disipador pasivo del VRM, a la izquierda del zócalo.
function vrm() {
  const out = [];
  for (const y of [-84, -72, -60]) out.push(mat("negro", S(k.cylinder(-52, y, 3.4, Z_PLACA, 9, P, 16, 0.4), { tone: "hi" })));
  const plan = { x: -40, y: -66, w: 22, d: 52, r: 1.2 };
  out.push(mat("metal", S(k.slabOf(plan, Z_PLACA, 13, P, 3, 0.5), { tone: "hi" }) +
    Ln([-34.5, -29, -23.5].map((x) => k.lineOnTop([x, plan.y + 0.6], [x, plan.y + plan.d - 0.6], Z_PLACA + 13, P)).join(""), { tone: "lo" })));
  for (const y of [-50, -38, -26]) out.push(mat("negro", S(k.cylinder(-52, y, 3.4, Z_PLACA, 9, P, 16, 0.4), { tone: "hi" })));
  return out.join("");
}
// Dos ranuras de memoria, a la derecha, y el conector CPU_FAN.
function ranuras() {
  const out = [];
  for (const x of [84, 91.5]) {
    const plan = { x, y: -92, w: 4.6, d: 150, r: 0.8 };
    out.push(mat("negro", S(k.slabOf(plan, Z_PLACA, 4.2, P, 2, 0.3), { tone: "hi" }) + Ln(k.lineOnTop([x + 2.3, plan.y + 3], [x + 2.3, plan.y + plan.d - 3], Z_PLACA + 4.2, P), { tone: "faint", free: true })));
  }
  return out.join("");
}
const CPU_FAN = { x: 132, y: 40, w: 13, d: 5, r: 0.5 };
function conector() {
  return mat("blanco", S(k.slabOf(CPU_FAN, Z_PLACA, 4.5, P, 2, 0.3), { tone: "hi" })) +
    Dots([0, 1, 2, 3].map((i) => at([CPU_FAN.x + 2 + i * 3, CPU_FAN.y + 2.5, Z_PLACA + 4.5])), { size: 0.55, tone: "hi" });
}

// Zócalo, procesador, pasta y base de cobre: media pieza cada uno, con la cara de corte delante.
function procesador() {
  return [
    mat("negro", S(k.slabOf(ZOCALO, Z_PLACA, Z_ZOCALO - Z_PLACA, P, 1), { tone: "hi" })),
    mat("verde", S(k.slabOf(SUSTRATO, Z_ZOCALO, Z_SUSTRATO - Z_ZOCALO, P, 1), { tone: "hi", crease: "none" })),
    mat("metal", S(k.slabOf(IHS, Z_SUSTRATO, Z_IHS - Z_SUSTRATO, P, 1), { tone: "hi" })),
    mat("blanco", S(k.slabOf(PASTA, Z_IHS, Z_PASTA - Z_IHS, P, 1), { tone: "hi", crease: "none" })),
  ].join("");
}
function base() {
  const out = [S(k.slabOf(BASE, Z_PASTA, Z_BASE - Z_PASTA, P, 1), { tone: "hi" })];
  // Puente de sujeción con sus dos tornillos de muelle.
  const puente = { x: -4, y: -22, w: 88, d: 9, r: 1 };
  out.push(mat("metal", S(k.slabOf(puente, Z_BASE, 2.4, P, 2, 0.3), { tone: "hi" })));
  for (const x of [0, 80]) out.push(mat("grafito", S(k.cylinder(x, -17.5, 3, Z_BASE + 2.4, 5, P, 14, 0.4), { tone: "hi" })) + Dots([at([x, -17.5, Z_BASE + 7.4])], { size: 0.6, tone: "hi" }));
  return out.join("");
}
function aletas() {
  const out = [];
  for (let i = 0; i < N_ALETAS; i++) out.push(S(k.slabOf(ALETA, Z_ALETA0 + i * PASO, GRUESO, P, 1), { tone: "hi", crease: "none" }));
  // Tapa de arriba, más gruesa.
  const top = Z_ALETA0 + N_ALETAS * PASO;
  out.push(mat("grafito", S(k.slabOf(ALETA, top, 2.6, P, 1), { tone: "hi" }) + Ln(k.planOutline(k.insetPlan({ ...ALETA, d: ALETA.d + 6 }, 6), top + 2.6, P, 1), { tone: "faint", free: true })));
  return out.join("");
}

// El tubo en el corte: pared de cobre, mecha empapada y hueco por donde sube el vapor.
const L = M.largoMitad();
const eje = (lado, desvio = 0, paso = 1) => {
  const pts = [];
  for (let s = 0; s <= L + 1e-9; s += paso) { const p = M.puntoEn(lado, Math.min(s, L)); pts.push(at([p.x + p.nx * desvio, 0, p.z + p.nz * desvio])); }
  return pts;
};
function tubo() {
  const d = k.pathOf([...eje(-1).reverse(), ...eje(1).slice(1)]);
  const capa = (cls, ancho) => `<path class="hp-tubo ${cls}" style="stroke-width:${n1(ancho * U)}px" d="${d}"/>`;
  return capa("hp-t-borde", M.TUBO.d + 1.5) + capa("hp-t-cobre", M.TUBO.d) + capa("hp-t-mecha", M.TUBO.d - 2.6) + capa("hp-t-hueco", M.TUBO.d - 8.8);
}
// El chip, dentro del procesador: cambia de color con la temperatura.
const chip = () => `<path id="hp-chip" class="hp-chip" d="${corte([[27, Z_SUSTRATO], [53, Z_SUSTRATO], [53, Z_SUSTRATO + 4], [27, Z_SUSTRATO + 4]])}"/>`;

// Aire entre las aletas: entra frío por el ventilador (derecha) y sale caliente (izquierda).
function aire() {
  const [x1, y1] = at([-14, 0, ZC]), [x2, y2] = at([92, 0, ZC]);
  const linea = (i) => k.pathOf([at([-36, 0, Z_ALETA0 + i * PASO + 3.6]), at([96, 0, Z_ALETA0 + i * PASO + 3.6])]);
  const grupo = (resto) => Array.from({ length: N_ALETAS - 1 }, (_, i) => i).filter((i) => i % 2 === resto).map(linea).join("");
  return `<defs><linearGradient id="hp-grad" gradientUnits="userSpaceOnUse" x1="${n1(x1)}" y1="${n1(y1)}" x2="${n1(x2)}" y2="${n1(y2)}"><stop offset="0" stop-color="#ff6a3d"/><stop offset="1" stop-color="#17a9c4"/></linearGradient></defs>` +
    `<g id="hp-aire" data-on><path class="hp-aire" data-free="both" d="${grupo(0)}"/><path class="hp-aire" data-free="both" d="${grupo(1)}"/></g>`;
}

// Ventilador entero, con las aspas a la vista por la cara de entrada.
const enCara = (rho, phi) => at([XF, rho * Math.cos(phi), ZC + rho * Math.sin(phi)]);
const circulo = (rho, n = 56) => k.pathOf(Array.from({ length: n }, (_, i) => enCara(rho, (i * 2 * Math.PI) / n)), true);
function ventilador() {
  const out = [S(k.slabOf(VENT, ZC - 55, 110, P, 3, 0.8), { tone: "hi" })];
  const top = ZC + 55;
  // Flecha del marco: hacia dónde sopla.
  out.push(Ln(k.pathOf([[XF - 4, 0], [VENT.x + 4, 0]].map(([x, y]) => at([x, y, top]))) + k.pathOf([[VENT.x + 9, -5], [VENT.x + 4, 0], [VENT.x + 9, 5]].map(([x, y]) => at([x, y, top]))), { tone: "mid", free: true }));
  out.push(`<path class="hp-hueco" d="${circulo(50)}"/>`);
  out.push(`<path id="hp-aspas" class="hp-aspa" d=""/>`);
  out.push(`<path class="hp-buje" d="${circulo(15, 32)}"/><path class="hp-pegatina" d="${circulo(7.5, 24)}"/>`);
  out.push(Dots([[-48, -48], [48, -48], [-48, 48], [48, 48]].map(([y, z]) => at([XF, y, ZC + z])), { size: 0.9, tone: "hi" }));
  // Cable hasta el conector CPU_FAN de la placa.
  const cable = [[XF, 40, ZC - 53], [XF + 5, 41, 30], [CPU_FAN.x + 6.5, CPU_FAN.y + 2.5, Z_PLACA + 5]].map(at);
  out.push(Ln(k.pathOf(cable), { tone: "hi", className: "hp-cable" }), Dots([cable[0], cable[2]], { size: 1, tone: "hi" }));
  return out.join("");
}

// Termómetro en el banco, con la sonda pegada al procesador.
function termometro() {
  const out = [S(k.slabOf(TERMO, 0, ALTO_TERMO, P, 4, 1), { tone: "hi" })];
  const y = TERMO.y + TERMO.d, x0 = TERMO.x + 5, x1 = TERMO.x + TERMO.w - 5;
  out.push(`<path class="hp-lcd" d="${k.pathOf([[x0, 8], [x1, 8], [x1, 25], [x0, 25]].map(([x, z]) => at([x, y, z])), true)}"/>`);
  out.push(`<g id="hp-lcd">${k.faceTextSvg(k.sideMatrix([x0 + 3.5, y], 12, P, "left"), "25 °C", { size: 10.5, tone: "hi" })}</g>`);
  out.push(Dots([[TERMO.x + 12, TERMO.y + 10], [TERMO.x + 22, TERMO.y + 10]].map(([px, py]) => at([px, py, ALTO_TERMO])), { size: 0.9, tone: "hi" }));
  const sonda = [[TERMO.x + TERMO.w, TERMO.y + 12, 6], [-58, 30, 2], [-30, 22, Z_PLACA + 0.6], [8, 6, Z_PLACA + 0.6], [13, 1, Z_SUSTRATO + 2], [IHS.x, 0, Z_SUSTRATO + 2.2]].map(at);
  out.push(Ln(k.pathOf(sonda), { tone: "hi", className: "hp-cable" }), Dots([sonda[0], sonda[sonda.length - 1]], { size: 1.1, tone: "hi" }));
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Disipador de torre cortado por la mitad sobre un procesador. Dentro del tubo de cobre sube vapor por el centro y baja líquido por las paredes. Un ventilador sopla aire entre las aletas y un termómetro marca la temperatura del procesador.",
  body: [
    mat("pizarra", banco()),
    mat("verde", placa()),
    vrm(),
    procesador(),
    `<g class="m-cobre">${base()}</g>`,
    ranuras(),
    mat("metal", aletas()),
    aire(),
    tubo(),
    `<g id="hp-gotas"></g>`,
    chip(),
    conector(),
    mat("grafito", ventilador()),
    mat("grafito", termometro()),
  ],
});

const CSS = `
.iso .m-cobre{--anatomy-paper:#d98a4e;--anatomy-top:#e59d63;--anatomy-shade-0:#a85f2a;--anatomy-shade-1:#b96c34;--anatomy-shade-2:#c8783e;--anatomy-shade-3:#d28448;--anatomy-mid:#4a2206;--anatomy-lo:#8a4a1c;--anatomy-faint:#bd7741}
.iso-svg .hp-tubo{fill:none;vector-effect:none;stroke-linecap:round;stroke-linejoin:round}
.hp-t-borde{stroke:#1d1b24}.hp-t-cobre{stroke:#c8763a}.hp-t-mecha{stroke:#a9cdee}.hp-t-hueco{stroke:#fff3e2}
.hp-chip{fill:#ffd23f;stroke:#1d1b24;stroke-width:1.3px;stroke-linejoin:round}
.hp-aire{fill:none;stroke:url(#hp-grad);stroke-width:2.8px;stroke-linecap:round;stroke-dasharray:13 21}
#hp-aire{opacity:0;transition:opacity .5s}
#hp-aire[data-on]{opacity:.9}
.hp-hueco{fill:#23242c;stroke:#1d1b24;stroke-width:1.4px}
.hp-aspa{fill:#8f93a3;stroke:#1d1b24;stroke-width:1.1px;stroke-linejoin:round}
.hp-buje{fill:#3d3f4b;stroke:#1d1b24;stroke-width:1.3px}
.hp-pegatina{fill:#ffd23f;stroke:#1d1b24;stroke-width:1px}
.iso-line.hp-cable{stroke:#1d1b24;stroke-width:1.8px}
.hp-lcd{fill:#dfe9c9;stroke:#0e0e12;stroke-width:1.3px;stroke-linejoin:round}
#hp-lcd .iso-face-text{fill:#1d1b24;font-weight:700}
#hp-lcd[data-frena] .iso-face-text{fill:#c8201f}
.iso-svg .hp-gota{vector-effect:none;stroke:#1d1b24;stroke-width:.7px}
.hp-gota[data-tipo="vapor"]{fill:#ff6a3d}
.hp-gota[data-tipo="liquido"]{fill:#2f7fd6}
.iso-stage{outline:none;touch-action:manipulation;cursor:pointer}
`;

const MODEL = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
// Caminos de las gotas, ya proyectados: por cada lado, el eje del tubo y las dos paredes.
const redondea = (pts) => pts.map(([x, y]) => [n1(x), n1(y)]);
const CAMINOS = [-1, 1].map((lado) => ({ eje: redondea(eje(lado)), dentro: redondea(eje(lado, 4.75)), fuera: redondea(eje(lado, -4.75)) }));
// A partir de qué distancia el tubo está ya entre las aletas (ahí se enfría el vapor).
const S_ALETAS = Math.ceil((M.TUBO.xd - M.TUBO.xi) / 2 - M.TUBO.r + (Math.PI / 2) * M.TUBO.r + (Z_ALETA0 - M.TUBO.zb - M.TUBO.r)) + 4;

const live = `
${MODEL}
const HP = ${JSON.stringify({ P, XF, ZC, CAMINOS, S_ALETAS, N: 46 })};
const hpP = HP.P;
const hpStage = document.querySelector(".iso-stage"), hpReadout = document.querySelector("[data-readout]");
const hpEl = (id) => document.getElementById(id);
const hpGotas = hpEl("hp-gotas"), hpAspas = hpEl("hp-aspas"), hpAire = hpEl("hp-aire"), hpChip = hpEl("hp-chip"), hpLcd = hpEl("hp-lcd"), hpLcdText = hpLcd.querySelector("text");
const hpLineas = [...hpAire.querySelectorAll("path")];
const hpFanBtn = document.querySelector(".hp-controles [data-fan]"), hpBotones = [...document.querySelectorAll(".hp-controles [data-w]")];
const hpStill = matchMedia("(prefers-reduced-motion: reduce)");
const hpTAU = 2 * Math.PI, hpSuave = (a, b, v) => { const u = Math.min(1, Math.max(0, (v - a) / (b - a))); return u * u * (3 - 2 * u); };
let hpW = 65, hpFan = true, hpT = temperatura(65, true), hpGiro = 0, hpVel = 1, hpViento = 0, hpReloj = 0, hpLast = 0, hpFrame = 0, hpVisible = true;
// Cada gota hace el viaje entero: sube como vapor por el centro, se enfría entre las aletas y baja como líquido por la pared.
const hpRand = azar(11), hpLargo = HP.CAMINOS[0].eje.length - 1;
const hpLista = Array.from({ length: HP.N }, (_, i) => ({ lado: i % 2, pared: (i >> 1) % 2 ? "dentro" : "fuera", tope: HP.S_ALETAS + hpRand() * (hpLargo - HP.S_ALETAS - 3), fase: hpRand(), lado2: hpRand() * 0.5 - 0.25 }));
hpGotas.innerHTML = hpLista.map(() => '<circle class="hp-gota" r="2.6"/>').join("");
const hpCirculos = [...hpGotas.children];
const hpEn = (pts, s) => { const i = Math.min(pts.length - 2, Math.floor(s)), f = s - i, a = pts[i], b = pts[i + 1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; };
const hpMezcla = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const hpColor = (t) => { const u = Math.min(1, Math.max(0, (t - 35) / 60)), c = (a, b) => Math.round(a + (b - a) * u); return "rgb(" + c(255, 229) + "," + c(210, 72) + "," + c(63, 77) + ")"; };

function hpDraw() {
  const real = potenciaReal(hpW, hpFan), cuantas = Math.round(HP.N * (0.25 + 0.75 * real / 125));
  hpLista.forEach((g, i) => {
    const c = hpCirculos[i];
    if (i >= cuantas) { c.style.display = "none"; return; }
    c.style.display = "";
    const u = (g.fase + hpReloj) % 1, camino = HP.CAMINOS[g.lado], sube = u < 0.3;
    const s = sube ? g.tope * hpSuave(0, 1, u / 0.3) : g.tope * (1 - (u - 0.3) / 0.7);
    // de vapor (centro) a líquido (pared) al llegar arriba, y al revés al volver al fondo
    const pegado = sube ? hpSuave(0.26, 0.3, u) : 1 - hpSuave(0.95, 1, u);
    const centro = hpMezcla(hpEn(camino.eje, s), hpEn(camino[g.pared], s), Math.abs(g.lado2)), [x, y] = hpMezcla(centro, hpEn(camino[g.pared], s), pegado);
    c.setAttribute("cx", x.toFixed(1)); c.setAttribute("cy", y.toFixed(1));
    c.setAttribute("r", sube ? "3.5" : "2.7"); c.dataset.tipo = sube ? "vapor" : "liquido";
  });
  // Aspas del ventilador.
  let d = "";
  const pol = (rho, phi) => iso([HP.XF, rho * Math.cos(phi), HP.ZC + rho * Math.sin(phi)], hpP);
  for (let i = 0; i < 7; i++) {
    const a = hpGiro + (i * hpTAU) / 7, pts = [];
    for (let j = 0; j <= 4; j++) pts.push(pol(17, a + (0.52 * j) / 4));
    for (let j = 4; j >= 0; j--) pts.push(pol(47, a + 0.32 + (0.6 * j) / 4));
    d += pathOf(pts, true);
  }
  hpAspas.setAttribute("d", d);
  hpLineas.forEach((p, i) => { p.style.strokeDashoffset = (hpViento + i * 17).toFixed(1); });
  hpAire.toggleAttribute("data-on", hpFan);
  hpChip.style.fill = hpColor(hpT);
  const frena = frenado(hpW, hpFan) && hpT > T_LIMITE - 0.6, grados = Math.round(hpT);
  hpLcd.toggleAttribute("data-frena", frena);
  if (hpLcdText.textContent !== grados + " °C") hpLcdText.textContent = grados + " °C";
  const text = frena
    ? T_LIMITE + " °C · el procesador se frena: de " + hpW + " a " + Math.round(real) + " W"
    : hpW + " W · ventilador " + (hpFan ? "encendido" : "parado") + " · procesador a " + grados + " °C";
  if (hpReadout.textContent !== text) hpReadout.textContent = text;
}
function hpTick(now) {
  hpFrame = 0;
  const dt = hpLast ? Math.min(0.05, (now - hpLast) / 1000) : 0;
  hpLast = now;
  hpT += (temperatura(hpW, hpFan) - hpT) * (1 - Math.exp(-dt / TAU));
  hpVel += ((hpFan ? 1 : 0) - hpVel) * (1 - Math.exp(-dt / 0.9));
  hpGiro += dt * hpVel * 9;
  hpViento += dt * hpVel * 70;
  hpReloj += dt * (0.05 + 0.16 * potenciaReal(hpW, hpFan) / 125);
  hpDraw();
  if (hpVisible && !hpStill.matches) hpFrame = requestAnimationFrame(hpTick);
}
const hpRun = () => { if (!hpFrame && hpVisible && !hpStill.matches) { hpLast = 0; hpFrame = requestAnimationFrame(hpTick); } };
function hpPon(w, fan) {
  hpW = w; hpFan = fan;
  hpFanBtn.setAttribute("aria-pressed", String(fan));
  hpFanBtn.textContent = fan ? "Ventilador encendido" : "Ventilador parado";
  for (const b of hpBotones) b.setAttribute("aria-pressed", String(Number(b.dataset.w) === w));
  // Con el movimiento reducido no hay animación: se enseña ya la temperatura final.
  if (hpStill.matches) { hpT = temperatura(w, fan); hpVel = fan ? 1 : 0; hpDraw(); } else hpRun();
}
new IntersectionObserver((entries) => { hpVisible = entries[entries.length - 1].isIntersecting; if (hpVisible) hpRun(); }, { rootMargin: "120px 0px" }).observe(hpStage);
hpFanBtn.addEventListener("click", () => hpPon(hpW, !hpFan));
for (const b of hpBotones) b.addEventListener("click", () => hpPon(Number(b.dataset.w), hpFan));
hpStage.addEventListener("click", () => hpPon(hpW, !hpFan));
hpStage.addEventListener("keydown", (event) => {
  const i = POTENCIAS.indexOf(hpW);
  if (event.key === " " || event.key === "Enter") { event.preventDefault(); hpPon(hpW, !hpFan); }
  else if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); hpPon(POTENCIAS[Math.min(POTENCIAS.length - 1, i + 1)], hpFan); }
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); hpPon(POTENCIAS[Math.max(0, i - 1)], hpFan); }
});
window.hpPose = (w, fan, reloj = 0.4) => {
  hpVisible = false; cancelAnimationFrame(hpFrame); hpFrame = 0;
  hpW = w; hpFan = fan; hpT = temperatura(w, fan); hpVel = fan ? 1 : 0; hpReloj = reloj; hpGiro = reloj * 5;
  hpFanBtn.setAttribute("aria-pressed", String(fan)); hpFanBtn.textContent = fan ? "Ventilador encendido" : "Ventilador parado";
  for (const b of hpBotones) b.setAttribute("aria-pressed", String(Number(b.dataset.w) === w));
  hpDraw();
  return hpReadout.textContent;
};
hpPon(65, true);
hpDraw();
`;

const controls = `<div class="hp-controles fig-controles"><button type="button" data-fan aria-pressed="true">Ventilador encendido</button><div class="fig-grupo" role="group" aria-label="Potencia del procesador (TDP)">${M.POTENCIAS.map((w) => `<button type="button" data-w="${w}" aria-pressed="${w === 65}">${w} W</button>`).join("")}</div></div>`;
const card = k
  .plateHtml({
    fig: "Fig 3",
    title: "Disipador de torre",
    hint: "Pulsa para parar el ventilador",
    readout: "",
    keys: [
      { mark: "flat", label: "[#ff6a3d] Vapor: sube por el centro del tubo" },
      { mark: "flat", label: "[#2f7fd6] Líquido: baja por las paredes" },
      { mark: "flat", label: "[#d98a4e] Cobre: la base y el tubo" },
      { mark: "flat", label: "[#17a9c4] Aire: entra frío y sale caliente" },
    ],
    caption:
      `Un disipador de torre cortado por la mitad, montado sobre el procesador. El calor del chip pasa por la **pasta térmica** a la **base** de cobre. Pero las **aletas**, que son las que lo sueltan al aire, están más arriba. ¶` +
      `De llevarlo hasta allí se encarga el **heat pipe**: un tubo de cobre cerrado con un poco de líquido dentro. Abajo, el calor lo hace hervir y sube como **vapor** por el centro. Arriba, las aletas lo enfrían: vuelve a ser **líquido** y baja por las paredes, que por dentro son como una esponja. Y vuelta a empezar, sin bomba ni motor. ¶` +
      `Es lo que pasa en una olla con tapa: el vapor sube, toca la tapa fría, se hace gotas y cae. ¶` +
      `El **ventilador** mueve aire entre las aletas y se lleva el calor. Páralo: el procesador se calienta y, al llegar a su temperatura máxima (aquí, ${M.T_LIMITE} °C), **baja su frecuencia** para protegerse. Es el estrangulamiento térmico (thermal throttling): el equipo va lento sin motivo aparente. ¶` +
      `Los vatios son el **TDP**: el calor que hay que sacar. Las temperaturas son orientativas: cada procesador y cada disipador tienen las suyas. Un disipador real lleva varios tubos, uno al lado de otro.`,
    body: `<div class="iso-stage" tabindex="0" role="group" aria-label="Disipador de torre: pulsa Espacio para parar o encender el ventilador y las flechas para cambiar la potencia del procesador">${svg}</div>`,
  })
  .replace("</div><figcaption", `</div>${controls}<figcaption`);

const out = join(HERE, "../../heatpipe.html");
writeFileSync(out, paginaTaller({
  isoCss: k.ISO_CSS,
  titulo: "El disipador por dentro",
  etiqueta: "Figura · Refrigeración",
  h1: "El disipador por dentro",
  lead: "Cómo sube el calor del procesador hasta las aletas por dentro de un tubo de cobre, y qué pasa cuando el ventilador se para.",
  css: CSS,
  card,
  script: kitScript() + live,
}));
console.log("wrote", out, "·", M.POTENCIAS.map((w) => `${w} W: ${M.temperatura(w, true).toFixed(0)} / ${M.temperatura(w, false).toFixed(0)} °C`).join(" · "));
