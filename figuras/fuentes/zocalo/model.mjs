// Modelo del montaje de un procesador en un zócalo LGA: qué hace cada pieza en cada momento.
// Medidas en unidades del dibujo (no son las de un zócalo real). ZP es la cara de arriba de la placa base.
export const ZP = 12.5;
export const Z_SUELO = ZP + 2, Z_PARED = ZP + 4, Z_PLACA = ZP + 4.4, Z_PALANCA = ZP + 4.6;
export const Z_ASIENTO = ZP + 2.4, Z_SALIENTE = ZP + 3.8;   // dónde queda la base del procesador bien puesto y girado
export const Z_ALTO = ZP + 28, Z_BANDEJA = 3;
export const BANDEJA = [-92, 6], TAPA_FIN = [4, 97];
export const MEDIO = 22.5;                                  // medio lado del procesador
export const MUESCA_Y = 9;                                  // las muescas no están en el centro: girado media vuelta tampoco entra
export const PLACA_ABIERTA = 105, PALANCA_ABIERTA = 150, LARGO_PALANCA = 60;

const paso = (id, dura, texto) => ({ id, dura, texto });
export const FASES = {
  bien: [
    paso("inicio", 1.2, "Zócalo cerrado, con su tapa de plástico"),
    paso("palanca", 1.7, "1 · Saca la palanca del gancho y levántala"),
    paso("placa", 1.3, "2 · Levanta la placa de retención"),
    paso("coge", 2.0, "3 · Coge el procesador por los bordes"),
    paso("alinea", 2.2, "4 · Triángulo con triángulo, muescas con salientes"),
    paso("baja", 1.3, "4 · Déjalo caer en vertical, sin arrastrarlo"),
    paso("cierra-placa", 1.2, "5 · Baja la placa de retención"),
    paso("cierra-palanca", 1.8, "5 · Baja la palanca: la tapa salta sola"),
    paso("hecho", Infinity, "Montado. Guarda la tapa de plástico"),
  ],
  girado: [
    paso("inicio", 1.2, "Zócalo cerrado, con su tapa de plástico"),
    paso("palanca", 1.7, "1 · Saca la palanca del gancho y levántala"),
    paso("placa", 1.3, "2 · Levanta la placa de retención"),
    paso("coge", 2.0, "3 · Coge el procesador por los bordes"),
    paso("alinea", 2.4, "El triángulo no coincide y las muescas tampoco"),
    paso("baja", 1.3, "Se queda apoyado: no llega al fondo"),
    paso("mal", Infinity, "No lo fuerces: sácalo y gíralo"),
  ],
};
export const duracion = (caso) => FASES[caso].reduce((s, f) => s + (Number.isFinite(f.dura) ? f.dura : 0), 0);
const suave = (u) => u * u * (3 - 2 * u);
const tramo = (u, a, b) => suave(Math.min(1, Math.max(0, (u - a) / (b - a))));

/** Fase en el instante t (segundos) y cuánto lleva hecho de ella (0 a 1). */
export function faseEn(t, caso) {
  let inicio = 0;
  const lista = FASES[caso];
  for (let i = 0; i < lista.length; i++) {
    const f = lista[i];
    if (t < inicio + f.dura || i === lista.length - 1) return { i, id: f.id, texto: f.texto, u: Number.isFinite(f.dura) ? Math.min(1, Math.max(0, (t - inicio) / f.dura)) : 1 };
    inicio += f.dura;
  }
}
/** Postura de todas las piezas en el instante t. Ángulos en grados. */
export function poseEn(t, caso) {
  const f = faseEn(t, caso), lista = FASES[caso];
  // avance de una fase: 0 si aún no ha llegado, 1 si ya pasó (o no existe en este caso)
  const av = (id) => { const i = lista.findIndex((x) => x.id === id); return i < 0 ? 0 : f.i < i ? 0 : f.i > i ? 1 : f.u; };
  const abre = av("palanca"), cierra = av("cierra-palanca");
  const palanca = { fuera: tramo(abre, 0, 0.3) * (1 - tramo(cierra, 0.7, 1)), ang: PALANCA_ABIERTA * tramo(abre, 0.3, 1) * (1 - tramo(cierra, 0, 0.7)) };
  const a = suave(av("placa")), c = suave(av("cierra-placa"));
  const placa = a * ((1 - c) * PLACA_ABIERTA + c * 5 * (1 - tramo(cierra, 0.35, 0.6)));
  const g = av("coge"), sube = tramo(g, 0, 0.3), viaje = tramo(g, 0.25, 1), b = suave(av("baja"));
  const fin = caso === "girado" ? Z_SALIENTE : Z_ASIENTO;
  const cpu = {
    x: BANDEJA[0] * (1 - viaje), y: BANDEJA[1] * (1 - viaje),
    z: Z_BANDEJA + (Z_ALTO - Z_BANDEJA) * sube - (Z_ALTO - fin) * b,
    giro: caso === "girado" ? 90 * tramo(g, 0.4, 0.9) : 0,
  };
  const marcas = f.id === "alinea" || f.id === "baja" || f.id === "mal" ? (caso === "girado" ? "mal" : "ok") : null;
  return { fase: f.id, paso: f.i, texto: f.texto, palanca, placa, cpu, tapa: caso === "bien" ? tramo(cierra, 0.6, 1) : 0, marcas, tiembla: f.id === "mal" };
}
/** Gira un punto del procesador (en sus propias coordenadas) y lo coloca en el mundo. */
export function enMundo([x, y], cpu) {
  const r = (cpu.giro * Math.PI) / 180, co = Math.cos(r), si = Math.sin(r);
  return [cpu.x + x * co - y * si, cpu.y + x * si + y * co];
}
