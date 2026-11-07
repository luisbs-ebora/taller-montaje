// averias.js — Práctica «Este PC no arranca» (Tema 3, sesión 4): un equipo recién montado con un fallo.
// Síntomas, causas y soluciones sacados de la tabla «Si no arranca: buscar la causa por el síntoma»
// y de los LED de diagnóstico de los apuntes. Se genera con semilla: la misma semilla da el mismo caso.

export const FASES = {
  fuente: 'Al pulsar el botón: la fuente no arranca',
  post: 'En el POST: la comprobación de las piezas',
  arranque: 'Buscando con qué arrancar',
  reposo: 'Con el equipo apagado (reposo)',
};

// Zonas que se pueden revisar en el 3D, con las partes (userData.parte) que las forman
export const ZONAS = {
  fpanel: { nombre: 'Panel frontal (F_PANEL)', partes: ['fpanel'], bien: 'POWER SW está en las patillas PWR de F_PANEL y los LED, en las suyas.' },
  fuente: { nombre: 'Fuente e interruptor trasero', partes: ['interruptor', 'carcasa', 'hueco-fuente'], bien: 'La fuente está bien atornillada. El interruptor trasero estaba en I (ahora lo has puesto en 0 para trabajar).' },
  atx24: { nombre: 'Cable de 24 pines', partes: ['atx24'], bien: 'El cable de 24 pines entra hasta el fondo y su pestaña ha hecho clic.' },
  eps: { nombre: 'Cable EPS del procesador', partes: ['eps', 'vrm'], bien: 'El cable EPS (ATX12V) de 8 pines está conectado hasta el clic.' },
  ram: { nombre: 'Memoria RAM', partes: ['dimm', 'chips', 'contactos', 'muesca'], bien: 'Los dos módulos están en A2 y B2, con las pestañas cerradas.' },
  gpu: { nombre: 'Tarjeta gráfica y sus cables', partes: ['alimentacion', 'conector', 'ventiladores', 'pcie16'], bien: 'La gráfica está bien insertada, atornillada y con sus cables PCIe conectados.', sinGpu: 'Este equipo no lleva gráfica dedicada: usa la del procesador.' },
  video: { nombre: 'Cable del monitor', partes: ['io', 'salidas'], bien: 'El monitor está conectado a la salida correcta y encendido.' },
  disipador: { nombre: 'Disipador y ventiladores', partes: ['base', 'heatpipes', 'aletas', 'cpufan', 'ventilador'], bien: 'El disipador está firme, sin el plástico de la base, y su ventilador va a CPU_FAN.' },
  separadores: { nombre: 'Debajo de la placa (separadores)', partes: ['pcb', 'bandeja'], bien: 'Hay un separador debajo de cada agujero de la placa y ninguno más. No hay tornillos sueltos.' },
  disco: { nombre: 'Disco y cables SATA', partes: ['sata', 'ssd25', 'm2'], bien: 'El disco tiene conectados su cable SATA de datos y el de alimentación.' },
  pila: { nombre: 'Pila de la placa', partes: ['pila', 'bios'], bien: 'La pila CR2032 marca unos 3 V: está bien.' },
  cpu: { nombre: 'Procesador', partes: ['socket', 'sustrato', 'ihs', 'triangulo'], bien: 'El procesador está bien asentado y la palanca del zócalo, cerrada.' },
};
export function zonaDeParte(parte) {
  for (const [id, z] of Object.entries(ZONAS)) if (z.partes.includes(parte)) return id;
  return null;
}

