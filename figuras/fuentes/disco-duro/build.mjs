// Disco duro sin la tapa: el brazo va a la pista y el plato gira hasta que el trozo del archivo pasa bajo el cabezal.
// ANATOMY=/ruta/al/clon node build.mjs  →  ../../disco-duro.html (con la cabecera y los colores del taller)
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
const WIDTH = 720, HEIGHT = 470;
const BASE = { x: -66, y: -88, w: 166, d: 176, r: 8 };
const CAJA = { x: -51, y: -74, w: 102, d: 147, r: 4 };
const PARED = 3.2, Z_SUELO = 5, Z_PARED = 17;
const [CX, CY] = M.CENTRO, [EX, EY] = M.EJE;
const R_PLATO = 47, Z_PLATO = 10, ALTO_PLATO = 2;
const Z_BRAZO = 13.2;
const SSD = { x: 63, y: -48, w: 22, d: 80, r: 1.5 };

const P = k.fitProjection([...k.boxCorners(BASE, -12, 0), ...k.boxCorners(CAJA, 0, Z_PARED + 6)], WIDTH, HEIGHT, { pad: 14, azimuth: 38, elevation: 44 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const fondo = (x, y, z = 0) => k.depthOf([x, y, z], P);

function banco() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -12, 12, P)}"/>`];
  for (const [x, y] of k.corners(BASE, 20).sort((a, b) => fondo(...a) - fondo(...b))) out.push(mat("grafito", S(k.cylinder(x, y, 7, -12, 4, P, 28), { tone: "hi" })));
  out.push(S(k.slabOf(BASE, -8, 8, P, 8, 1.4), { tone: "hi" }));
  out.push(Ln(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "lo" }));
  const tornillos = k.corners(BASE, 11);
  out.push(Ln(tornillos.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }), Dots(tornillos.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// Las cuatro paredes de la caja: las dos de atrás se pintan antes que el interior y las dos de delante, después.
const PAREDES = [
  { x: CAJA.x, y: CAJA.y, w: PARED, d: CAJA.d, r: 1 }, { x: CAJA.x + CAJA.w - PARED, y: CAJA.y, w: PARED, d: CAJA.d, r: 1 },
  { x: CAJA.x, y: CAJA.y, w: CAJA.w, d: PARED, r: 1 }, { x: CAJA.x, y: CAJA.y + CAJA.d - PARED, w: CAJA.w, d: PARED, r: 1 },
].map((plan) => ({ plan, fondo: fondo(plan.x + plan.w / 2, plan.y + plan.d / 2) })).sort((a, b) => a.fondo - b.fondo);
const pared = ({ plan }) => S(k.slabOf(plan, 0, Z_PARED, P, 2, 0.5), { tone: "hi" });

function suelo() {
  const out = [S(k.slabOf(CAJA, 0, Z_SUELO, P, 4, 0.5), { tone: "hi" })];
  out.push(Ln(k.planOutline(k.insetPlan(CAJA, PARED + 2), Z_SUELO, P, 4), { tone: "faint" }));
  // Motor del eje, bajo el plato.
  out.push(S(k.cylinder(CX, CY, 15, Z_SUELO, Z_PLATO - Z_SUELO, P, 36), { tone: "hi" }));
  return out.join("");
}

function plato() {
  const out = [];
  const top = Z_PLATO + ALTO_PLATO;
  out.push(S(k.cylinder(CX, CY, R_PLATO, Z_PLATO, ALTO_PLATO, P, 96, 0.3), { tone: "hi" }));
  out.push(Ln([M.R_FUERA + 1.6, 38, 31, 24, M.R_DENTRO - 1.6].map((r) => k.ring(CX, CY, r, top, P, 96)).join(""), { tone: "faint" }));
  // Buje con sus seis tornillos.
  out.push(mat("grafito", S(k.cylinder(CX, CY, 12.5, top, 3, P, 40, 0.4), { tone: "hi" }) + Ln(k.ring(CX, CY, 4, top + 3, P, 20), { tone: "lo" }) +
    Dots(Array.from({ length: 6 }, (_, i) => at([CX + 8.4 * Math.cos((i * Math.PI) / 3), CY + 8.4 * Math.sin((i * Math.PI) / 3), top + 3])), { size: 0.5 })));
  return out.join("");
}

// Imán de la bobina, eje del brazo y rampa de aparcado.
function actuador() {
  const out = [];
  const iman = { x: EX - 4, y: EY + 3, w: 22, d: 20, r: 3 };
  out.push(mat("grafito", S(k.slabOf(iman, Z_SUELO, 11, P, 4, 0.5), { tone: "hi" }) + Ln(k.planOutline(k.insetPlan(iman, 3), Z_SUELO + 11, P, 3), { tone: "lo" }) +
    Dots(k.corners(iman, 3.5).map(([x, y]) => at([x, y, Z_SUELO + 11])), { size: 0.45 })));
  out.push(S(k.cylinder(EX, EY, 5.2, Z_SUELO, Z_BRAZO - Z_SUELO, P, 28), { tone: "hi" }));
  return out.join("");
}
function rampa() {
  const [x, y] = M.cabezal(R_PLATO + 3.5);
  return mat("blanco", S(k.slabOf({ x: x - 4, y: y - 4, w: 8, d: 8, r: 1.5 }, Z_SUELO, Z_BRAZO - Z_SUELO - 1.5, P, 3, 0.4), { tone: "hi" }));
}
function ejeTapa() {
  return S(k.cylinder(EX, EY, 4, Z_BRAZO + 2, 1.6, P, 24, 0.3), { tone: "hi" }) + Dots([at([EX, EY, Z_BRAZO + 3.6])], { size: 0.6, tone: "hi" });
}

// Conector SATA en el canto de la caja y placa con la velocidad de giro.
function conector() {
  const plan = { x: CAJA.x + 18, y: CAJA.y + CAJA.d, w: 44, d: 4, r: 0.6 };
  return mat("negro", S(k.slabOf(plan, 1, 8, P, 2, 0.3), { tone: "hi" })) + Dots([at([plan.x + 6, plan.y + 4, 5]), at([plan.x + 38, plan.y + 4, 5])], { size: 0.4 });
}
function placa() {
  const plan = { x: 55, y: 44, w: 41, d: 13, r: 1.4 };
  return mat("crema", S(k.slabOf(plan, 0, 0.8, P, 3), { tone: "hi", crease: "none" }) + Ln(k.planOutline(k.insetPlan(plan, 1.6), 0.8, P, 3), { tone: "faint" }) +
    `<g id="dd-placa">${k.faceTextSvg(k.topMatrix([plan.x + 5, plan.y + 8.6], 0.8, P, "x"), "7200 rpm", { size: 5.6, tone: "hi" })}</g>`);
}

// El SSD M.2 al lado: tres chips y nada que se mueva.
function ssd() {
  const out = [S(k.slabOf(SSD, 0, 1.4, P, 3, 0.2), { tone: "hi" })];
  const chips = [[SSD.y + 8, 22], [SSD.y + 34, 18], [SSD.y + 56, 12]];
  out.push(`<g id="dd-chips" class="m-negro">${chips.map(([y, d]) => S(k.slabOf({ x: SSD.x + 3, y, w: 16, d, r: 0.8 }, 1.4, 1.6, P, 2, 0.2), { tone: "hi", className: "dd-chip" })).join("")}</g>`);
  let contactos = "";
  for (let i = 0; i < 9; i++) contactos += k.lineOnTop([SSD.x + 2.4 + i * 2.1, SSD.y + SSD.d - 4.6], [SSD.x + 2.4 + i * 2.1, SSD.y + SSD.d - 0.3], 1.4, P);
  out.push(Ln(contactos, { tone: "hi", className: "dd-oro", free: true }));
  out.push(Ln(k.ring(SSD.x + 11, SSD.y + 2.6, 1.7, 1.4, P, 14), { tone: "mid" }));
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Disco duro sin la tapa, visto desde arriba. El plato gira y el brazo lleva el cabezal hasta una pista marcada en rojo; después espera a que el trozo del archivo, también en rojo, pase por debajo. Al lado hay un SSD M.2, que no tiene piezas móviles.",
  body: [
    mat("pizarra", banco()),
    placa(),
    mat("metal", suelo() + PAREDES.slice(0, 2).map(pared).join("")),
    mat("metal", actuador()),
    mat("blanco", plato()),
    `<g id="dd-plato"></g>`,
    rampa(),
    `<g id="dd-brazo" class="m-naranja"></g>`,
    mat("metal", ejeTapa()),
    mat("metal", PAREDES.slice(2).map(pared).join("")),
    conector(),
    mat("verde", ssd()),
  ],
});

