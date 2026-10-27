// leccion.js — Renderiza una lección a partir de su JSON de bloques.
import { h, md, tema, cargarJSON, progreso } from '../util.js';
import { huecoVisor } from './comun.js';
import { piezaSuelta } from '../piezas3d.js';

const NOMBRE_MODELO = { placa: 'Placa base', cpu: 'Procesador', refri: 'Disipador', ram: 'Memoria RAM', almac: 'Almacenamiento', gpu: 'Tarjeta gráfica', fuente: 'Fuente', caja: 'Caja' };

export async function vistaLeccion(temaId, lecId) {
  const t = await tema(temaId);
  const idx = t.lecciones.findIndex(l => l.id === lecId);
  if (idx < 0) throw new Error('Lección no encontrada.');
  const meta = t.lecciones[idx];
  const [lec, piezasInfo] = await Promise.all([cargarJSON(t.base + meta.archivo), cargarJSON(t.base + 'piezas.json')]);
  progreso.marcar(temaId, lecId, { vista: true });

  let modeloActual = null;
  const pie = h('p.pie-visor');
  const visor = huecoVisor({
    alTocar: parte => {
      const info = modeloActual && piezasInfo[modeloActual] && piezasInfo[modeloActual].partes[parte];
      visor.rotulo(info || '');
    }
  });
  const botones3d = [];
  function ver(modelo, foco, texto) {
    const v = visor.iniciar();
    botones3d.forEach(b => b.setAttribute('aria-pressed', b.dataset.modelo === modelo && b.dataset.foco === (foco || '') ? 'true' : 'false'));
    pie.innerHTML = md(texto || '');
    if (!v) return;
    if (modeloActual !== modelo) { v.mostrar(piezaSuelta(modelo)); modeloActual = modelo; }
    v.resaltar(foco || null);
    visor.rotulo(foco && piezasInfo[modelo] ? piezasInfo[modelo].partes[foco] || '' : '');
  }

  const preguntas = lec.bloques.filter(b => b.tipo === 'pregunta');
  const estado = progreso.leccion(temaId, lecId).aciertos || {};
  const marcador = h('span.chip');
  function actualizarMarcador() {
    const n = preguntas.filter((_, i) => estado[i]).length;
    marcador.textContent = `${n} / ${preguntas.length} correctas`;
    marcador.className = 'chip' + (n === preguntas.length ? ' ok' : '');
    progreso.marcar(temaId, lecId, { aciertos: estado, completa: n === preguntas.length });
  }

  function bloque(b, i) {
    switch (b.tipo) {
      case 'h': return h('h2', b.texto);
      case 'p': return h('p', { html: md(b.texto) });
      case 'lista': return h('ul', b.items.map(x => h('li', { html: md(x) })));
      case 'pasos': return h('ol.pasos', b.items.map(x => h('li', { html: md(x) })));
      case 'tabla': return h('div.tabla', h('table', h('thead', h('tr', b.cab.map(c => h('th', { scope: 'col', html: md(c) })))),
        h('tbody', b.filas.map(f => h('tr', f.map(c => h('td', { html: md(c) })))))));
      case 'nota': return h('div.nota', { html: md(b.texto) });
      case 'analogia': return h('div.analogia', { html: md(b.texto) });
      case 'resumen': return h('div.resumen', { html: md(b.texto) });
      case 'ver3d': {
        const btn = h('button.ver3d', { type: 'button', 'data-modelo': b.modelo, 'data-foco': b.foco || '', 'aria-pressed': 'false', onclick: () => { ver(b.modelo, b.foco, b.texto); if (matchMedia('(max-width:960px)').matches) visor.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } },
          h('span.ic', '3D'), h('span', h('b', 'Ver en 3D: ' + (NOMBRE_MODELO[b.modelo] || b.modelo)), h('br'), h('span', { html: md(b.texto) })));
        botones3d.push(btn); return btn;
      }
      default: return null;
    }
  }

  function pregunta(b, i) {
    const exp = h('p.explicacion', { 'aria-live': 'polite' });
    const ops = b.opciones.map((o, k) => h('button.opcion', { type: 'button', onclick: () => {
      ops.forEach(x => x.classList.remove('ok', 'ko'));
      if (k === b.correcta) {
        ops[k].classList.add('ok'); ops.forEach(x => x.disabled = true);
        exp.innerHTML = '<b>¡Correcto!</b> ' + md(b.explicacion);
        estado[i] = true;
      } else {
        ops[k].classList.add('ko');
        exp.innerHTML = '<b>No es esa.</b> Piénsalo otra vez: vuelve a leer el apartado si lo necesitas.';
      }
      actualizarMarcador();
    } }, o));
    if (estado[i]) { ops[b.correcta].classList.add('ok'); ops.forEach(x => x.disabled = true); exp.innerHTML = md(b.explicacion); }
    return h('div.tarjeta.pregunta', h('h3', `${i + 1}. ${b.enunciado}`), h('div.opciones', ops), exp);
  }

  const anterior = t.lecciones[idx - 1], siguiente = t.lecciones[idx + 1];
  const contenido = lec.bloques.filter(b => b.tipo !== 'pregunta').map(bloque);
  actualizarMarcador();
  const el = h('div.leccion',
    h('article',
      h('a.etiqueta', { href: `#/${t.id}` }, `Tema ${t.numero} · Lección ${idx + 1}`),
      h('h1', lec.titulo),
      h('div.objetivos', h('b', 'En esta lección vas a aprender a:'), h('ul', lec.objetivos.map(o => h('li', o)))),
      h('div.contenido', contenido),
      preguntas.length ? h('section.preguntas',
        h('div.fila', { style: 'justify-content:space-between' }, h('h2', 'Comprueba lo que sabes'), marcador),
        h('p', { style: 'color:var(--tinta-2)' }, 'La lección queda completada cuando aciertas todas. No cuenta para nota.'),
        preguntas.map(pregunta)) : null,
      h('nav.navlec', { 'aria-label': 'Lecciones' },
        anterior ? h('a.btn.sec', { href: `#/${t.id}/leccion/${anterior.id}` }, '← ' + anterior.titulo) : h('span'),
        siguiente ? h('a.btn', { href: `#/${t.id}/leccion/${siguiente.id}` }, siguiente.titulo + ' →') : h('a.btn.azul', { href: `#/${t.id}/practica` }, 'Ir a la práctica →'))),
    h('aside', visor.el, pie));

  return {
    el,
    montado() {
      const primero = lec.bloques.find(b => b.tipo === 'ver3d');
      if (primero) ver(primero.modelo, primero.foco, primero.texto);
      else visor.el.parentElement.remove();
    },
    destruir() { visor.destruir(); }
  };
}
