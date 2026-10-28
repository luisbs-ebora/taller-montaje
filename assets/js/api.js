// api.js — Práctica: se genera y corrige en el navegador (no cuenta para nota).
//          Examen: lo genera y corrige el Apps Script (la página solo envía y muestra).
import { URL_SCRIPT } from './config.js';
import { cargarJSON, BASE_CONTENIDO } from './util.js';

export function scriptConfigurado() { return /^https:\/\/script\.google(usercontent)?\.com\//.test(URL_SCRIPT) || URL_SCRIPT.startsWith('/'); }

// ---------- Práctica local ----------
let motorListo = null;
function cargarScript(src) {
  return new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => ko(new Error('No se pudo cargar el corrector de la práctica.'));
    document.head.append(s);
  });
}
async function motor() {
  if (!motorListo) motorListo = cargarScript('assets/js/practica/Motor.js').then(() => cargarScript('assets/js/practica/Ejercicios.js'))
    .catch(e => { motorListo = null; throw e; });
  await motorListo;
  return { Motor: window.Motor, EJ: window.EJERCICIOS };
}
// El caso se identifica por su semilla: con la misma semilla se vuelve a generar idéntico para corregirlo.
async function casoDesdeId(casoId) {
  const m = /^L-([\w-]+)-(\d+)$/.exec(String(casoId || ''));
  if (!m) throw new Error('Este caso de práctica no es válido. Empieza otro.');
  const { Motor, EJ } = await motor();
  const def = EJ[m[1]];
  if (!def) throw new Error('Ejercicio desconocido.');
  const cat = await cargarJSON(BASE_CONTENIDO + def.catalogo);
  return { Motor, def, caso: Motor.crearCaso(def, cat, Number(m[2])) };
}
async function practicaLocal(accion, datos) {
  if (accion === 'practica-empezar') {
    const seed = Math.floor(Math.random() * 2147483647);
    const { Motor, caso } = await casoDesdeId(`L-${datos.ejercicio}-${seed}`);
    return { ok: true, casoId: `L-${datos.ejercicio}-${seed}`, caso: Motor.casoPublico(caso) };
  }
  const { Motor, def, caso } = await casoDesdeId(datos.casoId);
  return { ok: true, resultado: Motor.corregir(def, caso, datos.respuesta), solucionEjemplo: caso.solucionEjemplo };
}

// ---------- Llamada única ----------
export async function llamar(accion, datos = {}) {
  if (accion.startsWith('practica-')) return practicaLocal(accion, datos);
  if (!scriptConfigurado()) throw new Error('La web aún no está conectada con la hoja de notas. Avisa al profesor.');
  let r;
  try {
    // text/plain evita la petición previa CORS que Apps Script no admite
    r = await fetch(URL_SCRIPT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ accion, ...datos }), redirect: 'follow' });
  } catch (e) {
    throw new Error('No hay conexión con el servidor. Comprueba Internet y vuelve a intentarlo.');
  }
  let j;
  try { j = await r.json(); } catch (e) { throw new Error('Respuesta inesperada del servidor.'); }
  if (!j.ok) throw new Error(j.error || 'Error desconocido.');
  return j;
}
