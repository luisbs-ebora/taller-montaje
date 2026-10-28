// inicio.js — Portada y lista de lecciones de un tema.
import { h, curso, tema, progreso, cargarJSON } from '../util.js';
import { huecoVisor } from './comun.js';
import { EXAMEN_ACTIVO } from '../config.js';
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
    ...temas.map(t => h('section.seccion',
      h('header', h('div', h('span.etiqueta', 'Tema ' + t.numero), h('h2', t.titulo)), h('span.chip', `${progreso.completadas(t.id, t.lecciones)} / ${t.lecciones.length}`)),
      h('div.rejilla', t.lecciones.map((l, i) => tarjetaLeccion(t, l, i))),
      t.ejercicios && t.ejercicios.length ? h('div.rejilla', { style: 'margin-top:14px' },
        
        h('div.tarjeta.reto-card', h('span.etiqueta', 'Práctica libre'), h('h3', t.ejercicios[0].titulo), h('p', t.ejercicios[0].descripcion + ' Puedes repetirla las veces que quieras: no cuenta para nota.'), h('a.btn', { href: `#/${t.id}/practica` }, 'Practicar')),
        EXAMEN_ACTIVO && h('div.tarjeta.reto-card', h('span.etiqueta', 'Examen'), h('h3', 'Con tu código'), h('p', 'Solo cuando el profesor lo abra. Tu nota se guarda al entregarlo.'), h('a.btn.sec', { href: `#/${t.id}/examen` }, 'Ir al examen'))) : null)));

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

export async function vistaTema(temaId) {
  const t = await tema(temaId);
  return { el: h('div',
    h('span.etiqueta', 'Tema ' + t.numero), h('h1', t.titulo), h('p.lead', { style: 'color:var(--tinta-2);font-size:20px;max-width:60ch' }, t.resumen),
    h('div.rejilla', { style: 'margin-top:24px' }, t.lecciones.map((l, i) => tarjetaLeccion(t, l, i))),
    h('div.fila', { style: 'margin-top:24px' }, h('a.btn.sec', { href: `#/${t.id}/piezas` }, 'Piezas en 3D'), h('a.btn', { href: `#/${t.id}/practica` }, 'Práctica: elige y monta un PC'))) };
}
