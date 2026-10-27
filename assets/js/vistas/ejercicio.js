// ejercicio.js — «Elige y monta un PC» en modo práctica o examen.
// La página NO corrige: pide el caso al Apps Script, recoge la respuesta y la envía.
import { h, md, tema, progreso } from '../util.js';
import { huecoVisor, precio, caracteristicas } from './comun.js';
import { montaje } from '../piezas3d.js';
import { llamar, scriptConfigurado } from '../api.js';

const PASO_A_PIEZA = { cpu: 'cpu', refri: 'refri', ram: 'ram', m2: 'almac', disco: 'almac', placa: 'placa', fuente: 'fuente', gpu: 'gpu' };
const EN_PLACA = ['cpu', 'refri', 'ram', 'm2'];

export async function vistaEjercicio(temaId, modo) {
  const t = await tema(temaId);
  const ej = (t.ejercicios || [])[0];
  if (!ej) throw new Error('Este tema no tiene ejercicio de montaje.');
  const examen = modo === 'examen';
  const clave = `sesion:${temaId}:${modo}`;
  let s = progreso.get(clave) || null; // { casoId, caso, codigo, seleccion, pasos, fase }
  const guardar = () => progreso.set(clave, s);

  const raiz = h('div');
  const visor = huecoVisor({ pista: 'Arrastra para girar · rueda o pellizca para acercar' });
  let encuadrado = false;

  function cabecera(fase) {
    const fases = [['piezas', '1 · Elige las piezas'], ['montaje', '2 · Ordena el montaje'], ['resultado', examen ? '3 · Entregado' : '3 · Resultado']];
    const i = fases.findIndex(f => f[0] === fase);
    return h('div.ej-cab',
      h('div', h('span.etiqueta', (examen ? 'Examen' : 'Práctica') + ' · Tema ' + t.numero), h('h1', ej.titulo)),
      fase !== 'inicio' ? h('div.fases', fases.map((f, k) => h('span', { class: k < i ? 'hecha' : k === i ? 'actual' : '' }, f[1]))) : null);
  }

  function piezaSel(cat) { return s && s.seleccion[cat] ? s.caso.pool[cat].find(p => p.id === s.seleccion[cat]) : null; }
  function seleccionObjetos() { const o = {}; s.caso.categorias.forEach(c => { const p = piezaSel(c.id); if (p) o[c.id] = p; }); return o; }
  function total() { return s.caso.categorias.reduce((n, c) => n + ((piezaSel(c.id) || {}).precio || 0), 0); }

  function actualizar3D(visibles) {
    const v = visor.iniciar(); if (!v) return;
    v.mostrar(montaje(seleccionObjetos(), { visibles }), { mantenerCamara: encuadrado });
    encuadrado = true;
  }

  function encargo() {
    const p = s.caso.perfil;
    return h('div.tarjeta.encargo',
      h('span.etiqueta', 'Encargo'), h('h2', { style: 'font-size:24px;margin-top:4px' }, p.titulo),
      h('p', p.descripcion),
      h('b', 'Lo que tiene que cumplir:'), h('ul', p.requisitos.map(r => h('li', r)), h('li', `Presupuesto máximo: ${precio(p.presupuesto)}`)));
  }

  // ---------- Fase 0: empezar ----------
  function pintarInicio(msg) {
    const aviso = h('div.mensaje', { role: 'alert' }); if (msg) { aviso.className = 'mensaje error'; aviso.textContent = msg; } else aviso.hidden = true;
    const error = e => { aviso.hidden = false; aviso.className = 'mensaje error'; aviso.textContent = e.message; };
    if (!scriptConfigurado()) {
      raiz.replaceChildren(cabecera('inicio'), h('div.mensaje.error', 'Esta parte todavía no está conectada con el servidor del profesor. El resto de la web (lecciones y piezas) funciona igual.'));
      return;
    }
    if (examen) {
      const input = h('input', { id: 'codigo', autocomplete: 'off', inputmode: 'text', maxlength: 12, value: (s && s.codigo) || '', 'aria-describedby': 'ayuda-codigo' });
      const btn = h('button.btn.azul', { type: 'submit' }, 'Empezar el examen');
      const form = h('form.tarjeta.formulario', { onsubmit: async e => {
        e.preventDefault(); btn.disabled = true; btn.textContent = 'Conectando…';
        try {
          const codigo = input.value.trim().toUpperCase();
          const r = await llamar('examen-empezar', { codigo });
          const mismo = s && s.casoId === r.casoId;
          s = { casoId: r.casoId, caso: r.caso, codigo, alumno: r.alumno, seleccion: mismo ? s.seleccion : {}, pasos: mismo ? s.pasos : [], fase: mismo ? s.fase : 'piezas' };
          guardar(); pintar();
        } catch (err) { error(err); btn.disabled = false; btn.textContent = 'Empezar el examen'; }
      } },
        h('label', { for: 'codigo' }, h('b', 'Tu código de alumno')), input,
        h('p#ayuda-codigo', { style: 'margin:0;font-size:15px;color:var(--tinta-2)' }, 'Te lo da el profesor. Si recargas la página o se va la conexión, vuelve a poner tu código: recuperarás el mismo caso.'),
        btn, aviso);
      raiz.replaceChildren(cabecera('inicio'),
        h('div.contenido', { style: 'max-width:70ch' }, h('p', { html: md('Te llegará un cliente con un encargo. Tendrás que **elegir piezas compatibles** que cumplan lo que pide y **ordenar los pasos de montaje** con todas las medidas de **seguridad**. Al entregar, ya no se puede cambiar nada.') })),
        form);
    } else {
      const btn = h('button.btn.azul', { type: 'button', onclick: async () => {
        btn.disabled = true; btn.textContent = 'Preparando el caso…';
        try {
          const r = await llamar('practica-empezar', { ejercicio: ej.id });
          s = { casoId: r.casoId, caso: r.caso, seleccion: {}, pasos: [], fase: 'piezas' }; guardar(); pintar();
        } catch (err) { error(err); btn.disabled = false; btn.textContent = 'Empezar un caso nuevo'; }
      } }, 'Empezar un caso nuevo');
      const previas = progreso.practicas().filter(p => p.tema === temaId);
      raiz.replaceChildren(cabecera('inicio'),
        h('div.contenido', { style: 'max-width:70ch' },
          h('p', { html: md(ej.descripcion) }),
          h('p', { html: md('Cada vez te tocará un cliente y unas piezas distintas. Al terminar verás **qué has hecho bien y qué no**, y un ejemplo de solución. **No cuenta para nota.**') })),
        h('div.fila', btn), aviso,
        previas.length ? h('p', { style: 'margin-top:20px;color:var(--tinta-2)' }, 'Tus últimas prácticas en este navegador: ', previas.slice(-5).map(p => p.nota.toLocaleString('es-ES')).join(' · ')) : null);
    }
  }

  // ---------- Fase 1: piezas ----------
  function pintarPiezas() {
    const caja = h('div.tarjeta.presupuesto');
    const siguiente = h('button.btn.azul', { type: 'button', onclick: () => { s.fase = 'montaje'; guardar(); pintar(); } }, 'Siguiente: ordenar el montaje →');
    function resumen() {
      const n = total(), max = s.caso.perfil.presupuesto;
      caja.className = 'tarjeta presupuesto' + (n > max ? ' pasa' : '');
      caja.replaceChildren(h('span', 'Total del equipo', h('br'), h('small', { style: 'font-weight:400;color:var(--tinta-2)' }, `Presupuesto: ${precio(max)}`)), h('span.cifra', precio(n)));
      const faltan = s.caso.categorias.filter(c => !s.seleccion[c.id]).length;
      siguiente.disabled = faltan > 0;
      siguiente.textContent = faltan ? `Te faltan ${faltan} pieza${faltan > 1 ? 's' : ''}` : 'Siguiente: ordenar el montaje →';
      actualizar3D();
    }
    const categorias = s.caso.categorias.map(c => {
      const botones = s.caso.pool[c.id].map(p => h('button.op-pieza', { type: 'button', 'aria-pressed': s.seleccion[c.id] === p.id ? 'true' : 'false',
        onclick: e => { s.seleccion[c.id] = p.id; guardar(); botones.forEach(b => b.setAttribute('aria-pressed', b === e.currentTarget ? 'true' : 'false')); resumen(); } },
        h('b', p.nombre), h('span.precio', p.precio ? precio(p.precio) : 'Sin coste'),
        h('dl', caracteristicas(p).map(([k, v]) => [h('dt', k), h('dd', String(v))]))));
      return h('section.categoria', h('h3', c.nombre), h('div.opciones-piezas', botones));
    });
    raiz.replaceChildren(cabecera('piezas'),
      h('div.ej',
        h('div', encargo(), categorias, h('div.barra-acciones', h('span'), siguiente)),
        h('aside', visor.el, caja)));
    resumen();
  }

  // ---------- Fase 2: montaje ----------
  function pintarMontaje() {
    const acciones = h('ul.acciones'), secuencia = h('ol.secuencia');
    const texto = id => (s.caso.acciones.find(a => a.id === id) || {}).texto || id;
    function visibles() {
      const v = new Set();
      s.pasos.forEach(id => { if (PASO_A_PIEZA[id]) v.add(PASO_A_PIEZA[id]); if (EN_PLACA.includes(id)) v.add('placa'); });
      return v;
    }
    function refrescar() {
      acciones.replaceChildren(...s.caso.acciones.filter(a => !s.pasos.includes(a.id)).map(a =>
        h('li', h('button.accion', { type: 'button', onclick: () => { s.pasos.push(a.id); guardar(); refrescar(); } }, a.texto))));
      if (!acciones.children.length) acciones.append(h('li.vacio', 'Has usado todas las acciones.'));
      secuencia.replaceChildren(...s.pasos.map((id, i) => h('li',
        h('span.n', String(i + 1)), h('span', texto(id)),
        h('span.ctl',
          h('button', { type: 'button', title: 'Subir', 'aria-label': 'Subir', disabled: i === 0, onclick: () => { [s.pasos[i - 1], s.pasos[i]] = [s.pasos[i], s.pasos[i - 1]]; guardar(); refrescar(); } }, '↑'),
          h('button', { type: 'button', title: 'Bajar', 'aria-label': 'Bajar', disabled: i === s.pasos.length - 1, onclick: () => { [s.pasos[i + 1], s.pasos[i]] = [s.pasos[i], s.pasos[i + 1]]; guardar(); refrescar(); } }, '↓'),
          h('button', { type: 'button', title: 'Quitar', 'aria-label': 'Quitar', onclick: () => { s.pasos.splice(i, 1); guardar(); refrescar(); } }, '✕')))));
      if (!s.pasos.length) secuencia.append(h('li.vacio', { style: 'background:none' }, 'Toca las acciones de la izquierda en el orden en que las harías.'));
      entregar.disabled = s.pasos.length === 0;
      actualizar3D(visibles());
    }
    const entregar = h('button.btn.azul', { type: 'button', onclick: () => confirmar() }, examen ? 'Entregar el examen' : 'Corregir');
    const sel = seleccionObjetos();
    raiz.replaceChildren(cabecera('montaje'),
      h('div.ej',
        h('div',
          h('div.tarjeta.encargo', { style: 'border-left-color:var(--azul)' },
            h('p', { html: md('Elige **solo las acciones correctas** y ponlas **en orden**. Hay acciones que **no se deben hacer nunca**: no las uses. Las acciones que no correspondan a tus piezas, déjalas sin usar.') }),
            h('p', { style: 'font-size:15px;color:var(--tinta-2)' }, 'Tus piezas: ', s.caso.categorias.map(c => sel[c.id] ? sel[c.id].nombre : '—').join(' · '))),
          h('div.montar', { style: 'margin-top:16px' },
            h('div.tarjeta.columna', h('h3', 'Acciones'), acciones),
            h('div.tarjeta.columna', h('h3', 'Tu orden'), secuencia)),
          h('div.barra-acciones', h('button.btn.sec', { type: 'button', onclick: () => { s.fase = 'piezas'; guardar(); pintar(); } }, '← Cambiar piezas'), entregar)),
        h('aside', visor.el, h('p.pie-visor', 'El dibujo solo muestra lo que vas colocando: no te dice si está bien.'))));
    refrescar();
  }

  function confirmar() {
    const dlg = h('dialog',
      h('h2', examen ? '¿Entregar el examen?' : '¿Corregir?'),
      h('p', examen ? 'Después ya no podrás cambiar ni las piezas ni el orden.' : 'Verás tu nota y lo que has fallado.'),
      h('div.fila', { style: 'justify-content:flex-end' },
        h('button.btn.sec', { type: 'button', onclick: () => dlg.close() }, 'Seguir revisando'),
        h('button.btn.azul', { type: 'button', onclick: async e => { e.target.disabled = true; dlg.close(); await enviar(); } }, examen ? 'Entregar' : 'Corregir')));
    dlg.addEventListener('close', () => dlg.remove());
    document.body.append(dlg); dlg.showModal();
  }

  async function enviar() {
    const espera = h('div.mensaje', 'Enviando…');
    raiz.append(espera);
    try {
      const respuesta = { seleccion: s.seleccion, pasos: s.pasos };
      const r = examen
        ? await llamar('examen-entregar', { codigo: s.codigo, casoId: s.casoId, respuesta })
        : await llamar('practica-entregar', { casoId: s.casoId, respuesta });
      if (!examen) progreso.anotarPractica({ tema: temaId, nota: r.resultado.nota });
      const caso = s.caso;
      s = null; progreso.set(clave, undefined);
      pintarResultado(r, caso);
    } catch (e) {
      espera.className = 'mensaje error';
      espera.textContent = e.message + (examen ? ' Tu respuesta sigue guardada en este navegador: vuelve a pulsar «Entregar».' : '');
    }
  }

  // ---------- Fase 3: resultado ----------
  function pintarResultado(r, caso) {
    const res = r.resultado;
    const nombres = { compatibilidad: 'Compatibilidad', cliente: 'Encargo del cliente', seguridad: 'Seguridad', orden: 'Orden de montaje' };
    const maximos = (res && res.maximos) || r.maximos || {};
    const mapMax = { compatibilidad: maximos.compat, cliente: maximos.cliente, seguridad: maximos.seguridad, orden: maximos.orden };
    const bloques = (res && res.bloques) || r.bloques;
    const nota = res ? res.nota : r.nota;
    const partes = [cabecera('resultado')];
    if (examen) partes.push(h('div.mensaje.ok', { style: 'margin-bottom:16px' }, 'Examen entregado. Ya está guardado en la hoja del profesor.'));
    if (nota !== undefined) {
      partes.push(h('div.tarjeta', { style: 'padding:22px' },
        h('span.etiqueta', 'Nota'), h('div.nota-grande', nota.toLocaleString('es-ES', { maximumFractionDigits: 2 }), h('small', { style: 'font-size:28px;color:var(--tinta-2)' }, ' / 10')),
        (res ? res.faltaGrave : r.faltaGrave) ? h('p.mensaje.error', 'Has elegido una acción peligrosa. En un taller real, eso es una falta grave.') : null,
        bloques ? h('div.bloques', Object.keys(nombres).map(k => h('div.tarjeta.bloque', h('small', nombres[k]), h('b', `${bloques[k].toLocaleString('es-ES')} / ${mapMax[k] != null ? mapMax[k].toLocaleString('es-ES') : '–'}`)))) : null));
    }
    if (res && res.detalle) {
      Object.keys(nombres).forEach(k => {
        const items = res.detalle.filter(d => d.bloque === k);
        if (!items.length) return;
        partes.push(h('section.categoria', h('h3', nombres[k]), h('ul.detalle', items.map(d => h('li', { class: d.grave ? 'grave' : d.ok ? '' : 'ko' }, (d.ok ? '✓ ' : '✗ ') + d.texto)))));
      });
    }
    if (r.solucionEjemplo && caso) {
      partes.push(h('section.categoria', h('h3', 'Una solución posible'),
        h('p', { style: 'color:var(--tinta-2)' }, 'No es la única: cualquier combinación compatible que cumpla el encargo vale.'),
        h('ul', caso.categorias.map(c => { const p = caso.pool[c.id].find(x => x.id === r.solucionEjemplo[c.id]); return h('li', h('b', c.nombre + ': '), p ? p.nombre : '—'); }))));
    }
    partes.push(h('div.barra-acciones',
      h('a.btn.sec', { href: '#/' + temaId }, 'Volver a las lecciones'),
      examen ? h('span') : h('button.btn.azul', { type: 'button', onclick: () => { s = null; pintarInicio(); } }, 'Otro caso')));
    raiz.replaceChildren(...partes);
    window.scrollTo(0, 0);
  }

  function pintar() {
    if (!s) return pintarInicio();
    if (s.fase === 'montaje') return pintarMontaje();
    return pintarPiezas();
  }

  return { el: raiz, montado: pintar, destruir() { visor.destruir(); } };
}
