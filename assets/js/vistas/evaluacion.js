// evaluacion.js (vista) — Páginas «Prácticas» y «Exámenes»: una tarjeta por cada una, separadas por temas.
import { h } from '../util.js';
import { PRACTICAS, EXAMENES, configExamen } from '../evaluacion.js';

export function vistaPracticas() {
  return { el: h('section',
    h('span.etiqueta', 'Para practicar · no cuentan para nota'), h('h1', 'Prácticas'),
    h('p.lead', { style: 'color:var(--tinta-2);font-size:20px;max-width:60ch' }, 'Puedes repetirlas las veces que quieras: cada vez sale un caso distinto y se corrige al momento.'),
    h('div.rejilla', { style: 'margin-top:24px' }, PRACTICAS.map(p => h('div.tarjeta.reto-card',
      h('span.etiqueta', p.temas), h('h3', p.titulo), h('p', p.texto),
      p.pronto ? h('span.chip', 'Próximamente') : h('a.btn', { href: p.ruta }, 'Practicar'))))) };
}

export function vistaExamenes() {
  return { el: h('section',
    h('span.etiqueta', 'Con tu código de alumno'), h('h1', 'Exámenes'),
    h('p.lead', { style: 'color:var(--tinta-2);font-size:20px;max-width:60ch' }, 'Cada examen se abre solo el día que lo diga el profesor. Para entrar necesitas tu código.'),
    h('div.rejilla', { style: 'margin-top:24px' }, EXAMENES.map(e => {
      const abierto = configExamen(e.id).activo;
      return h('div.tarjeta.reto-card',
        h('span.etiqueta', e.temas), h('h3', e.titulo), h('p', e.subtitulo + '.'),
        abierto ? h('a.btn.azul', { href: e.ruta }, 'Ir al examen') : h('span.chip', 'Cerrado'));
    }))) };
}
