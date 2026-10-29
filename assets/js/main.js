// main.js — Enrutador de la web (rutas con #/…). Cada vista devuelve { el, destruir }.
import { h, cargarJSON, BASE_CONTENIDO } from './util.js';
import { vistaInicio, vistaTema, vistaLecciones } from './vistas/inicio.js';
import { vistaLeccion } from './vistas/leccion.js';
import { vistaPiezas } from './vistas/piezas.js';
import { vistaEjercicio } from './vistas/ejercicio.js';
import { vistaAnimado } from './vistas/animado.js';

const main = document.getElementById('contenido');
let actual = null;

async function vistaCreditos() {
  const modelos = await cargarJSON(BASE_CONTENIDO + 'modelos.json').catch(() => ({}));
  const vistos = new Set();
  const lista = Object.entries(modelos).filter(([k]) => !k.startsWith('_')).flatMap(([, m]) => [].concat(m))
    .filter(m => !vistos.has(m.archivo) && vistos.add(m.archivo)).map(m => h('li', h('b', m.titulo), ' — ', m.credito || ''));
  return { el: h('section.contenido', { style: 'max-width:72ch' },
    h('h1', 'Créditos y licencias'),
    h('p', 'Contenido: apuntes del módulo Montaje y mantenimiento de equipos (1.º SMR).'),
    h('p', 'Visor 3D: ', h('a', { href: 'https://threejs.org', rel: 'noopener' }, 'three.js'), ' (licencia MIT). Los esquemas interactivos de las piezas se dibujan por código y no reproducen ningún producto real.'),
    h('p', 'Las marcas y modelos del catálogo (Tajo, Corvus, Alberche, Jarama, Mesa, Viento, Río…) son ficticios. Sus características son realistas y siguen los estándares del tema (sockets AM4, AM5 y LGA1700; DDR4 y DDR5; formatos ATX, MicroATX y Mini-ITX).'),
    h('h2', 'Modelos 3D de terceros'),
    lista.length ? h('ul.creditos', lista) : h('p', 'Ninguno por ahora.')) };
}

const RUTAS = [
  [/^$/, () => vistaInicio()],
  [/^creditos$/, () => vistaCreditos()],
  [/^lecciones$/, () => vistaLecciones()],
  [/^([\w-]+)$/, m => vistaTema(m[1])],
  [/^([\w-]+)\/leccion\/([\w-]+)$/, m => vistaLeccion(m[1], m[2])],
  [/^([\w-]+)\/piezas$/, m => vistaPiezas(m[1])],
  [/^([\w-]+)\/animado$/, m => vistaAnimado(m[1])],
  [/^([\w-]+)\/(practica|examen)$/, m => vistaEjercicio(m[1], m[2])]
];

let turno = 0;
async function navegar() {
  const mio = ++turno;
  const ruta = decodeURIComponent(location.hash.replace(/^#\/?/, '')).replace(/\/$/, '');
  if (actual && actual.destruir) { try { actual.destruir(); } catch (e) { console.error(e); } }
  actual = null;
  main.replaceChildren(h('div.cargando', 'Cargando…'));
  const seccion = ruta === '' ? 'inicio' : ruta === 'creditos' ? 'creditos' : ruta.includes('/leccion/') || /^[\w-]+$/.test(ruta) ? 'tema' : ruta.split('/').pop();
  document.querySelectorAll('.menu a').forEach(a => {
    if (a.dataset.ruta === seccion) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  try {
    const r = RUTAS.find(([re]) => re.test(ruta));
    if (!r) throw new Error('Esta página no existe.');
    const vista = await r[1](ruta.match(r[0]));
    // Si mientras cargaba se ha ido a otra página, esta vista ya no se muestra
    if (mio !== turno) { if (vista && vista.destruir) vista.destruir(); return; }
    actual = vista;
    main.replaceChildren(actual.el);
    if (actual.montado) actual.montado();
  } catch (e) {
    if (mio !== turno) return;
    console.error(e);
    main.replaceChildren(h('div.aviso', h('h2', 'Algo no ha ido bien'), h('p', e.message), h('a.btn', { href: '#/' }, 'Volver al inicio')));
  }
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

import('./config.js').then(c => { if (!c.EXAMEN_ACTIVO) document.querySelector('.menu a[data-ruta="examen"]')?.remove(); });
window.addEventListener('hashchange', navegar);
navegar();
