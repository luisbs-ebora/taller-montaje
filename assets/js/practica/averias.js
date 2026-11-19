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
// La práctica tiene una fase y una zona más que no se ven en el 3D. Van aparte porque FASES y ZONAS
// también las usa la página del examen de los temas 3 y 4, que no debe cambiar.
export const FASES_PRACTICA = { ...FASES, despues: 'Arranca y funciona: el fallo sale después, al comprobar el equipo' };
export const ZONAS_PRACTICA = { ...ZONAS,
  papeles: { nombre: 'Hoja de montaje (configuración de la UEFI)', partes: [], bien: 'Según la hoja de montaje, en la UEFI están: la fecha y la hora bien, el perfil XMP activado, el TPM y el arranque seguro activados, el modo SATA en AHCI y el disco del sistema el primero en el orden de arranque.' },
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
  // --- Arranca, pero algo está mal configurado o mal montado: se descubre en las comprobaciones (Sección 3, apartado 7.2, y Sección 4, apartados 2 y 5) ---
  { id: 'velram', zona: 'papeles', fase: ['despues'], sintoma: 'Arranca y funciona bien. Al hacer las comprobaciones, el Administrador de tareas (Rendimiento → Memoria) marca «Velocidad: 4800 MHz». La etiqueta de los módulos dice DDR5-6000.', ventiladores: true, pantalla: 'Arranca normal', led: null,
    mal: 'En la hoja de montaje, el perfil XMP figura como desactivado: la memoria trabaja a su velocidad básica, no a la de su etiqueta.',
    causa: 'El perfil de memoria (XMP o EXPO) está sin activar en la UEFI', solucion: 'Entrar en la UEFI (Supr o F2), activar el perfil XMP o EXPO y guardar con F10. Después, comprobar otra vez la velocidad.' },
  { id: 'cmos', zona: 'papeles', fase: ['post'], sintoma: 'Ayer funcionaba. Alguien entró en la UEFI y cambió la frecuencia de la memoria. Desde entonces se reinicia una y otra vez sin dar imagen, y no deja entrar en la UEFI.', ventiladores: true, pantalla: 'Sin señal', led: 'DRAM',
    mal: 'En la hoja de montaje alguien ha apuntado: «frecuencia de la memoria puesta a mano en 7200 MHz». La etiqueta de los módulos dice DDR5-6000.',
    causa: 'La memoria está configurada en la UEFI a una frecuencia que no admite', solucion: 'Con el equipo desenchufado, borrar la CMOS con el puente CLR_CMOS de la placa o quitando la pila unos minutos, como indique el manual. La UEFI vuelve a sus valores por defecto y el equipo arranca. Después se activa el perfil XMP, que pone la frecuencia de la etiqueta.' },
  { id: 'canal', zona: 'ram', fase: ['despues'], sintoma: 'Arranca y detecta los 16 GB. Al hacer las comprobaciones, CPU-Z dice que la memoria trabaja en un solo canal (Single).', ventiladores: true, pantalla: 'Arranca normal', led: null,
    mal: 'Los dos módulos están en A1 y A2, uno al lado del otro. El manual de la placa pide A2 y B2.',
    causa: 'Los módulos de memoria no están en las ranuras que indica el manual', solucion: 'Con el equipo desenchufado, cambiar un módulo de ranura para que queden en A2 y B2, y comprobar que CPU-Z marca doble canal (Dual).' },
  { id: 'tpm', zona: 'papeles', fase: ['despues'], sintoma: 'Arranca desde el USB de instalación, pero el instalador de Windows 11 se para con un mensaje y no deja seguir. Según el manual, el procesador y la placa admiten Windows 11.', ventiladores: true, pantalla: 'Este equipo no puede ejecutar Windows 11', led: null,
    mal: 'En la hoja de montaje, el TPM (Intel PTT) figura como desactivado. Windows 11 lo exige.',
    causa: 'El TPM está desactivado en la UEFI', solucion: 'Entrar en la UEFI, activar el TPM (Intel PTT o AMD fTPM), comprobar que el arranque seguro también está activado y guardar con F10.' },
  { id: 'calor', zona: 'disipador', fase: ['despues'], sintoma: 'Arranca y da imagen. Al entrar en la UEFI, la temperatura del procesador pasa de 85 °C en un minuto, sin hacer nada.', ventiladores: true, pantalla: 'Da imagen (UEFI)', led: null,
    mal: 'El disipador se mueve al tocarlo: dos de sus tornillos están sin apretar y la base no asienta sobre el procesador. Su ventilador sí está en CPU_FAN.',
    causa: 'El disipador está mal colocado: no asienta sobre el procesador', solucion: 'Apagar enseguida. Quitar el disipador, limpiar la pasta, poner pasta nueva y volver a montarlo apretando todos sus tornillos.' },
  { id: 'pled', zona: 'fpanel', fase: ['despues'], sintoma: 'Arranca y funciona bien, pero la luz de encendido del frontal de la caja no se enciende nunca.', ventiladores: true, pantalla: 'Arranca normal', led: null,
    mal: 'El conector POWER LED está al revés: el hilo + está en la patilla PLED−. POWER SW sí está en su sitio.',
    causa: 'El cable POWER LED está conectado al revés', solucion: 'Dar la vuelta al conector POWER LED para que el + quede en la patilla PLED+ del dibujo del manual.' },
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

// Reto de clase: con el mismo número, todos reciben los mismos equipos, en el mismo orden y sin repetir avería
export function crearReto(codigo, cuantos = 5) {
  const casos = [], usados = new Set();
  for (let i = 0; casos.length < cuantos && i < 500; i++) {
    const c = crearCaso((codigo * 7919 + i * 104729) % 2147483647 + 1);
    if (!usados.has(c.fallo.id)) { usados.add(c.fallo.id); casos.push(c); }
  }
  return casos;
}

export const TOPE_CRITICO = 4;
// Puntos: fase (1), seguridad antes de abrir (1), revisar la zona del fallo (1), causa (2) → sobre 5, nota sobre 10
export function corregir(caso, { fase, seguridadAntes, revisadas, causa }) {
  const p = {
    fase: caso.fallo.fase.includes(fase) ? 1 : 0,
    seguridad: seguridadAntes ? 1 : 0,
    zona: revisadas.includes(caso.fallo.zona) ? 1 : 0,
    causa: causa === caso.fallo.id ? 2 : 0,
  };
  const total = p.fase + p.seguridad + p.zona + p.causa;
  // Fallos críticos: tocar dentro sin las medidas de seguridad o dejar el equipo sin arreglar. Con cualquiera de los dos, como mucho un 4.
  const criticos = [];
  if (!p.seguridad) criticos.push('Has tocado dentro del equipo sin apagar, desenchufar y ponerte la pulsera.');
  if (!p.causa) criticos.push('El equipo sigue sin arreglar: la causa no era esa.');
  const nota = Math.round(total * 20) / 10;
  return { puntos: p, total, criticos, nota: criticos.length ? Math.min(nota, TOPE_CRITICO) : nota };
}

/** Informe de referencia por campos, para compararlo con el del alumno. */
export function informeReferencia(caso) {
  const f = caso.fallo;
  return { incidencia: f.sintoma + (f.led ? ` LED ${f.led} encendido.` : ''), comprobaciones: f.mal, causa: f.causa + '.', solucion: f.solucion };
}

export function informe(caso) {
  const f = caso.fallo;
  return `Incidencia: ${f.sintoma.split('.')[0].toLowerCase()}${f.led ? `, LED ${f.led} encendido` : ''}${f.pantalla && !/Apagada|Sin señal|normal/.test(f.pantalla) ? `, mensaje «${f.pantalla}»` : ''}. Causa: ${f.causa.charAt(0).toLowerCase() + f.causa.slice(1)}. Solución: ${f.solucion.charAt(0).toLowerCase() + f.solucion.slice(1)}`;
}