const CSS = `
.iso-line.dd-pista{stroke:#e5484d;stroke-width:1.5px;stroke-dasharray:3 4}
.iso-line.dd-trozo{stroke:#e5484d;stroke-width:6px;stroke-linecap:butt}
.iso-line.dd-trozo[data-lee]{stroke:#3fbf6a}
.iso-line.dd-gira{stroke:#8d8576;stroke-width:1.4px}
.iso-line.dd-oro{stroke:#e0b02a;stroke-width:1.6px}
.dd-chip .iso-top{transition:fill .12s}
#dd-chips[data-lee] .dd-chip .iso-top{fill:#3fbf6a}
.iso-stage{outline:none;touch-action:manipulation;cursor:pointer}
`;

const MODEL = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

const live = `
${MODEL}
const DD = ${JSON.stringify({ P, Z: Z_PLATO + ALTO_PLATO, Z_BRAZO, R_PLATO })};
const ddP = DD.P;
const ddStage = document.querySelector(".iso-stage"), ddReadout = document.querySelector("[data-readout]");
const ddEl = (id) => document.getElementById(id);
const ddPlato = ddEl("dd-plato"), ddBrazo = ddEl("dd-brazo"), ddChips = ddEl("dd-chips"), ddPlaca = ddEl("dd-placa").querySelector("text");
const ddBotones = [...document.querySelectorAll(".dd-controles [data-rpm]")], ddOtro = document.querySelector(".dd-controles [data-otro]");
const ddStill = matchMedia("(prefers-reduced-motion: reduce)");
const ddNum = (v, d = 1) => v.toFixed(d).replace(".", ",");
const ddTAU = 2 * Math.PI;
const ddArco = (r, a0, a1, z, n = 24) => pathOf(Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return iso([CENTRO[0] + r * Math.cos(a), CENTRO[1] + r * Math.sin(a), z], ddP); }));
let ddRpm = 7200, ddRand = azar(7), ddClock = 0, ddLast = 0, ddFrame = 0, ddVisible = true;
// Estado de la lectura: radio actual, pista pedida, dónde está el trozo y cuánto dura cada parte.
let dd = { fase: "reposo", r: 30, r0: 30, r1: 30, trozo0: 0, inicio: 0, brazo: 0, giro: 0, hasta: 600 };
const ddAngPlato = () => (ddClock / vueltaMs(ddRpm)) * ddTAU;

function ddPedir() {
  const r1 = R_DENTRO + (R_FUERA - R_DENTRO) * ddRand(), brazo = brazoMs(dd.r, r1), trozo0 = ddRand() * ddTAU;
  // dónde estará el trozo cuando llegue el brazo, y cuánto falta entonces para que pase bajo el cabezal
  const alLlegar = trozo0 + ddAngPlato() + (brazo / vueltaMs(ddRpm)) * ddTAU;
  dd = { fase: "brazo", r: dd.r, r0: dd.r, r1, trozo0, inicio: ddClock, brazo, giro: giroMs(ddRpm, alLlegar, r1), hasta: 0 };
}
function ddAvanza() {
  const t = ddClock - dd.inicio;
  if (dd.fase === "brazo") {
    const u = dd.brazo ? Math.min(1, t / dd.brazo) : 1, e = u * u * (3 - 2 * u);
    dd.r = dd.r0 + (dd.r1 - dd.r0) * e;
    if (u >= 1) dd.fase = "giro";
  }
  if (dd.fase === "giro" && t >= dd.brazo + dd.giro) { dd.fase = "lee"; dd.hasta = ddClock + 0.9; }
  if (dd.fase === "lee" && ddClock >= dd.hasta) { dd.fase = "hecho"; dd.hasta = ddClock + 9; }
  if (dd.fase === "hecho" && ddClock >= dd.hasta) ddPedir();
  if (dd.fase === "reposo" && ddClock >= dd.hasta) ddPedir();
}
function ddDraw() {
  const z = DD.Z + 0.05, giro = ddAngPlato();
  // Marcas que giran con el plato, la pista pedida y el trozo del archivo.
  let marcas = "";
  for (let i = 0; i < 3; i++) { const a = giro + (i * ddTAU) / 3; marcas += pathOf([iso([CENTRO[0] + 14.5 * Math.cos(a), CENTRO[1] + 14.5 * Math.sin(a), z], ddP), iso([CENTRO[0] + 16 * Math.cos(a), CENTRO[1] + 16 * Math.sin(a), z], ddP)]) + ddArco(DD.R_PLATO - 1.6, a, a + 0.16, z, 6); }
  let html = '<path class="iso-line dd-gira" data-free="both" d="' + marcas + '"/>';
  if (dd.fase !== "reposo") {
    const a = dd.trozo0 + giro, ancho = 8.5 / dd.r1;
    html += '<path class="iso-line dd-pista" data-free="both" d="' + ddArco(dd.r1, 0, ddTAU, z, 72) + '"/>';
    html += '<path class="iso-line dd-trozo" data-free="both"' + (dd.fase === "lee" ? " data-lee" : "") + ' d="' + ddArco(dd.r1, a - ancho, a + ancho, z, 10) + '"/>';
  }
  ddPlato.innerHTML = html;
  // El brazo: una pieza que se estrecha hacia el cabezal.
  const a = anguloBrazo(dd.r), c = Math.cos(a), s = Math.sin(a), [hx, hy] = cabezal(dd.r);
  const lado = (d, w) => [EJE[0] + d * c - w * s, EJE[1] + d * s + w * c];
  const plan = [lado(-9, -6), lado(4, -6.4), lado(LARGO_BRAZO - 4, -1.9), lado(LARGO_BRAZO - 4, 1.9), lado(4, 6.4), lado(-9, 6)];
  const patin = [lado(LARGO_BRAZO - 5, -2.6), lado(LARGO_BRAZO + 2.4, -2.6), lado(LARGO_BRAZO + 2.4, 2.6), lado(LARGO_BRAZO - 5, 2.6)];
  ddBrazo.innerHTML =
    solidSvg(extrude(plan, DD.Z_BRAZO, 1.8, ddP), { tone: "hi", crease: "none" }) +
    '<g class="m-negro">' + solidSvg(extrude(patin, DD.Z + 0.4, DD.Z_BRAZO - DD.Z - 0.4, ddP), { tone: "hi", crease: "none" }) + "</g>" +
    lineSvg(pathOf([iso([...lado(8, 0), DD.Z_BRAZO + 1.8], ddP), iso([...lado(LARGO_BRAZO - 8, 0), DD.Z_BRAZO + 1.8], ddP)]), { tone: "lo", free: true });
  ddChips.toggleAttribute("data-lee", dd.fase === "lee");
  const t = ddClock - dd.inicio, total = dd.brazo + dd.giro;
  let text;
  if (dd.fase === "reposo") text = "en reposo: el plato gira a " + ddRpm + " rpm";
  else if (dd.fase === "brazo") text = "mueve el brazo: " + ddNum(Math.min(t, dd.brazo)) + " ms";
  else if (dd.fase === "giro") text = "brazo " + ddNum(dd.brazo) + " ms · espera el giro: " + ddNum(Math.max(0, t - dd.brazo)) + " ms";
  else text = "brazo " + ddNum(dd.brazo) + " + giro " + ddNum(dd.giro) + " = " + ddNum(total) + " ms · un SSD, " + ddNum(MS_SSD) + " ms";
  if (ddReadout.textContent !== text) ddReadout.textContent = text;
}
function ddTick(now) {
  ddFrame = 0;
  const dt = ddLast ? Math.min(0.05, (now - ddLast) / 1000) : 0;
  ddLast = now;
  ddClock += (dt * 1000) / LENTO;
  ddAvanza();
  ddDraw();
  if (ddVisible && !ddStill.matches) ddFrame = requestAnimationFrame(ddTick);
}
const ddRun = () => { if (!ddFrame && ddVisible && !ddStill.matches) { ddLast = 0; ddFrame = requestAnimationFrame(ddTick); } };
// Con el movimiento reducido no hay animación: cada lectura se enseña ya terminada.
function ddFija() { ddPedir(); ddClock = dd.inicio + dd.brazo + dd.giro; dd.r = dd.r1; dd.fase = "hecho"; dd.hasta = Infinity; ddDraw(); }
function ddOtra() { if (ddStill.matches) { ddFija(); return; } ddPedir(); ddDraw(); ddRun(); }
function ddSetRpm(rpm) {
  ddRpm = rpm; ddClock = 0;
  dd = { fase: "reposo", r: dd.r, r0: dd.r, r1: dd.r, trozo0: 0, inicio: 0, brazo: 0, giro: 0, hasta: 1.5 };
  ddPlaca.textContent = rpm + " rpm";
  for (const b of ddBotones) b.setAttribute("aria-pressed", String(Number(b.dataset.rpm) === rpm));
  if (ddStill.matches) ddFija(); else { ddDraw(); ddRun(); }
}
new IntersectionObserver((entries) => { ddVisible = entries[entries.length - 1].isIntersecting; if (ddVisible) ddRun(); }, { rootMargin: "120px 0px" }).observe(ddStage);
for (const b of ddBotones) b.addEventListener("click", () => ddSetRpm(Number(b.dataset.rpm)));
ddOtro.addEventListener("click", ddOtra);
ddStage.addEventListener("click", ddOtra);
ddStage.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") { event.preventDefault(); ddOtra(); }
  else if (event.key === "r" || event.key === "R") ddSetRpm(ddRpm === 7200 ? 5400 : 7200);
});
window.ddPose = (rpm, semilla, fase) => {
  ddVisible = false; cancelAnimationFrame(ddFrame); ddFrame = 0; ddRand = azar(semilla); ddRpm = rpm; ddClock = 3; dd.r = 30;
  ddPlaca.textContent = rpm + " rpm"; for (const b of ddBotones) b.setAttribute("aria-pressed", String(Number(b.dataset.rpm) === rpm));
  ddPedir();
  if (fase === "brazo") { ddClock = dd.inicio + dd.brazo * 0.5; ddAvanza(); }
  else if (fase === "giro") { ddClock = dd.inicio + dd.brazo + dd.giro * 0.5; dd.r = dd.r1; dd.fase = "giro"; }
  else { ddClock = dd.inicio + dd.brazo + dd.giro; dd.r = dd.r1; dd.fase = fase === "lee" ? "lee" : "hecho"; dd.hasta = Infinity; }
  ddDraw();
  return ddReadout.textContent;
};
ddSetRpm(7200);
`;

