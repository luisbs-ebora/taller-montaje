// util.js — utilidades comunes (DOM, texto, carga de datos, progreso).

/** Crea un elemento: h('div.clase#id', {atributos}, hijos...) */
export function h(sel, attrs = {}, ...hijos) {
  const [, tag = 'div', resto = ''] = sel.match(/^([a-z0-9]+)?(.*)$/i);
  const el = document.createElement(tag || 'div');
  (resto.match(/[.#][^.#]+/g) || []).forEach(t => t[0] === '.' ? el.classList.add(t.slice(1)) : (el.id = t.slice(1)));
  if (attrs && (attrs.nodeType || typeof attrs !== 'object' || Array.isArray(attrs))) { hijos.unshift(attrs); attrs = {}; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  hijos.flat(Infinity).forEach(c => { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return el;
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s).replace(/[&<>"']/g, c => ESC[c]);

/** Markdown mínimo y seguro: **negrita**, *cursiva*, `código`. */
export function md(texto) {
  return esc(texto)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

const cache = new Map();
export async function cargarJSON(ruta) {
  if (!cache.has(ruta)) {
    cache.set(ruta, fetch(ruta, { cache: 'no-cache' }).then(r => {
      if (!r.ok) throw new Error(`No se pudo cargar ${ruta} (${r.status})`);
      return r.json();
    }).catch(e => { cache.delete(ruta); throw e; }));
  }
  return cache.get(ruta);
}

export const BASE_CONTENIDO = 'content/';
export async function curso() { return cargarJSON(BASE_CONTENIDO + 'curso.json'); }
export async function tema(id) {
  const c = await curso();
  const t = c.temas.find(x => x.id === id);
  if (!t) throw new Error('Tema no encontrado: ' + id);
  const datos = await cargarJSON(BASE_CONTENIDO + t.ruta);
  return { ...datos, base: BASE_CONTENIDO + t.ruta.replace(/[^/]+$/, '') };
}

// ---------- Progreso (solo en este navegador) ----------
const CLAVE = 'taller-montaje:v1';
function leer() { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; } }
function guardar(p) { try { localStorage.setItem(CLAVE, JSON.stringify(p)); } catch (e) { /* almacenamiento no disponible */ } }
export const progreso = {
  leccion(temaId, lecId) { return (leer().lecciones || {})[temaId + '/' + lecId] || {}; },
  marcar(temaId, lecId, cambios) {
    const p = leer(); p.lecciones = p.lecciones || {};
    const k = temaId + '/' + lecId;
    p.lecciones[k] = { ...(p.lecciones[k] || {}), ...cambios, fecha: Date.now() };
    guardar(p);
  },
  completadas(temaId, lecciones) { return lecciones.filter(l => this.leccion(temaId, l.id).completa).length; },
  practicas() { return leer().practicas || []; },
  anotarPractica(r) { const p = leer(); p.practicas = (p.practicas || []).concat([{ ...r, fecha: Date.now() }]).slice(-20); guardar(p); },
  get(clave) { return leer()[clave]; },
  set(clave, valor) { const p = leer(); if (valor === undefined) delete p[clave]; else p[clave] = valor; guardar(p); }
};
