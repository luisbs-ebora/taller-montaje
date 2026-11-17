// inicio.js — Portada y lista de lecciones de un tema.
import { h, curso, tema, progreso, cargarJSON } from '../util.js';
import { huecoVisor } from './comun.js';
import { montaje } from '../piezas3d.js';

const EQUIPO_PORTADA = ['caja-gredos', 'pb-z790', 'cpu-c7-14700k', 'ref-t120', 'ram-d5-2x16', 'ssd-nvme-1tb', 'gpu-rx60', 'fte-650'];

function tarjetaLeccion(t, l, i) {
  const p = progreso.leccion(t.id, l.id);
  return h('a.tarjeta.leccion-card', { href: `#/${t.id}/leccion/${l.id}` },
    h('span.num', String(i + 1).padStart(2, '0')),
    h('h3', l.titulo), h('p', l.subtitulo),
    h('span.estado', p.completa ? h('span.chip.ok', '✓ Completada') : p.vista ? h('span.chip', 'Empezada') : h('span.chip', 'Sin empezar')));
}

export async function vistaInicio() {
  const c = await curso();
  const temas = await Promise.all(c.temas.map(x => tema(x.id)));
  const t1 = temas[0];
  const total = temas.reduce((n, t) => n + t.lecciones.length, 0);
  const hechas = temas.reduce((n, t) => n + progreso.completadas(t.id, t.lecciones), 0);
  const siguiente = (() => { for (const t of temas) for (const l of t.lecciones) if (!progreso.leccion(t.id, l.id).completa) return `#/${t.id}/leccion/${l.id}`; return `#/${t1.id}/practica`; })();
  const visor = huecoVisor({ autoRotar: true, pista: 'Arrastra para girar el equipo' });

  const el = h('div',
    h('section.portada',
      h('div',
        h('span.etiqueta', c.titulo),
        h('h1', 'Monta un PC pieza a pieza'),
        h('p.lead', 'Aprende qué hace cada componente, cómo saber si son compatibles y cómo se monta un equipo sin estropear nada. Gira las piezas, tócalas y ponte a prueba.'),
        h('div.fila', h('a.btn.azul', { href: siguiente }, hechas ? 'Seguir donde lo dejé' : 'Empezar'), h('a.btn.sec', { href: `#/${t1.id}/piezas` }, 'Ver las piezas en 3D')),
        h('div.progreso', h('div.barra', h('i', { style: `width:${total ? 100 * hechas / total : 0}%` })), h('span.mono', `${hechas} de ${total} lecciones`))),
      h('div.escena', visor.el)),
    // La portada es fija: un acceso por tema y los apartados de siempre. Los temas nuevos salen solos de curso.json.
    h('section.seccion',
      h('header', h('div', h('span.etiqueta', 'Lecciones'), h('h2', 'Temas'))),
      h('div.rejilla', temas.map(t => h('a.tarjeta.leccion-card', { href: `#/${t.id}` },
        h('span.num', String(t.numero).padStart(2, '0')),
        h('h3', t.titulo), h('p', t.resumen),
        h('span.estado', h('span.chip', `${progreso.completadas(t.id, t.lecciones)} de ${t.lecciones.length} lecciones`)))))),
    h('section.seccion',
      h('header', h('div', h('span.etiqueta', 'Para clase y repaso'), h('h2', 'Herramientas'))),
      h('div.rejilla',
        h('div.tarjeta.reto-card', h('h3', 'Piezas en 3D'), h('p', 'Gira cada pieza, tócala y mira para qué sirve y dónde va.'), h('a.btn.sec', { href: `#/${t1.id}/piezas` }, 'Ver las piezas')),
        h('div.tarjeta.reto-card', h('h3', 'Montaje animado'), h('p', 'Mira cómo se monta un PC paso a paso, en dibujos animados, y qué pasa si te equivocas en cada paso.'), h('a.btn.sec', { href: `#/${t1.id}/animado` }, 'Ver el montaje')),
        h('div.tarjeta.reto-card', h('h3', 'Por dentro'), h('p', 'Abre las piezas y mira qué hay dentro. Cambia algo y mira qué pasa.'), h('a.btn.sec', { href: '#/pordentro' }, 'Abrir las piezas')),
        h('div.tarjeta.reto-card', h('span.etiqueta', 'Más adelante · Periféricos'), h('h3', 'Impresora láser por dentro'), h('p', 'Una impresora láser sin el panel lateral: sigue la hoja y párala en cada paso, de la carga del tambor a la fusión del tóner.'), h('a.btn.sec', { href: 'figuras/impresora-laser.html' }, 'Ver la figura')))),
    h('section.seccion',
      h('header', h('div', h('span.etiqueta', 'Ponte a prueba'), h('h2', 'Evaluación'))),
      h('div.rejilla',
        h('div.tarjeta.reto-card', h('h3', 'Prácticas'), h('p', 'Puedes repetirlas las veces que quieras: cada vez sale un caso distinto y se corrige al momento. No cuentan para nota.'), h('a.btn', { href: '#/practicas' }, 'Ver las prácticas')),
        h('div.tarjeta.reto-card', h('h3', 'Exámenes'), h('p', 'Cada examen se abre solo el día que lo diga el profesor. Para entrar necesitas tu código.'), h('a.btn.sec', { href: '#/examenes' }, 'Ver los exámenes')))));

  return {
    el,
    async montado() {
      const v = visor.iniciar(); if (!v) return;
      const cat = await cargarJSON(t1.base + 'catalogo.json');
      const sel = {}; EQUIPO_PORTADA.forEach(id => { const p = cat.piezas.find(x => x.id === id); if (p) sel[p.cat] = p; });
      v.mostrar(montaje(sel));
    },
    destruir() { visor.destruir(); }
  };
}

