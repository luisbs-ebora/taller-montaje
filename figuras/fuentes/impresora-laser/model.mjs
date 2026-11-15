// Impresora láser en corte lateral. Coordenadas del corte: x a lo ancho, z arriba (el corte es el plano y = 0).
// Todo lo que se mueve sale de aquí: el camino del papel, el giro del tambor y cuándo escribe el láser.
export const SPEED = 40;                       // velocidad del papel = velocidad de la superficie del tambor (unidades/s)
export const SHEET = 112;                      // largo de la hoja
export const MARGIN = 6;                       // margen sin imprimir en cada extremo
export const DRUM = { x: 0, z: 78, r: 16 };
export const DEG = Math.PI / 180;
// Ángulos sobre el tambor (desde +x hacia +z). El tambor gira en el sentido en que el ángulo disminuye.
export const AT = { exposure: 62, developer: -10, transfer: -90, blade: -170, charge: 125 };
export const PATH_Z = 62, TOP_Z = 110.6, STACK_Z = 18;
const RIGHT = { x: 50, z: (STACK_Z + PATH_Z) / 2, r: (PATH_Z - STACK_Z) / 2 };     // vuelta de alimentación
const LEFT = { x: -84, z: (PATH_Z + TOP_Z) / 2, r: (TOP_Z - PATH_Z) / 2 };          // vuelta de salida
export const TURNS = { RIGHT, LEFT };
const L1 = RIGHT.x + 62, L2 = Math.PI * RIGHT.r, L3 = RIGHT.x - LEFT.x, L4 = Math.PI * LEFT.r;
export const S = { start: SHEET, nip: L1 + L2 + RIGHT.x, fuser: L1 + L2 + RIGHT.x + 60, end: L1 + L2 + L3 + L4 + SHEET };
export const ARC = (from, to) => DRUM.r * (from - to) * DEG;       // camino sobre el tambor entre dos ángulos
export const CYCLE = (S.end - S.start) / SPEED + 2.2;              // segundos por hoja, con la pausa final

// Punto y dirección del camino del papel a la distancia s desde el fondo de la bandeja.
export function along(s) {
  if (s <= L1) return { x: -62 + s, z: STACK_Z, dx: 1, dz: 0 };
  s -= L1;
  if (s <= L2) { const a = -90 * DEG + s / RIGHT.r; return { x: RIGHT.x + RIGHT.r * Math.cos(a), z: RIGHT.z + RIGHT.r * Math.sin(a), dx: -Math.sin(a), dz: Math.cos(a) }; }
  s -= L2;
  if (s <= L3) return { x: RIGHT.x - s, z: PATH_Z, dx: -1, dz: 0 };
  s -= L3;
  if (s <= L4) { const a = -90 * DEG - s / LEFT.r; return { x: LEFT.x + LEFT.r * Math.cos(a), z: LEFT.z + LEFT.r * Math.sin(a), dx: Math.sin(a), dz: -Math.cos(a) }; }
  s -= L4;
  return { x: LEFT.x + s, z: TOP_Z, dx: 1, dz: 0 };
}

// Estado de la hoja en el instante t del ciclo.
export function sheetAt(t) {
  const lead = Math.min(S.end, S.start + SPEED * Math.max(0, t - 0.6));
  return { lead, tail: lead - SHEET, moving: lead > S.start && lead < S.end };
}
// Tramo del tambor (ángulos) que lleva imagen ahora mismo. Un punto del tambor en el ángulo a tocará el papel
// cuando la superficie avance ARC(a, transfer); la imagen ocupa la hoja menos los márgenes.
function imageSpan(t) {
  const { lead } = sheetAt(t), k = DRUM.r * DEG;
  return [AT.transfer + (S.nip + MARGIN - lead) / k, AT.transfer + (S.nip + SHEET - MARGIN - lead) / k];
}
// El láser escribe cuando el punto de exposición cae dentro de ese tramo: así la imagen llega a la
// transferencia a la vez que el papel.
export function writing(t) { const [lo, hi] = imageSpan(t); return lo < AT.exposure && AT.exposure < hi; }
// Parte de la imagen que está entre dos estaciones del tambor, como [ángulo mayor, ángulo menor], o null.
export function imageOn(t, from, to) {
  const [lo, hi] = imageSpan(t), a = Math.min(from, hi), b = Math.max(to, lo);
  return b < a ? [a, b] : null;
}