const NADA = 'Pulsas el botón de encendido y no pasa nada: ni ventiladores ni luces.';
const SIN_IMAGEN = 'Los ventiladores giran, pero el monitor no muestra nada.';
export const FALLOS = [
  { id: 'powersw', zona: 'fpanel', fase: ['fuente'], sintoma: NADA, ventiladores: false, pantalla: 'Apagada', led: null,
    mal: 'El cable POWER SW está suelto, colgando al lado de F_PANEL.',
    causa: 'El cable POWER SW no está conectado en F_PANEL', solucion: 'Conectar POWER SW en las patillas PWR de F_PANEL, mirando el dibujo del manual.' },
  { id: 'interruptor', zona: 'fuente', fase: ['fuente'], sintoma: NADA, ventiladores: false, pantalla: 'Apagada', led: null,
    mal: 'Antes de tocar nada lo has mirado: el interruptor trasero de la fuente ya estaba en 0.',
    causa: 'El interruptor trasero de la fuente está en 0', solucion: 'Cuando todo esté revisado y conectado, poner el interruptor de la fuente en I.' },
  { id: 'atx24', zona: 'atx24', fase: ['fuente'], sintoma: NADA, ventiladores: false, pantalla: 'Apagada', led: null,
    mal: 'El conector de 24 pines está medio metido: la pestaña no ha hecho clic.',
    causa: 'El cable de 24 pines no está conectado hasta el clic', solucion: 'Presionar el conector de 24 pines hasta que la pestaña haga clic.' },
  { id: 'ram', zona: 'ram', fase: ['post'], sintoma: SIN_IMAGEN + ' Has esperado tres minutos por si era el ajuste de memoria y sigue igual.', ventiladores: true, pantalla: 'Sin señal', led: 'DRAM',
    mal: 'El módulo de la ranura B2 tiene una pestaña sin cerrar: no está insertado hasta el fondo.',
    causa: 'Un módulo de memoria está mal insertado', solucion: 'Presionar el módulo con los dos pulgares hasta que se cierren las dos pestañas (clic).' },
  { id: 'eps', zona: 'eps', fase: ['post'], sintoma: SIN_IMAGEN, ventiladores: true, pantalla: 'Sin señal', led: 'CPU',
    mal: 'El cable EPS (ATX12V) del procesador no está conectado: está recogido detrás de la bandeja.',
    causa: 'Falta conectar el cable EPS del procesador', solucion: 'Conectar el cable EPS de 8 pines (4+4) en ATX12V, arriba a la izquierda de la placa, hasta el clic.' },
  { id: 'gpu', zona: 'gpu', fase: ['post'], gpu: true, sintoma: SIN_IMAGEN, ventiladores: true, pantalla: 'Sin señal', led: 'VGA',
    mal: 'La gráfica no tiene conectados sus cables PCIe de alimentación.',
    causa: 'La gráfica no tiene conectados sus cables de alimentación', solucion: 'Conectar a la gráfica todos sus cables PCIe de la fuente, hasta el fondo.' },
  { id: 'monitor', zona: 'video', fase: ['post'], gpu: true, sintoma: SIN_IMAGEN + ' La placa no deja encendido ningún LED de error.', ventiladores: true, pantalla: '«Sin señal»', led: null,
    mal: 'El monitor está conectado al vídeo de la placa base, no a la tarjeta gráfica.',
    causa: 'El monitor está conectado a la placa en vez de a la gráfica', solucion: 'Conectar el monitor a una salida de vídeo de la tarjeta gráfica.' },
  { id: 'cpufan', zona: 'disipador', fase: ['post'], sintoma: 'Arranca y da imagen, pero se para con un mensaje en la pantalla.', ventiladores: true, pantalla: 'CPU Fan Error! Press F1 to Run SETUP', led: null,
    mal: 'El cable del ventilador del disipador está en CHA_FAN, no en CPU_FAN.',
    causa: 'El ventilador del disipador no está conectado a CPU_FAN', solucion: 'Pasar el cable del ventilador del disipador al cabezal CPU_FAN.' },
  { id: 'separador', zona: 'separadores', fase: ['fuente', 'post'], sintoma: 'Se enciende un segundo y se apaga solo. Si vuelves a pulsar, pasa lo mismo.', ventiladores: false, pantalla: 'Apagada', led: null,
    mal: 'Hay un separador de más debajo de la placa, en un sitio donde la placa no tiene agujero: toca su circuito.',
    causa: 'Un separador de más provoca un cortocircuito', solucion: 'Sacar la placa, quitar el separador que sobra y volver a montarla.' },
  { id: 'disco', zona: 'disco', fase: ['arranque'], sintoma: 'Da imagen y pasa el POST, pero se para con un mensaje. El sistema operativo ya estaba instalado en ese disco.', ventiladores: true, pantalla: 'Reboot and select proper boot device', led: 'BOOT',
    mal: 'El cable SATA de datos del disco está suelto.',
    causa: 'El disco no está conectado (cable SATA de datos suelto)', solucion: 'Conectar el cable SATA de datos del disco a un puerto SATA de la placa.' },
  { id: 'pila', zona: 'pila', fase: ['reposo'], sintoma: 'Funciona bien, pero cada vez que se desenchufa por la noche, al día siguiente la fecha y la hora han vuelto a 2020.', ventiladores: true, pantalla: 'Arranca normal (con la fecha mal)', led: null,
    mal: 'La pila CR2032 marca 2,1 V: está agotada (nueva tiene unos 3 V).',
    causa: 'La pila de la placa (CR2032) está agotada', solucion: 'Cambiar la pila CR2032 con el equipo desenchufado y volver a poner la fecha y la hora en la UEFI.' },
];

