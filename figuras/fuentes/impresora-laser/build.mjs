// Impresora láser en corte: se ha quitado el panel lateral y se ve el camino del papel y el tambor.
// ANATOMY=/ruta/al/clon node build.mjs [--dark]  →  impresora-laser[-light].html
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as M from "./model.mjs";
import { paginaTaller } from "../marco.mjs";

// La skill Anatomy (MIT, github.com/wheresryan22/anatomy) no va en este repo: indica dónde la tienes clonada.
const ANATOMY = process.env.ANATOMY ?? "/home/claude/terceros/anatomy";
const k = await import(`${ANATOMY}/kit/iso-kit.mjs`);
const G = await import(`${ANATOMY}/kit/lathe.mjs`);
const { kitScript } = await import(`${ANATOMY}/scripts/inline-kit.mjs`);

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 720, HEIGHT = 470;
const DEPTH = 60;                       // fondo de la máquina; el corte es el plano y = 0
const D = M.DRUM, R = M.TURNS.RIGHT, Lf = M.TURNS.LEFT;
const polar = (c, r, deg) => [c.x + r * Math.cos(deg * M.DEG), c.z + r * Math.sin(deg * M.DEG)];

const P = k.fitProjection([[-116, 0, -8], [104, 0, -8], [-116, -DEPTH - 6, 124], [104, -DEPTH - 6, 124], [104, 0, 124], [-116, 0, 124]], WIDTH, HEIGHT, { pad: 34, azimuth: 64, elevation: 22 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const smear = (() => { const a = at([0, 0, 0]), b = at([0, -1, 0]); return [b[0] - a[0], b[1] - a[1]]; })();
const keyOf = (x, z) => { const p = at([x, 0, z]); return p[0] * smear[0] + p[1] * smear[1]; };
const FY = G.frameOf([0, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 0]);          // s = y; polígonos en (z, x)
const faceOf = (pts) => k.pathOf(pts.map(([x, z]) => at([x, 0, z])), true);
const circle = (cx, cz, r, n = 40) => k.pathOf(Array.from({ length: n }, (_, i) => at([cx + r * Math.cos((2 * Math.PI * i) / n), 0, cz + r * Math.sin((2 * Math.PI * i) / n)])), true);

const items = [];
// Prisma a lo largo del fondo. `cut` pinta su cara de corte como material seccionado.
function box(x0, x1, z0, z1, { tone = "hi", part, cut, y0 = -DEPTH, y1 = 0, extra = "", key, mat = "crema" } = {}) {
  let svg = S(G.prismOf(FY, [[z0, x0], [z0, x1], [z1, x1], [z1, x0]], y0, y1, P), { tone });
  if (cut) svg += `<path class="lp-${cut}" d="${faceOf([[x0 + 0.3, z0 + 0.3], [x1 - 0.3, z0 + 0.3], [x1 - 0.3, z1 - 0.3], [x0 + 0.3, z1 - 0.3]])}"/>`;
  items.push({ key: key ?? keyOf(x1, z1), svg: `<g class="m-${mat}"${part ? ` data-part="${part}"` : ""}>${svg}${extra}</g>` });
}
// Rodillo a lo largo del fondo, con su eje a la vista en la cara de corte y un radio que gira (vivo).
function roller(name, cx, cz, r, { tone = "hi", part, spin = 1, mat = "grafito" } = {}) {
  const F = G.frameOf([cx, 0, cz], [0, 1, 0], [0, 0, 1], [1, 0, 0]);
  const svg = S(G.disc(-DEPTH, 0, r, F, P), { tone }) + Ln(circle(cx, cz, Math.max(1.1, r * 0.24), 32), { tone: "lo" }) + Dots([at([cx, 0, cz])], { size: 0.45 }) +
    `<path class="iso-line lp-spoke" data-tone="lo" data-roller="${name}"/>`;
  items.push({ key: keyOf(cx + r * 0.7, cz + r * 0.7), svg: `<g class="m-${mat}"${part ? ` data-part="${part}"` : ""} data-name="${name}">${svg}</g>` });
  return { name, x: cx, z: cz, r, spin };
}

// Carcasa: suelo, paredes, bandeja de salida y tapa. Sus caras de corte van sombreadas.
box(-114, 100, 0, 6, { cut: "cut", key: -1e9 });
box(-114, -110, 6, 110, { cut: "cut", key: -1e9 + 1 });
box(96, 100, 6, 118, { cut: "cut", key: 1e9 });
box(Lf.x + 2, 30, 106, 110, { cut: "cut" });
box(30, 96, 114, 118, { cut: "cut" });
box(30, 33, 106, 114, { cut: "cut" });
// Bandeja de papel y la pila de hojas.
box(-70, 58, 6, 12, { mat: "metal" });
box(-66, 50, 12, M.STACK_Z - 0.6, { mat: "blanco", extra: Ln([13.5, 15, 16.5].map((z) => k.segment([-66, 0, z], [50, 0, z], P)).join(""), { tone: "faint" }) });

const ROLLERS = [
  roller("pick", 44, M.STACK_Z + 6, 6, { spin: -1 }),
  roller("feed", R.x, R.z, R.r - 0.6, { spin: -1, mat: "metal" }),
  roller("reg-up", 30, M.PATH_Z + 4.4, 4, { spin: 1 }),
  roller("reg-down", 30, M.PATH_Z - 4.4, 4, { spin: -1 }),
  roller("transfer", D.x, M.PATH_Z - 6.4, 6, { part: "transferencia", spin: -1, mat: "metal" }),
  roller("drum", D.x, D.z, D.r, { part: "tambor", spin: 1, mat: "verde" }),
  roller("charge", ...polar(D, D.r + 5, M.AT.charge), 5, { part: "carga", spin: -1 }),
  roller("developer", ...polar(D, D.r + 7, M.AT.developer), 7, { part: "revelado", spin: -1, mat: "metal" }),
  roller("fuser-hot", -60, M.PATH_Z + 9.4, 9, { part: "fusion", spin: 1, mat: "naranja" }),
  roller("fuser-press", -60, M.PATH_Z - 8.9, 8.5, { part: "fusion", spin: -1 }),
  roller("exit", Lf.x, Lf.z, Lf.r - 0.6, { spin: 1, mat: "metal" }),
];
// Tolva de tóner (con el tóner a la vista en el corte), unidad láser, cuchilla y depósito de residuos.
box(30, 74, 64, 92, { part: "revelado", mat: "grafito", cut: "toner-box", extra: `<path class="lp-toner" d="${faceOf([[31.2, 65.2], [72.8, 65.2], [72.8, 82], [31.2, 78]])}"/>` });
const SLIT = [34, 101];
box(34, 90, 98, 112, { part: "exposicion", mat: "amarillo", extra: Ln(faceOf([[34.4, 99.6], [37.4, 99.6], [37.4, 102.4], [34.4, 102.4]]), { tone: "mid" }) + Ln(faceOf([[40, 101], [84, 101], [84, 109], [40, 109]]), { tone: "faint" }) + Dots([[38, 110], [86, 110], [38, 100], [86, 100]].map(([x, z]) => at([x, 0, z])), { size: 0.4 }) });
const blade = polar(D, D.r, M.AT.blade);
box(blade[0] - 13, blade[0], blade[1] - 1.6, blade[1] + 1.6, { part: "limpieza", mat: "azul" });
box(blade[0] - 27, blade[0] - 13, blade[1] - 11, blade[1] + 9, { part: "limpieza", mat: "grafito", cut: "toner-box", extra: `<path class="lp-toner" d="${faceOf([[blade[0] - 26, blade[1] - 10], [blade[0] - 14, blade[1] - 10], [blade[0] - 14, blade[1] - 5], [blade[0] - 26, blade[1] - 6.5]])}"/>` });
// Lámpara del fusor, dentro del rodillo caliente.
items.push({ key: keyOf(-60 + 9, M.PATH_Z + 18.5), svg: `<path class="lp-lamp" d="${circle(-60, M.PATH_Z + 9.4, 4.2, 24)}"/>` });

items.sort((a, b) => a.key - b.key);
const expo = polar(D, D.r, M.AT.exposure);
const back = `<g class="m-crema">${S(k.slabOf({ x: -114, y: -DEPTH - 4, w: 214, d: 4, r: 0.5 }, 0, 118, P, 2), { tone: "hi" })}</g>`;
const halo = `<path class="iso-halo" d="${k.haloOf({ x: -114, y: -DEPTH - 4, w: 214, d: DEPTH + 4, r: 2 }, -6, 6, P)}"/>`;
const feet = [[-100, -8], [86, -8], [-100, -DEPTH + 6], [86, -DEPTH + 6]].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P)).map(([x, y]) => `<g class="m-grafito">${S(k.cylinder(x, y, 6, -6, 6, P, 24), { tone: "hi" })}</g>`).join("");

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Impresora láser con el panel lateral quitado. Se ve la hoja salir de la bandeja, dar la vuelta, pasar bajo el tambor fotosensible, cruzar el fusor y salir por arriba. Alrededor del tambor están el rodillo de carga, el haz del láser, el rodillo de revelado con la tolva de tóner, el rodillo de transferencia y la cuchilla de limpieza.",
  body: [halo, feet, back, ...items.map((i) => i.svg), `<g id="lp-live"></g>`],
});

