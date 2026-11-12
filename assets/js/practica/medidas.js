// medidas.js — Práctica «¿Está bien la fuente?» (Tema 4, secciones 2 y 3): medir una fuente ATX con el polímetro.
// Tensiones, márgenes (±5 %) y síntomas: los de la tabla «Síntomas de una fuente que falla» de los apuntes.
// Se genera con semilla: la misma semilla da el mismo caso.

export const LINEAS = {
  '12': { nombre: '+12 V', color: 'Amarillo', min: 11.4, max: 12.6, v: 12.08 },
  '5': { nombre: '+5 V', color: 'Rojo', min: 4.75, max: 5.25, v: 5.02 },
  '33': { nombre: '+3,3 V', color: 'Naranja', min: 3.14, max: 3.47, v: 3.33 },
  sb: { nombre: '+5 V de reposo (5VSB)', color: 'Morado', min: 4.75, max: 5.25, v: 5.04 },
  pg: { nombre: 'PWR_OK', color: 'Gris', min: 4.75, max: 5.25, v: 5.01 },
  on: { nombre: 'PS_ON', color: 'Verde', v: 0.02 },
  m12: { nombre: '−12 V', color: 'Azul', min: -13.2, max: -10.8, v: -11.9 },
};
export const ORDEN = ['12', '5', '33', 'sb', 'pg', 'on', 'm12'];
export const RESPUESTAS_LINEA = [['12', '+12 V (amarillo)'], ['5', '+5 V (rojo)'], ['33', '+3,3 V (naranja)'], ['sb', '5VSB (morado)'], ['pg', 'PWR_OK (gris)'], ['ninguna', 'Ninguna: la fuente da lo que debe']];

const NADA = 'Pulsas el botón y no pasa nada: ni ventiladores ni luces. Está enchufado y con el interruptor de la fuente en I.';
export const CASOS = [
  { id: 'ok', sintoma: 'Se cuelga de vez en cuando, sin un patrón claro. El cliente cree que es la fuente.', fuera: 'ninguna', clave: [['12', true], ['5', null], ['33', null]],
    causa: 'La fuente está bien: todo está dentro de margen, en reposo y con carga',
    solucion: 'La fuente queda descartada. Hay que buscar en otro sitio (memoria, temperatura, disco o sistema) y anotar las medidas en el informe.' },
  { id: '12carga', sintoma: 'Se reinicia cuando juega, pero navegando va bien. Hace poco le pusieron una tarjeta gráfica nueva.', carga: { '12': 11.18 }, fuera: '12', clave: [['12', true]],
    causa: 'El +12 V se cae con carga: la fuente no tiene potencia suficiente o está envejecida',
    solucion: 'Cambiar la fuente por una con la potencia que recomienda la gráfica y repetir la medida con carga.' },
  { id: '12bajo', sintoma: 'Se apaga solo a ratos, incluso sin hacer nada exigente. El ventilador de la fuente hace ruido.', reposo: { '12': 11.22 }, carga: { '12': 10.94 }, fuera: '12', clave: [['12', null]],
    causa: 'El +12 V está siempre por debajo de 11,40 V: la fuente falla',
    solucion: 'Cambiar la fuente. Una fuente no se abre ni se repara.' },
  { id: '5alto', sintoma: 'Los dispositivos USB se desconectan solos y un disco ha dejado de reconocerse.', reposo: { '5': 5.46 }, carga: { '5': 5.43 }, fuera: '5', clave: [['5', null]],
    causa: 'El +5 V está por encima de 5,25 V: la fuente no regula bien',
    solucion: 'Cambiar la fuente antes de que la sobretensión dañe los discos o los USB.' },
  { id: '33bajo', sintoma: 'Da pantallazos y errores de memoria al azar. Los módulos de RAM se han probado en otro equipo y están bien.', reposo: { '33': 3.02 }, carga: { '33': 2.97 }, fuera: '33', clave: [['33', null]],
    causa: 'El +3,3 V está por debajo de 3,14 V: la fuente falla',
    solucion: 'Cambiar la fuente: la memoria y el chipset se alimentan de esa línea.' },
  { id: 'muerta', sintoma: NADA, apagado: true, reposo: { '12': 0, '5': 0, '33': 0, sb: 0, pg: 0, on: 0, m12: 0 }, fuera: 'sb', clave: [['sb', null]],
    causa: 'No hay 5 V de reposo (5VSB): la fuente está muerta',
    solucion: 'Comprobar el cable de corriente y el enchufe (el enchufe, el profesor). Si están bien, cambiar la fuente.' },
  { id: 'boton', sintoma: NADA, apagado: true, reposo: { '12': 0, '5': 0, '33': 0, pg: 0, on: 4.98, m12: 0 }, fuera: 'ninguna', clave: [['sb', null], ['on', null]],
    causa: 'Hay 5VSB y el verde (PS_ON) sigue en unos 5 V: la fuente espera la orden de encender. Falla el botón o el cable POWER SW',
    solucion: 'Revisar que POWER SW esté en las patillas PWR de F_PANEL (Tema 3). Con el equipo apagado es normal que 12, 5 y 3,3 V estén a cero.' },
  { id: 'pg', sintoma: 'Se enciende, los ventiladores giran unos segundos y se apaga solo. Mides justo en esos segundos.', reposo: { pg: 1.24 }, sinCarga: true, fuera: 'pg', clave: [['pg', null]],
    causa: 'PWR_OK no llega a unos 5 V: la fuente no se estabiliza o hay un cortocircuito en el equipo',
    solucion: 'Probar la fuente suelta con el comprobador. Si ahí va bien, buscar el cortocircuito en el equipo (un separador de más, un tornillo suelto).' },
];

