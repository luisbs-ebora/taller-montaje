// evaluacion.js — Lista de prácticas y exámenes de la web.
// Cada examen tiene SU PROPIA hoja de Google y su propio Apps Script: así las notas de un examen
// nunca se mezclan con las de otro (el de los Temas 1 y 2 se queda tal cual para enseñarlo si hace falta).
import * as CFG from './config.js';

export const PRACTICAS = [
  { id: 't1-montaje', temas: 'Temas 1 y 2', titulo: 'Monta un PC por piezas', ruta: '#/tema1/practica',
    texto: 'Te llega un cliente con un encargo. Elige piezas compatibles que cumplan lo que pide y ordena el montaje con todas las medidas de seguridad.' },
  { id: 't3-averia', temas: 'Tema 3', titulo: 'Este PC no arranca', ruta: '#/tema3/practica',
    texto: 'Un equipo recién montado que no funciona. Mira el síntoma y los LED de la placa, inspecciónalo en 3D y encuentra qué está mal montado.' },
];

export const EXAMENES = [
  { id: 't1t2', temas: 'Temas 1 y 2', titulo: 'Examen Temas 1 y 2', subtitulo: 'Elegir las piezas de un PC para un cliente', ruta: '#/tema1/examen' },
];

// Configuración de cada examen. El de los Temas 1 y 2 sigue usando EXAMEN_ACTIVO y URL_SCRIPT de config.js;
// los nuevos se añaden en config.js con  export const EXAMENES = { t3: { activo: true, url: '…/exec' } }
export function configExamen(id) {
  const nuevo = CFG.EXAMENES && CFG.EXAMENES[id];
  if (nuevo) return { activo: !!nuevo.activo, url: nuevo.url || '' };
  if (id === 't1t2') return { activo: !!CFG.EXAMEN_ACTIVO, url: CFG.URL_SCRIPT || '' };
  return { activo: false, url: '' };
}
export const examen = id => EXAMENES.find(e => e.id === id);