const CSS = `
.lp-cut{fill:#c9b995;stroke:none}
.lp-toner-box{fill:#efe7d6;stroke:none}
.lp-toner{fill:#1d1b24;stroke:none}
.lp-lamp{fill:#fff0b8;stroke:#1d1b24;stroke-width:1.2px;transition:fill .4s}
.lp-stage[data-hot] .lp-lamp{fill:#ff3d2e}
.iso-line.lp-paper-b{stroke:#1d1b24;stroke-width:4.6px}
.iso-line.lp-paper{stroke:#ffffff;stroke-width:2.4px}
.lp-sheet{fill:#ffffff;stroke:#1d1b24;stroke-width:1.5px;stroke-linejoin:round}
.iso-line.lp-beam{stroke:var(--anatomy-red);stroke-width:2px}
.iso-line.lp-latent{stroke:var(--anatomy-red);stroke-width:2.4px;stroke-dasharray:.1 3.6}
.iso-line.lp-ink{stroke:#1d1b24;stroke-width:3px;stroke-dasharray:.1 3.8}
.iso-line.lp-ink[data-fixed]{stroke-dasharray:none;stroke-width:1.8px}
.lp-stage [data-part] .iso-edge{transition:stroke .2s,stroke-width .2s}
.lp-stage[data-step="carga"] [data-part="carga"] .iso-edge,.lp-stage[data-step="exposicion"] [data-part="exposicion"] .iso-edge,.lp-stage[data-step="revelado"] [data-part="revelado"] .iso-edge,.lp-stage[data-step="transferencia"] [data-part="transferencia"] .iso-edge,.lp-stage[data-step="fusion"] [data-part="fusion"] .iso-edge,.lp-stage[data-step="limpieza"] [data-part="limpieza"] .iso-edge{stroke:var(--anatomy-red);stroke-width:3px}
.lp-stage{outline:none;touch-action:manipulation}
`;