const EQUIPOS = ['PC de recepción', 'Equipo del aula 4', 'PC de la secretaría', 'Equipo de diseño', 'PC del almacén', 'Equipo del profesor', 'PC de la biblioteca', 'PC de un cliente'];
function azar(semilla) { let a = semilla >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const barajar = (l, r) => { l = l.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
const redondear = v => Math.round(v * 100) / 100;

export function crearCaso(semilla, { excluir } = {}) {
  const r = azar(semilla);
  const posibles = CASOS.filter(c => c.id !== excluir);
  const def = posibles[Math.floor(r() * posibles.length)];
  // Valores de este equipo: los normales con una pequeña variación, y encima los del fallo
  const reposo = {}, carga = {};
  for (const id of ORDEN) {
    const d = (r() - 0.5) * 0.06;
    reposo[id] = redondear(LINEAS[id].v + (id === 'on' ? 0 : d));
    carga[id] = redondear(reposo[id] - (id === '12' ? 0.09 : id === '5' || id === '33' ? 0.03 : 0));
  }
  Object.assign(reposo, def.reposo || {}); Object.assign(carga, def.reposo || {}, def.carga || {});
  const otras = barajar(CASOS.filter(c => c !== def && c.causa !== def.causa), r).slice(0, 4);
  const causas = barajar([def, ...otras], r).map(c => ({ id: c.id, texto: c.causa }));
  return { semilla, equipo: EQUIPOS[Math.floor(r() * EQUIPOS.length)], def, reposo, carga, causas, conCarga: !def.apagado && !def.sinCarga };
}

/** Posiciones del selector que se ofrecen según el tipo de polímetro. */
export const SELECTORES = {
  manual: [['v2', 'V continua · 2'], ['v20', 'V continua · 20'], ['v200', 'V continua · 200'], ['vca', 'V alterna · 600'], ['ohm', 'Ω (resistencia)'], ['a10', 'A (intensidad)']],
  auto: [['vcc', 'V continua'], ['vca', 'V alterna'], ['ohm', 'Ω (resistencia)'], ['a10', 'A (intensidad)']],
};
export const configCorrecta = (tipo, cfg) => cfg.roja === 'v' && cfg.sel === (tipo === 'auto' ? 'vcc' : 'v20');

/** Lo que pasa al tocar un cable con esa configuración: { texto, unidad, cc, evento, valor } */
export function medir(caso, tipo, cfg, id, conCarga) {
  const real = (conCarga ? caso.carga : caso.reposo)[id];
  const hayTension = Math.abs(real) > 0.5;
  if (cfg.roja !== 'v') {
    // roja en un borne de intensidad: el polímetro es casi un cable
    if (hayTension) return { evento: 'corto', texto: '0.00', unidad: 'V', cc: true };
    return { evento: 'borne', texto: '0.00', unidad: cfg.sel === 'a10' ? 'A' : 'V', cc: true };
  }
  if (cfg.sel === 'ohm') return { evento: 'ohm', texto: hayTension ? '1   .' : '0.00', unidad: 'Ω', cc: null };
  if (cfg.sel === 'a10') return { evento: 'amp', texto: '0.00', unidad: 'A', cc: true };
  if (cfg.sel === 'vca') return { evento: 'vca', texto: '0.0', unidad: 'V', cc: false };
  if (cfg.sel === 'v2' && Math.abs(real) >= 2) return { evento: 'fuera', texto: '1   .', unidad: 'V', cc: true };
  const dec = cfg.sel === 'v200' ? 1 : cfg.sel === 'v2' ? 3 : 2;
  return { evento: null, valor: real, texto: real.toFixed(dec), unidad: 'V', cc: true, pocaPrecision: cfg.sel === 'v200' };
}
export const AVISOS = {
  corto: '¡Cortocircuito! Con la punta roja en un borne de intensidad el polímetro es casi un cable: has unido esa tensión con masa. Salta el fusible del polímetro y la fuente se protege. La roja va en VΩ.',
  borne: 'La punta roja está en un borne de intensidad. Aquí no ha pasado nada porque ese cable no tiene tensión, pero en uno con tensión habrías hecho un cortocircuito. La roja va en VΩ.',
  ohm: 'Resistencia y continuidad se miden siempre SIN tensión. Con el equipo encendido esa posición no vale (y puedes dañar el polímetro). Pon tensión continua.',
  amp: 'En la posición de intensidad no se mide una tensión. Además, la intensidad se mide en serie, abriendo el circuito. Pon tensión continua.',
  vca: 'Estás en tensión alterna y dentro del ordenador todo es continua: el valor no tiene sentido. Pon tensión continua (la V con la raya recta).',
  fuera: 'Un «1» a la izquierda: el valor no cabe en el rango de 2 V. Sube al rango inmediatamente superior al valor que esperas.',
};

export const enMargen = (id, v) => LINEAS[id].min === undefined || (v >= LINEAS[id].min && v <= LINEAS[id].max);

// Puntos: preparación a la primera (1), medir lo que hacía falta (1), línea que falla (1), diagnóstico (2) → sobre 5, nota sobre 10
export function corregir(caso, { preparacion, medidas, linea, causa }) {
  const hecha = ([id, conCarga]) => medidas.some(m => m.id === id && (conCarga === null || !caso.conCarga || m.carga === conCarga));
  const p = {
    preparacion: preparacion ? 1 : 0,
    medidas: caso.def.clave.every(hecha) ? 1 : 0,
    linea: linea === caso.def.fuera ? 1 : 0,
    causa: causa === caso.def.id ? 2 : 0,
  };
  const total = p.preparacion + p.medidas + p.linea + p.causa;
  return { puntos: p, total, nota: Math.round(total * 20) / 10 };
}
