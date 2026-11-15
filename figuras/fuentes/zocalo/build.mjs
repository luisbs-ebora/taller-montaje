// El zócalo del procesador: un LGA visto desde arriba, con la palanca, la placa de retención, la tapa y el procesador.
// ANATOMY=/ruta/al/clon node build.mjs  →  ../../zocalo.html (con la cabecera y los colores del taller)
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
const WIDTH = 720, HEIGHT = 560;
const { ZP, Z_SUELO, Z_PARED, Z_PLACA, Z_SALIENTE, MEDIO, MUESCA_Y } = M;
const BANCO = { x: -129, y: -74, w: 199, d: 208, r: 8 };
const BANDEJA = { x: M.BANDEJA[0] - 28, y: M.BANDEJA[1] - 28, w: 56, d: 67, r: 4 };
const SITIO = { x: M.TAPA_FIN[0] - 27, y: M.TAPA_FIN[1] - 29, w: 54, d: 64, r: 4 };
const CAJA = { x: -61, y: -67, w: 128, d: 130, r: 2 }, PCB = { x: -56, y: -62, w: 118, d: 120, r: 3 };
const ZOCALO = { x: -30, y: -30, w: 60, d: 60, r: 2 }, PARED = 5;

const P = k.fitProjection(
  [...k.boxCorners(BANCO, -12, 0), [-30, -52, 86], [30, -52, 86], [46, 90, 40]],
  WIDTH, HEIGHT, { pad: 14, azimuth: 41, elevation: 44 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const fondo = (x, y, z = 0) => k.depthOf([x, y, z], P);
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
// Bandeja donde espera el procesador y sitio para guardar la tapa.
function bandeja() {
  return S(k.slabOf(BANDEJA, 0, 3, P, 4, 0.5), { tone: "hi" }) +
    Ln(k.planOutline({ x: M.BANDEJA[0] - 25, y: M.BANDEJA[1] - 25, w: 50, d: 50, r: 2 }, 3, P, 3), { tone: "lo" }) +
    k.faceTextSvg(k.topMatrix([BANDEJA.x + 5, BANDEJA.y + BANDEJA.d - 3.4], 3, P, "x"), "PROCESADOR", { size: 5.4, tone: "mid" });
}
function sitio() {
  return S(k.slabOf(SITIO, 0, 0.8, P, 4), { tone: "hi", crease: "none" }) +
    Ln(k.planOutline({ x: M.TAPA_FIN[0] - 25, y: M.TAPA_FIN[1] - 27.5, w: 50, d: 55, r: 2 }, 0.8, P, 3), { tone: "lo", dashed: true }) +
    k.faceTextSvg(k.topMatrix([SITIO.x + 5, SITIO.y + SITIO.d - 3.4], 0.8, P, "x"), "TAPA", { size: 5.4, tone: "mid" });
}
// La placa base, apoyada sobre su caja de cartón.
function caja() {
  return S(k.slabOf(CAJA, 0, ZP - 2.5, P, 3, 0.6), { tone: "hi", inner: Ln(k.sideSeam(CAJA, 6.4, P, 3), { tone: "faint" }) });
}
function placaBase() {
  const out = [S(k.slabOf(PCB, ZP - 2.5, 2.5, P, 4, 0.3), { tone: "hi" })];
  const agujeros = [[-45, -45], [41, -45], [-45, 47], [41, 47]];
  out.push(Ln(agujeros.map(([x, y]) => k.ring(x, y, 3, ZP, P, 18)).join(""), { tone: "mid" }), Dots(agujeros.map(([x, y]) => at([x, y, ZP])), { size: 0.9, tone: "hi" }));
  return out.join("");
}
// Bobinas del VRM detrás del zócalo y dos ranuras de memoria a un lado.
function alrededor() {
  const out = [];
  for (let i = 0; i < 5; i++) out.push(mat("grafito", S(k.slabOf({ x: -36 + i * 15, y: -58, w: 10, d: 10, r: 1.5 }, ZP, 7, P, 3, 0.6), { tone: "hi" })));
  for (const y of [-30, -18, -6, 6]) out.push(mat("negro", S(k.cylinder(-48, y, 3.2, ZP, 8, P, 16, 0.4), { tone: "hi" })));
  for (const x of [47, 54]) {
    const plan = { x, y: -56, w: 4.4, d: 112, r: 0.8 };
    out.push(mat("negro", S(k.slabOf(plan, ZP, 4, P, 2, 0.3), { tone: "hi" }) + Ln(k.lineOnTop([x + 2.2, plan.y + 3], [x + 2.2, plan.y + plan.d - 3], ZP + 4, P), { tone: "faint", free: true })));
  }
  return out.join("");
}

// ---------- El zócalo: suelo con las patillas, cuatro paredes y los dos salientes ----------
const PAREDES = [
  { x: ZOCALO.x, y: ZOCALO.y, w: PARED, d: ZOCALO.d, r: 1 }, { x: ZOCALO.x + ZOCALO.w - PARED, y: ZOCALO.y, w: PARED, d: ZOCALO.d, r: 1 },
  { x: ZOCALO.x, y: ZOCALO.y, w: ZOCALO.w, d: PARED, r: 1 }, { x: ZOCALO.x, y: ZOCALO.y + ZOCALO.d - PARED, w: ZOCALO.w, d: PARED, r: 1 },
].map((plan) => ({ plan, fondo: fondo(plan.x + plan.w / 2, plan.y + plan.d / 2) })).sort((a, b) => a.fondo - b.fondo);
const pared = ({ plan }) => S(k.slabOf(plan, Z_SUELO, Z_PARED - Z_SUELO, P, 2, 0.4), { tone: "hi" });
const SALIENTES = [[-25, MUESCA_Y - 1.3], [20.5, MUESCA_Y - 1.3]].map(([x, y]) => ({ x, y, w: 4.5, d: 2.6, r: 0.3 }));
function suelo() {
  const out = [mat("metal", S(k.slabOf({ x: -26, y: -40, w: 52, d: 6, r: 1.5 }, ZP, 5.2, P, 3, 0.4), { tone: "hi" }))];      // bisagra de la placa de retención
  out.push(mat("negro", S(k.slabOf(ZOCALO, ZP, Z_SUELO - ZP, P, 4, 0.3), { tone: "hi" })));
  return out.join("");
}
function patillas() {
  const pts = [];
  for (let i = -10; i <= 10; i++) for (let j = -10; j <= 10; j++) if (Math.abs(i) > 2 || Math.abs(j) > 2) pts.push(at([i * 2, j * 2, Z_SUELO]));
  const hueco = { x: -5, y: -5, w: 10, d: 10, r: 1 };
  return `<g class="zc-patillas">${Dots(pts, { size: 0.62, tone: "hi" })}</g>` + Ln(k.planOutline(hueco, Z_SUELO, P, 3), { tone: "faint" });
}
const salientes = () => SALIENTES.map((plan) => S(k.slabOf(plan, Z_SUELO, Z_SALIENTE - Z_SUELO, P, 2, 0.2), { tone: "hi" })).join("");
const TRI_ZOCALO = [[-29, 29], [-23.6, 29], [-29, 23.6]];
function delante() {
  const out = [`<path class="zc-tri" d="${k.pathOf(TRI_ZOCALO.map(([x, y]) => at([x, y, Z_PARED])), true)}"/>`];
  // Soportes del eje de la palanca y gancho donde descansa.
  for (const x of [-25, 27]) out.push(mat("metal", S(k.slabOf({ x, y: 32.5, w: 6, d: 5.5, r: 1 }, ZP, 6.2, P, 2, 0.4), { tone: "hi" })));
  out.push(mat("metal", S(k.slabOf({ x: 31, y: -17, w: 3.6, d: 7, r: 0.6 }, ZP, 7.4, P, 2, 0.3), { tone: "hi" })));
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Zócalo LGA de una placa base visto desde arriba. La palanca se levanta, la placa de retención se abre, el procesador baja en vertical con el triángulo dorado en la misma esquina que el del zócalo, y al cerrar salta la tapa de plástico.",
  body: [
    mat("pizarra", banco()),
    mat("crema", bandeja() + sitio()),
    `<g class="m-carton">${caja()}</g>`,
    mat("verde", placaBase()),
    alrededor(),
    suelo(),
    mat("grafito", PAREDES.slice(0, 2).map(pared).join("")),
    patillas(),
    mat("grafito", salientes()),
    `<g id="zc-placa-atras"></g>`,
    `<g id="zc-cpu-dentro"></g>`,
    mat("grafito", PAREDES.slice(2).map(pared).join("")),
    delante(),
    `<g id="zc-placa-delante"></g>`,
    `<g id="zc-palanca"></g>`,
    `<g id="zc-cpu-fuera"></g>`,
    `<g id="zc-tapa-suelta"></g>`,
    `<g id="zc-marcas"></g>`,
  ],
});

const CSS = `
.iso .m-carton{--anatomy-paper:#cda774;--anatomy-top:#d8b585;--anatomy-shade-0:#a27c4c;--anatomy-shade-1:#b08a58;--anatomy-shade-2:#bd9764;--anatomy-shade-3:#c8a16e;--anatomy-mid:#4a3312;--anatomy-lo:#8a6a3c;--anatomy-faint:#b08c5c}
.zc-patillas .iso-dots circle{fill:#e6b422;opacity:1}
.zc-tri{fill:#e6b422;stroke:#1d1b24;stroke-width:1px;stroke-linejoin:round}
.zc-muesca{fill:#16171c;stroke:#1d1b24;stroke-width:1px;stroke-linejoin:round}
.zc-placa{fill:#d3d6df;stroke:#1d1b24;stroke-width:1.5px;stroke-linejoin:round;fill-rule:evenodd}
.zc-placa-canto{fill:#8b8fa0;stroke:#1d1b24;stroke-width:1.5px;stroke-linejoin:round;fill-rule:evenodd}
.zc-tapa{fill:#30323c;stroke:#0e0e12;stroke-width:1.5px;stroke-linejoin:round}
.zc-tapa-l{fill:none;stroke:#5d6070;stroke-width:1px;stroke-linejoin:round}
.zc-pal{fill:none;stroke-linecap:round;stroke-linejoin:round}
.zc-pal-b{stroke:#1d1b24;stroke-width:6px}
.zc-pal-m{stroke:#c9ccd6;stroke-width:3px}
.zc-marca{fill:none;stroke-width:2.4px;stroke-linecap:round}
.zc-marca[data-linea]{stroke-dasharray:2 5}
.zc-ok{stroke:#27a857}.zc-mal{stroke:#e5484d}
.iso-stage{outline:none;touch-action:manipulation;cursor:pointer}
`;

// Piezas que se mueven, en sus propias coordenadas.
const cuadrado = (m) => [[-m, -m], [m, -m], [m, m], [-m, m]];
const SUS = cuadrado(MEDIO), IHS = k.ringOf({ x: -18, y: -18, w: 36, d: 36, r: 3.5 }, 3).map(([x, y]) => [n1(x), n1(y)]);
const TRI = [[-21.6, 21.6], [-15.4, 21.6], [-21.6, 15.4]];
const MUESCAS = [-1, 1].map((l) => [[l * MEDIO, MUESCA_Y - 1.6], [l * (MEDIO - 2.2), MUESCA_Y - 1.6], [l * (MEDIO - 2.2), MUESCA_Y + 1.6], [l * MEDIO, MUESCA_Y + 1.6]]);
const centro = (pts) => [n1(pts.reduce((s, p) => s + p[0], 0) / pts.length), n1(pts.reduce((s, p) => s + p[1], 0) / pts.length)];
// Placa de retención y tapa, medidas desde la bisagra: [a lo ancho, distancia a la bisagra].
const PLACA_F = [[-29.5, 0], [29.5, 0], [29.5, 64], [8, 64], [8, 70], [-8, 70], [-8, 64], [-29.5, 64]], PLACA_V = [[-21, 12], [21, 12], [21, 56], [-21, 56]];
const TAPA = [[-24, 6], [24, 6], [24, 58], [-24, 58]];
// Ángulo a partir del cual la placa abierta enseña su cara de abajo.
const [vx, vy] = k.towardViewer(P), cam = k.cameraOf(P);
const UMBRAL = (Math.atan2(cam.sinE ?? Math.sin((44 * Math.PI) / 180), (cam.cosE ?? Math.cos((44 * Math.PI) / 180)) * vy / Math.hypot(vx, vy)) * 180) / Math.PI;

const MODEL = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const live = `
${MODEL}
const ZC = ${JSON.stringify({ P, SUS, IHS, TRI, TRI_C: centro(TRI), MUESCAS, MUESCA_C: MUESCAS.map(centro), SALIENTES: SALIENTES.map((s) => [s.x + s.w / 2, s.y + s.d / 2]), TRI_ZOCALO: centro(TRI_ZOCALO), PLACA_F, PLACA_V, TAPA, UMBRAL: n1(UMBRAL) })};
const zcP = ZC.P;
const zcStage = document.querySelector(".iso-stage"), zcReadout = document.querySelector("[data-readout]");
const zcEl = (id) => document.getElementById(id);
const zcG = { atras: zcEl("zc-placa-atras"), dentro: zcEl("zc-cpu-dentro"), delante: zcEl("zc-placa-delante"), palanca: zcEl("zc-palanca"), fuera: zcEl("zc-cpu-fuera"), tapa: zcEl("zc-tapa-suelta"), marcas: zcEl("zc-marcas") };
const zcBotones = [...document.querySelectorAll(".zc-controles [data-caso]")];
const zcStill = matchMedia("(prefers-reduced-motion: reduce)");
const zcAt = (x, y, z) => iso([x, y, z], zcP);
const zcPoly = (pts, cls) => '<path class="' + cls + '" d="' + pathOf(pts, true) + '"/>';
const zcRad = Math.PI / 180;
let zcCaso = "bien", zcT = 0, zcLast = 0, zcFrame = 0, zcVisible = true;

function zcCpu(cpu) {
  const top = cpu.z + 1, pon = (pts, z) => pts.map((p) => zcAt(...enMundo(p, cpu), z));
  let h = '<g class="m-verde">' + solidSvg(extrude(ZC.SUS.map((p) => enMundo(p, cpu)), cpu.z, 1, zcP), { tone: "hi", crease: "none" }) + "</g>";
  for (const m of ZC.MUESCAS) h += zcPoly(pon(m, top), "zc-muesca");
  h += zcPoly(pon(ZC.TRI, top), "zc-tri");
  return h + '<g class="m-metal">' + solidSvg(extrude(ZC.IHS.map((p) => enMundo(p, cpu)), top, 2.5, zcP, { bevel: 0.5 }), { tone: "hi" }) + "</g>";
}
// Un punto de la placa de retención: u a lo ancho, v desde la bisagra, alto por encima de su cara.
const zcEnPlaca = ([u, v], ang, alto) => { const r = ang * zcRad; return zcAt(u, -34 + v * Math.cos(r) - alto * Math.sin(r), Z_PLACA + v * Math.sin(r) + alto * Math.cos(r)); };
function zcPlaca(ang, conTapa) {
  const cara = (alto, cls) => '<path class="' + cls + '" d="' + pathOf(ZC.PLACA_F.map((p) => zcEnPlaca(p, ang, alto)), true) + pathOf(ZC.PLACA_V.map((p) => zcEnPlaca(p, ang, alto)), true) + '"/>';
  const tapa = conTapa ? zcPoly(ZC.TAPA.map((p) => zcEnPlaca(p, ang, 1.7)), "zc-tapa") + zcPoly(ZC.TAPA.map(([u, v]) => zcEnPlaca([u * 0.84, 32 + (v - 32) * 0.84], ang, 1.7)), "zc-tapa-l") : "";
  // por encima del umbral se ve la cara de abajo: la tapa queda detrás
  return ang < ZC.UMBRAL ? cara(-0.9, "zc-placa-canto") + cara(0, "zc-placa") + tapa : tapa + cara(0, "zc-placa") + cara(-0.9, "zc-placa-canto");
}
function zcPalanca(p) {
  const x = 36 + 3.5 * p.fuera, r = p.ang * zcRad, L = LARGO_PALANCA;
  const d = pathOf([zcAt(-22, 35, Z_PALANCA), zcAt(x, 35, Z_PALANCA), zcAt(x, 35 - L * Math.cos(r), Z_PALANCA + L * Math.sin(r)), zcAt(x + 6, 35 - (L + 3) * Math.cos(r), Z_PALANCA + (L + 3) * Math.sin(r))]);
  return '<path class="zc-pal zc-pal-b" d="' + d + '"/><path class="zc-pal zc-pal-m" d="' + d + '"/>';
}
function zcTapaSuelta(s) {
  const x = TAPA_FIN[0] * s, y = -2 + (TAPA_FIN[1] + 2) * s, z = (Z_PLACA + 1.7) * (1 - s) + 0.9 * s + 130 * s * (1 - s), giro = 180 * s * zcRad;
  const pon = (f) => [[-24, -26], [24, -26], [24, 26], [-24, 26]].map(([a, b]) => zcAt(x + f * (a * Math.cos(giro) - b * Math.sin(giro)), y + f * (a * Math.sin(giro) + b * Math.cos(giro)), z));
  return zcPoly(pon(1), "zc-tapa") + zcPoly(pon(0.84), "zc-tapa-l");
}
function zcMarcas(pose) {
  if (!pose.marcas) return "";
  const cls = "zc-marca " + (pose.marcas === "ok" ? "zc-ok" : "zc-mal"), top = pose.cpu.z + 1;
  const aro = ([x, y], r) => '<circle class="' + cls + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '"/>';
  const linea = (a, b) => '<path class="' + cls + '" data-linea d="' + pathOf([a, b]) + '"/>';
  const pares = [[zcAt(...enMundo(ZC.TRI_C, pose.cpu), top), zcAt(...ZC.TRI_ZOCALO, Z_PARED), 8]];
  ZC.MUESCA_C.forEach((m, i) => pares.push([zcAt(...enMundo(m, pose.cpu), top), zcAt(...ZC.SALIENTES[i], Z_SALIENTE), 5.5]));
  return pares.map(([a, b, r]) => linea(a, b) + aro(a, r) + aro(b, r)).join("");
}
function zcDraw() {
  const pose = poseEn(zcT, zcCaso), cpu = { ...pose.cpu };
  if (pose.tiembla && !zcStill.matches) cpu.giro += 1.4 * Math.sin(zcT * 13) * Math.exp(-Math.max(0, zcT - duracion(zcCaso)) / 1.2);
  const placa = zcPlaca(pose.placa, pose.tapa === 0), abierta = pose.placa > 45;
  zcG.atras.innerHTML = abierta ? placa : "";
  zcG.delante.innerHTML = abierta ? "" : placa;
  const dentro = cpu.z < Z_SUELO + 1, dibujo = zcCpu(cpu);
  zcG.dentro.innerHTML = dentro ? dibujo : "";
  zcG.fuera.innerHTML = dentro ? "" : dibujo;
  zcG.palanca.innerHTML = zcPalanca(pose.palanca);
  zcG.tapa.innerHTML = pose.tapa > 0 ? zcTapaSuelta(pose.tapa) : "";
  zcG.marcas.innerHTML = zcMarcas(pose);
  if (zcReadout.textContent !== pose.texto) zcReadout.textContent = pose.texto;
}
function zcTick(now) {
  zcFrame = 0;
  const dt = zcLast ? Math.min(0.05, (now - zcLast) / 1000) : 0;
  zcLast = now;
  zcT += dt;
  zcDraw();
  if (zcVisible && !zcStill.matches && zcT < duracion(zcCaso) + 4) zcFrame = requestAnimationFrame(zcTick);
}
const zcRun = () => { if (!zcFrame && zcVisible && !zcStill.matches && zcT < duracion(zcCaso) + 4) { zcLast = 0; zcFrame = requestAnimationFrame(zcTick); } };
function zcEmpieza(caso) {
  zcCaso = caso;
  for (const b of zcBotones) b.setAttribute("aria-pressed", String(b.dataset.caso === caso));
  // Con el movimiento reducido no hay animación: se enseña cómo acaba.
  if (zcStill.matches) { zcT = duracion(caso) + 5; zcDraw(); } else { zcT = 0; zcDraw(); zcRun(); }
}
new IntersectionObserver((entries) => { zcVisible = entries[entries.length - 1].isIntersecting; if (zcVisible) zcRun(); }, { rootMargin: "120px 0px" }).observe(zcStage);
for (const b of zcBotones) b.addEventListener("click", () => zcEmpieza(b.dataset.caso));
zcStage.addEventListener("click", () => zcEmpieza(zcCaso));
zcStage.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") { event.preventDefault(); zcEmpieza(zcCaso); }
  else if (event.key === "1") zcEmpieza("bien");
  else if (event.key === "2") zcEmpieza("girado");
});
window.zcPose = (caso, t) => {
  zcVisible = false; cancelAnimationFrame(zcFrame); zcFrame = 0; zcCaso = caso; zcT = t;
  for (const b of zcBotones) b.setAttribute("aria-pressed", String(b.dataset.caso === caso));
  zcDraw();
  return zcReadout.textContent;
};
zcEmpieza("bien");
`;

const controls = `<div class="zc-controles fig-controles"><div class="fig-grupo" role="group" aria-label="Qué montaje ver"><button type="button" data-caso="bien" aria-pressed="true">Montar bien</button><button type="button" data-caso="girado" aria-pressed="false">Montar girado</button></div></div>`;
const card = k
  .plateHtml({
    fig: "Fig 4",
    title: "Zócalo LGA",
    hint: "Pulsa el dibujo para repetir el montaje",
    readout: "",
    keys: [
      { mark: "flat", label: "[#e6b422] Triángulo dorado y patillas del zócalo" },
      { mark: "flat", label: "[#d3d6df] Placa de retención y palanca" },
      { mark: "flat", label: "[#30323c] Tapa de plástico protectora" },
      { mark: "flat", label: "[#27a857] Coincide" },
      { mark: "flat", label: "[#e5484d] No coincide" },
    ],
    caption:
      `Un zócalo **LGA**, como los de Intel (LGA 1700) o el AM5 de AMD, con la placa base apoyada sobre su caja de cartón. Las **patillas** están en el zócalo: son muy finas y, si se doblan, la placa queda dañada. El procesador solo tiene contactos planos. ¶` +
      `El procesador **solo entra en una posición**. Hay dos pistas: el **triángulo dorado** de una esquina, que coincide con el del zócalo, y las **muescas** de los lados, que encajan en los salientes. ¶` +
      `Se coge por los bordes y se deja caer **en vertical**, sin arrastrarlo. Tiene que quedar plano y quieto. Al bajar la placa de retención y la palanca hace falta algo de fuerza: es normal. La tapa de plástico salta sola. **Guárdala**: hace falta si hay que devolver la placa en garantía. ¶` +
      `Prueba **Montar girado**: el procesador se queda apoyado en los salientes y no llega al fondo. **Nunca hagas fuerza**: si no entra con suavidad, está mal orientado. ¶` +
      `En un zócalo **PGA** (AM4 de AMD) es al revés: las patillas salen del procesador y el zócalo tiene agujeros. No lleva placa de retención, solo la palanca. ¶` +
      `El dibujo está simplificado: aquí hay unas 400 patillas y un LGA 1700 tiene 1700.`,
    body: `<div class="iso-stage" tabindex="0" role="group" aria-label="Zócalo del procesador: pulsa Espacio para repetir el montaje, 1 para montarlo bien y 2 para montarlo girado">${svg}</div>`,
  })
  .replace("</div><figcaption", `</div>${controls}<figcaption`);

const out = join(HERE, "../../zocalo.html");
writeFileSync(out, paginaTaller({
  isoCss: k.ISO_CSS,
  titulo: "El zócalo del procesador",
  etiqueta: "Figura · Montaje del procesador",
  h1: "El zócalo del procesador",
  lead: "Cómo se abre un zócalo LGA, por qué el procesador solo entra de una manera y qué pasa si se intenta montar girado.",
  css: CSS,
  card,
  script: kitScript() + live,
}));
console.log("wrote", out, "· umbral", UMBRAL.toFixed(1), "° · dura", M.duracion("bien").toFixed(1), "/", M.duracion("girado").toFixed(1), "s");
