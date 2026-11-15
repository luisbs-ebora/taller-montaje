// Modelo de la lectura de un archivo en un disco duro: mover el brazo hasta la pista y esperar el giro del plato.
// Tiempos en milisegundos reales; el dibujo va LENTO veces más despacio.
export const RPMS = [5400, 7200];
export const LENTO = 300;
export const R_DENTRO = 17, R_FUERA = 44;             // radios de la pista más interior y más exterior (mm)
export const CENTRO = [0, -24], EJE = [30, 46], LARGO_BRAZO = 60;
export const MS_SSD = 0.1;
export const vueltaMs = (rpm) => 60000 / rpm;
/** Tiempo del brazo entre dos pistas: aproximación (corto para pistas vecinas, unos 16 ms para cruzar todo el plato). */
export const brazoMs = (r0, r1) => (r0 === r1 ? 0 : 0.8 + 15.2 * Math.sqrt(Math.abs(r1 - r0) / (R_FUERA - R_DENTRO)));
/** Ángulo del brazo (desde su eje) para que el cabezal quede a radio r del centro del plato. */
export function anguloBrazo(r) {
  const dx = CENTRO[0] - EJE[0], dy = CENTRO[1] - EJE[1], D = Math.hypot(dx, dy);
  return Math.atan2(dy, dx) - Math.acos((LARGO_BRAZO * LARGO_BRAZO + D * D - r * r) / (2 * LARGO_BRAZO * D));
}
export const cabezal = (r) => { const a = anguloBrazo(r); return [EJE[0] + LARGO_BRAZO * Math.cos(a), EJE[1] + LARGO_BRAZO * Math.sin(a)]; };
/** Ángulo, visto desde el centro del plato, en el que está el cabezal cuando lee la pista de radio r. */
export const anguloCabezal = (r) => { const [x, y] = cabezal(r); return Math.atan2(y - CENTRO[1], x - CENTRO[0]); };
const TAU = 2 * Math.PI;
/** Espera hasta que el trozo (que ahora está en el ángulo `trozo`) pasa bajo el cabezal. El plato gira en sentido positivo. */
export const giroMs = (rpm, trozo, r) => ((((anguloCabezal(r) - trozo) % TAU) + TAU) % TAU) / TAU * vueltaMs(rpm);
export function azar(semilla) {
  let s = (semilla >>> 0) || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}