const STEPS = [
  ["carga", "1 Carga", "1 · Carga: el rodillo deja el tambor con carga negativa"],
  ["exposicion", "2 Exposición", "2 · Exposición: el láser descarga los puntos de la imagen"],
  ["revelado", "3 Revelado", "3 · Revelado: el tóner se pega a los puntos descargados"],
  ["transferencia", "4 Transferencia", "4 · Transferencia: el rodillo tira del tóner hacia el papel"],
  ["fusion", "5 Fusión", "5 · Fusión: calor y presión funden el tóner en el papel"],
  ["limpieza", "6 Limpieza", "6 · Limpieza: la cuchilla retira el tóner que sobra"],
];

const MODEL = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const live = `
${MODEL}
const LP = ${JSON.stringify({ P, ROLLERS, SLIT, DEPTH, expo, STEPS })};
const lpP = LP.P;
const lpStage = document.querySelector(".lp-stage"), lpLive = document.getElementById("lp-live"), lpReadout = document.querySelector("[data-readout]");
const lpSpokes = Object.fromEntries([...document.querySelectorAll(".lp-spoke")].map((p) => [p.dataset.roller, p]));
const lpButtons = [...document.querySelectorAll(".lp-controls button")];
const lpStill = matchMedia("(prefers-reduced-motion: reduce)");
const lpAt = (x, z, y = 0) => iso([x, y, z], lpP);
const lpPath = (pts) => pathOf(pts.map(([x, z]) => lpAt(x, z)));
let lpT = 0, lpFrame = 0, lpLast = 0, lpVisible = false, lpStep = null, lpPaused = false;

// Tramo del camino del papel entre dos distancias, desplazado hacia la cara impresa si hace falta.
function lpRun(from, to, lift = 0) {
  const pts = [];
  for (let s = from; s < to; s += 2.5) { const p = along(s); pts.push([p.x + p.dz * lift, p.z - p.dx * lift]); }
  const p = along(to); pts.push([p.x + p.dz * lift, p.z - p.dx * lift]);
  return pts;
}
const lpArc = (r, hi, lo) => { const pts = []; for (let a = hi; a > lo; a -= 4) pts.push([DRUM.x + r * Math.cos(a * DEG), DRUM.z + r * Math.sin(a * DEG)]); pts.push([DRUM.x + r * Math.cos(lo * DEG), DRUM.z + r * Math.sin(lo * DEG)]); return pts; };

function lpDraw() {
  const t = lpT, sheet = sheetAt(t), turn = (SPEED * Math.max(0, t - 0.6));
  for (const r of LP.ROLLERS) {
    const a = (sheet.moving ? turn / r.r : 0) * -r.spin;
    lpSpokes[r.name].setAttribute("d", pathOf([lpAt(r.x + Math.max(1.1, r.r * 0.24) * Math.cos(a), r.z + Math.max(1.1, r.r * 0.24) * Math.sin(a)), lpAt(r.x + r.r * Math.cos(a), r.z + r.r * Math.sin(a))]));
  }
  let html = "";
  // La hoja: su canto en el corte y, al salir, la hoja tumbada en la bandeja de arriba.
  const topFrom = S.end - SHEET;
  if (sheet.lead > topFrom + 1) {
    const x0 = along(Math.max(sheet.tail, topFrom)).x, x1 = along(sheet.lead).x;
    html += '<path class="lp-sheet" d="' + pathOf([lpAt(x0, TOP_Z), lpAt(x1, TOP_Z), lpAt(x1, TOP_Z, -LP.DEPTH + 4), lpAt(x0, TOP_Z, -LP.DEPTH + 4)], true) + '"/>';
  }
  { const canto = lpPath(lpRun(sheet.tail, sheet.lead)); html += '<path class="iso-line lp-paper-b" data-free="both" d="' + canto + '"/><path class="iso-line lp-paper" data-free="both" d="' + canto + '"/>'; }
  // El tóner sobre el papel: suelto entre el tambor y el fusor, fijado después (queda en la cara de abajo al salir).
  const inkFrom = sheet.tail + MARGIN, inkTo = sheet.lead - MARGIN;
  if (inkTo > S.nip) {
    const loose = [Math.max(inkFrom, S.nip), Math.min(inkTo, S.fuser)], fixed = [Math.max(inkFrom, S.fuser), inkTo];
    if (loose[1] > loose[0] + 1) html += '<path class="iso-line lp-ink" data-free="both" d="' + lpPath(lpRun(loose[0], loose[1], 1.3)) + '"/>';
    if (fixed[1] > fixed[0] + 1) html += '<path class="iso-line lp-ink" data-fixed data-free="both" d="' + lpPath(lpRun(fixed[0], fixed[1], 0.9)) + '"/>';
  }
  // Sobre el tambor: imagen latente (del láser al revelado) y tóner (del revelado al papel).
  const latent = imageOn(t, AT.exposure, AT.developer), toner = imageOn(t, AT.developer, AT.transfer);
  if (latent) html += '<path class="iso-line lp-latent" data-free="both" d="' + lpPath(lpArc(DRUM.r + 1.1, latent[0], latent[1])) + '"/>';
  if (toner) html += '<path class="iso-line lp-ink" data-free="both" d="' + lpPath(lpArc(DRUM.r + 1.3, toner[0], toner[1])) + '"/>';
  // El haz: barre el tambor de lado a lado mientras escribe.
  const on = writing(t) || lpStep === "exposicion";
  if (on) {
    const blink = lpStill.matches || lpPaused ? 1 : 0.55 + 0.45 * Math.abs(Math.sin(t * 22));
    html += '<path class="iso-line lp-beam" opacity="' + blink.toFixed(2) + '" d="' + pathOf([lpAt(LP.SLIT[0] + 0.4, 101), lpAt(LP.expo[0], LP.expo[1])]) + '"/>';
  }
  lpLive.innerHTML = html;
  lpStage.toggleAttribute("data-hot", lpStep === "fusion" || (sheet.lead > S.fuser - 30 && sheet.tail < S.fuser + 10));
  let text;
  if (lpStep) text = LP.STEPS.find((s) => s[0] === lpStep)[2];
  else if (!sheet.moving) text = sheet.lead >= S.end ? "hoja impresa: sale con la cara hacia abajo" : "en reposo: la hoja espera en la bandeja";
  else if (sheet.tail > S.fuser) text = "la hoja sale hacia la bandeja de arriba";
  else if (sheet.lead > S.fuser) text = "fusión: calor y presión fijan el tóner";
  else if (sheet.lead > S.nip) text = "transferencia: el tóner pasa del tambor al papel";
  else if (toner) text = "revelado: el tóner cubre la imagen del tambor";
  else if (writing(t)) text = "exposición: el láser dibuja la página en el tambor";
  else text = "el rodillo recoge una hoja de la bandeja";
  if (lpReadout.textContent !== text) lpReadout.textContent = text;
}
function lpTick(now) {
  const dt = lpLast ? Math.min((now - lpLast) / 1000, 1 / 20) : 1 / 60;
  lpLast = now;
  lpT = (lpT + dt) % CYCLE;
  lpDraw();
  lpFrame = lpVisible && !lpPaused && !lpStill.matches ? requestAnimationFrame(lpTick) : 0;
}
const lpRunLoop = () => { if (!lpFrame && lpVisible && !lpPaused && !lpStill.matches) { lpLast = 0; lpFrame = requestAnimationFrame(lpTick); } };
// Cada paso lleva la hoja al momento en que ese paso se ve mejor y lo deja resaltado; pulsarlo otra vez sigue.
const LP_MOMENT = { carga: 2.9, exposicion: 3.3, revelado: 3.7, transferencia: 4.4, fusion: 6.0, limpieza: 5.2 };
function lpSet(step) {
  lpStep = lpStep === step ? null : step;
  for (const b of lpButtons) b.setAttribute("aria-pressed", String(b.dataset.step === lpStep));
  if (lpStep) { lpStage.dataset.step = lpStep; lpT = LP_MOMENT[lpStep]; lpPaused = true; lpDraw(); }
  else { delete lpStage.dataset.step; lpPaused = false; lpDraw(); lpRunLoop(); }
}
new IntersectionObserver((entries) => { lpVisible = entries[entries.length - 1].isIntersecting; if (lpVisible) lpRunLoop(); }, { rootMargin: "120px 0px" }).observe(lpStage);
for (const b of lpButtons) b.addEventListener("click", () => lpSet(b.dataset.step));
lpStage.addEventListener("keydown", (event) => { const n = Number(event.key); if (n >= 1 && n <= 6) lpSet(LP.STEPS[n - 1][0]); else if (event.key === "Escape" && lpStep) lpSet(lpStep); });
window.lpAtTime = (t, step) => { lpPaused = true; lpStep = step || null; if (lpStep) lpStage.dataset.step = lpStep; else delete lpStage.dataset.step; lpT = t; lpDraw(); return lpReadout.textContent; };
if (lpStill.matches) lpT = 4.4;
lpDraw();
`;