const c = (v, d = 1) => v.toFixed(d).replace(".", ",");
const controls = `<div class="dd-controles fig-controles"><div class="fig-grupo" role="group" aria-label="Velocidad de giro">${M.RPMS.map((rpm) => `<button type="button" data-rpm="${rpm}" aria-pressed="${rpm === 7200}">${rpm} rpm</button>`).join("")}</div><button type="button" data-otro>Abrir otro archivo</button></div>`;
const card = k
  .plateHtml({
    fig: "Fig 2",
    title: "Disco duro",
    hint: "Pulsa el disco para abrir otro archivo",
    readout: "",
    keys: [
      { mark: "red", label: "La pista (a rayas) y el trozo del archivo que se busca" },
      { mark: "flat", label: "[#ff7a50] Brazo, con el cabezal en la punta" },
      { mark: "flat", label: "[#4fc779] SSD M.2: solo chips" },
    ],
    caption:
      `Un disco duro sin la tapa. El plato gira sin parar y el brazo lleva el cabezal de una pista a otra, como la aguja de un tocadiscos, pero sin tocar el plato. ¶` +
      `Para abrir un archivo hay **dos esperas**. Primero el brazo se mueve hasta la pista: cuanto más lejos está, más tarda. Después hay que esperar a que el plato gire hasta que el trozo del archivo pase por debajo del cabezal. ¶` +
      `A **7200 rpm** una vuelta dura ${c(M.vueltaMs(7200))} ms; a **5400 rpm**, ${c(M.vueltaMs(5400))} ms. Unas veces el trozo está a punto de pasar y otras acaba de irse: de media toca esperar media vuelta. ¶` +
      `Un **SSD** no mueve nada: lee sus chips en unos ${c(M.MS_SSD)} ms. Por eso con un SSD el equipo arranca y abre los programas mucho más rápido. ¶` +
      `Va a cámara lenta, ${M.LENTO} veces más despacio. El tiempo del brazo es aproximado: en un disco real, cruzar todo el plato lleva unos ${c(M.brazoMs(M.R_DENTRO, M.R_FUERA), 0)} ms.`,
    body: `<div class="iso-stage" tabindex="0" role="group" aria-label="Disco duro: pulsa Espacio para abrir otro archivo y R para cambiar la velocidad de giro">${svg}</div>`,
  })
  .replace("</div><figcaption", `</div>${controls}<figcaption`);

const out = join(HERE, "../../disco-duro.html");
writeFileSync(out, paginaTaller({
  isoCss: k.ISO_CSS,
  titulo: "El disco duro por dentro",
  etiqueta: "Figura · Almacenamiento",
  h1: "El disco duro por dentro",
  lead: "Por qué un disco duro tarda en abrir un archivo: mover el brazo hasta la pista y esperar a que el plato gire. Y por qué un SSD no tiene que esperar a nada.",
  css: CSS,
  card,
  script: kitScript() + live,
}));
console.log("wrote", out, "· vuelta", M.RPMS.map((r) => M.vueltaMs(r).toFixed(2)).join(" / "), "ms");