const EQUIPOS = ['PC de recepción', 'Equipo del aula 4', 'PC de la secretaría', 'Equipo de diseño', 'PC del almacén', 'Equipo del profesor', 'PC de la biblioteca', 'Equipo de la sala de reuniones'];

function azar(semilla) { let a = semilla >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const barajar = (lista, r) => { const l = lista.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };

export function crearCaso(semilla, { excluir } = {}) {
  const r = azar(semilla);
  const posibles = FALLOS.filter(f => f.id !== excluir);
  const fallo = posibles[Math.floor(r() * posibles.length)];
  const conGpu = fallo.gpu ? true : r() < 0.6;
  // Causas para elegir: la buena, las del mismo síntoma y otras al azar hasta 5
  const mismas = FALLOS.filter(f => f !== fallo && f.sintoma === fallo.sintoma && (!f.gpu || conGpu));
  const otras = barajar(FALLOS.filter(f => f !== fallo && !mismas.includes(f) && (!f.gpu || conGpu)), r);
  const causas = barajar([fallo, ...mismas, ...otras].slice(0, 5), r).map(f => ({ id: f.id, texto: f.causa }));
  return { semilla, equipo: EQUIPOS[Math.floor(r() * EQUIPOS.length)], conGpu, fallo, causas };
}

// Puntos: fase (1), seguridad antes de abrir (1), revisar la zona del fallo (1), causa (2) → sobre 5, nota sobre 10
export function corregir(caso, { fase, seguridadAntes, revisadas, causa }) {
  const p = {
    fase: caso.fallo.fase.includes(fase) ? 1 : 0,
    seguridad: seguridadAntes ? 1 : 0,
    zona: revisadas.includes(caso.fallo.zona) ? 1 : 0,
    causa: causa === caso.fallo.id ? 2 : 0,
  };
  const total = p.fase + p.seguridad + p.zona + p.causa;
  return { puntos: p, total, nota: Math.round(total * 20) / 10 };
}

export function informe(caso) {
  const f = caso.fallo;
  return `Incidencia: ${f.sintoma.split('.')[0].toLowerCase()}${f.led ? `, LED ${f.led} encendido` : ''}${f.pantalla && !/Apagada|Sin señal|normal/.test(f.pantalla) ? `, mensaje «${f.pantalla}»` : ''}. Causa: ${f.causa.charAt(0).toLowerCase() + f.causa.slice(1)}. Solución: ${f.solucion.charAt(0).toLowerCase() + f.solucion.slice(1)}`;
}