const controls = `<div class="lp-controls fig-controles" role="group" aria-label="Pasos de la impresión">${STEPS.map(([id, label]) => `<button type="button" data-step="${id}" aria-pressed="false">${label}</button>`).join("")}</div>`;
const card = k
  .plateHtml({
    fig: "Fig 3",
    title: "Impresora láser",
    hint: "Pulsa un paso para pararla ahí",
    readout: "",
    keys: [
      { mark: "red", label: "Haz del láser y, punteada, la imagen que deja en el tambor" },
      { mark: "flat", label: "[#1d1b24] Tóner: suelto (puntos) hasta el fusor, fijado (línea) después" },
      { mark: "flat", label: "[#4fc779] Tambor fotosensible" },
      { mark: "flat", label: "[#ffd23f] Unidad láser" },
      { mark: "flat", label: "[#ff7a50] Rodillo caliente del fusor" },
      { mark: "flat", label: "[#5b90ea] Cuchilla de limpieza" },
    ],
    caption:
      "Una impresora láser con el panel lateral quitado. El tambor gira a la misma velocidad que el papel y pasa por seis pasos en cada vuelta. ¶**Carga:** un rodillo deja su superficie con carga eléctrica negativa. ¶**Exposición:** el láser, movido por un espejo giratorio, barre el tambor de lado a lado y descarga solo los puntos que forman la página. ¶**Revelado:** el tóner, un polvo de plástico con carga, se pega a esos puntos. ¶**Transferencia:** un rodillo con carga contraria, debajo del papel, hace que el tóner salte a la hoja. ¶**Fusión:** dos rodillos, uno caliente (unos 200 °C), funden el tóner y lo aprietan contra el papel; hasta ahí se podría borrar con el dedo. ¶**Limpieza:** una cuchilla rasca el tóner que ha quedado en el tambor y lo lleva al depósito de residuos. ¶La hoja sale con la cara impresa hacia abajo.",
    body: `<div class="iso-stage lp-stage" tabindex="0" role="group" aria-label="Impresora láser: pulsa del 1 al 6 para parar la impresión en cada paso; Escape la reanuda">${svg}</div>`,
  })
  .replace("</div><figcaption", `</div>${controls}<figcaption`);

const out = join(HERE, "../../impresora-laser.html");
writeFileSync(out, paginaTaller({
  isoCss: k.ISO_CSS,
  titulo: "Impresora láser por dentro",
  etiqueta: "Figura · Periféricos",
  h1: "Impresora láser por dentro",
  lead: "Una impresora láser sin el panel lateral. Sigue la hoja desde la bandeja hasta la salida y párala en cada uno de los seis pasos.",
  css: CSS,
  card,
  script: kitScript() + live,
}));
console.log("wrote", out, "· ciclo", M.CYCLE.toFixed(1), "s ·", items.length, "piezas");
