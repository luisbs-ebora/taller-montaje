// Modelo del disipador de torre: cuánto se calienta el procesador según su potencia y si el ventilador gira.
// Las cifras son orientativas (cada procesador y cada disipador tienen las suyas): T = ambiente + potencia × resistencia.
export const T_AMB = 25, T_LIMITE = 95;                 // °C: el aula y la temperatura máxima que hemos puesto al procesador
export const POTENCIAS = [35, 65, 95, 125];             // W de calor (el TDP)
export const R_CON = 0.35, R_SIN = 1.0;                 // °C por vatio, con el ventilador girando y parado
export const TAU = 2.4;                                 // segundos que tarda el dibujo en acercarse a la temperatura nueva
export const resistencia = (fan) => (fan ? R_CON : R_SIN);
/** Temperatura a la que llegaría el procesador si no se protegiera. */
export const objetivo = (w, fan) => T_AMB + w * resistencia(fan);
/** ¿Tiene que bajar su frecuencia para no pasar de la temperatura máxima? */
export const frenado = (w, fan) => objetivo(w, fan) > T_LIMITE;
/** Temperatura en la que se queda. */
export const temperatura = (w, fan) => Math.min(T_LIMITE, objetivo(w, fan));
/** Vatios que da de verdad: si se frena, solo los que el disipador puede sacar a la temperatura máxima. */
export const potenciaReal = (w, fan) => Math.min(w, (T_LIMITE - T_AMB) / resistencia(fan));

// El tubo, en el plano del corte (x a lo ancho, z hacia arriba): una U con el fondo dentro de la base.
export const TUBO = { xi: 14, xd: 66, zb: 31, r: 12, zt: 156, d: 15 };
/** Punto del eje del tubo a una distancia s del centro del fondo, hacia el lado -1 (izquierda) o +1 (derecha), con la normal hacia dentro de la U. */
export function puntoEn(lado, s) {
  const { xi, xd, zb, r } = TUBO, xm = (xi + xd) / 2, xl = lado < 0 ? xi : xd;
  const recto = Math.abs(xl - xm) - r, arco = (Math.PI / 2) * r;
  if (s <= recto) return { x: xm + lado * s, z: zb, nx: 0, nz: 1 };
  if (s <= recto + arco) {
    const a = (s - recto) / r;
    return { x: xm + lado * (recto + r * Math.sin(a)), z: zb + r - r * Math.cos(a), nx: -lado * Math.sin(a), nz: Math.cos(a) };
  }
  return { x: xl, z: zb + r + (s - recto - arco), nx: -lado, nz: 0 };
}
export const largoMitad = () => (TUBO.xd - TUBO.xi) / 2 - TUBO.r + (Math.PI / 2) * TUBO.r + (TUBO.zt - TUBO.zb - TUBO.r);
export function azar(semilla) {
  let s = (semilla >>> 0) || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}
