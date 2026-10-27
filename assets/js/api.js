// api.js — Comunicación con el Apps Script. La página no corrige nada: solo envía y muestra.
import { URL_SCRIPT } from './config.js';

export function scriptConfigurado() { return /^https:\/\/script\.google(usercontent)?\.com\//.test(URL_SCRIPT) || URL_SCRIPT.startsWith('/'); }

export async function llamar(accion, datos = {}) {
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