// Selector de tema (pestañas) para Lecciones y Piezas 3D
export async function selectorTemas(actual, ruta = id => `#/${id}`) {
  const c = await curso();
  if (c.temas.length < 2) return null;
  const temas = await Promise.all(c.temas.map(x => tema(x.id)));
  return h('nav.selector-temas', { 'aria-label': 'Temas' }, temas.map(t =>
    h('a', { href: ruta(t.id), 'aria-current': t.id === actual ? 'page' : false }, h('b', 'Tema ' + t.numero), h('span', t.titulo))));
}

const CLAVE_TEMA = 'taller-montaje:tema';
export async function vistaLecciones() {
  const c = await curso();
  let id = null;
  try { id = localStorage.getItem(CLAVE_TEMA); } catch (e) { /* sin almacenamiento */ }
  if (!c.temas.some(x => x.id === id)) id = c.temas[0].id;
  return vistaTema(id);
}

export async function vistaTema(temaId) {
  const t = await tema(temaId);
  try { localStorage.setItem(CLAVE_TEMA, t.id); } catch (e) { /* sin almacenamiento */ }
  const practica = (t.ejercicios && t.ejercicios.length) ? t.id : t.practicaEn;
  return { el: h('div',
    h('span.etiqueta', 'Tema ' + t.numero), h('h1', t.titulo), h('p.lead', { style: 'color:var(--tinta-2);font-size:20px;max-width:60ch' }, t.resumen),
    h('div.rejilla', { style: 'margin-top:24px' }, t.lecciones.map((l, i) => tarjetaLeccion(t, l, i))),
    h('div.fila', { style: 'margin-top:24px' },
      t.piezas && t.piezas.length ? h('a.btn.sec', { href: `#/${t.id}/piezas` }, 'Piezas en 3D') : null,
      t.id === 'tema1' ? h('a.btn.sec', { href: `#/${t.id}/animado` }, 'Montaje animado') : null,
      practica ? h('a.btn', { href: `#/${practica}/practica` }, 'Práctica: monta un PC por piezas') : null,
      t.id === 'tema3' ? h('a.btn', { href: '#/tema3/practica' }, 'Práctica: este PC no arranca') : null,
      t.id === 'tema3' ? h('a.btn.sec', { href: '#/pordentro/arranque' }, 'Por dentro: la secuencia de arranque') : null,
      t.id === 'tema4' ? h('a.btn.sec', { href: '#/pordentro/corriente' }, 'Por dentro: corriente, polímetro y SAI') : null,
      t.id === 'tema4' ? h('a.btn', { href: '#/tema4/practica' }, 'Práctica: ¿está bien la fuente?') : null)) };
}
