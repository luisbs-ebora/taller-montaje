// examen34.js — Examen práctico de los Temas 3 y 4: dos equipos que no arrancan y dos fuentes que hay que medir.
// La página NO corrige ni conoce las soluciones: pide el examen al Apps Script del profesor, recoge lo que hace
// el alumno y lo envía. Mientras dura el examen no se dice si algo está bien o mal.
import { h, progreso } from '../util.js';
import { huecoVisor } from './comun.js';
import { montaje } from '../piezas3d.js';
import { bancoMedida } from '../modelos-t4.js';
import { FASES, ZONAS, zonaDeParte } from '../practica/averias.js';
import { LINEAS, ORDEN, SELECTORES, medir } from '../practica/medidas.js';
import { llamar, scriptConfigurado } from '../api.js';
import { configExamen, examen as datosExamen } from '../evaluacion.js';

const ID_EXAMEN = 't3t4', CLAVE = 'sesion:examen:t3t4';
const SEG_ABRIR = [['apagar', 'Apagar y poner el interruptor de la fuente en 0'], ['desenchufar', 'Desenchufar y pulsar el botón unos segundos para descargar'], ['pulsera', 'Ponerme la pulsera antiestática']];
const SEG_MEDIR = [['pulsera', 'Pulsera antiestática puesta'], ['puntas', 'Puntas revisadas: el aislante no está roto']];
const BORNES = [['v', 'VΩ'], ['ma', 'mA'], ['a10', '10 A']];
const LEDS = [['CPU', '#e5484d'], ['DRAM', '#ffd23f'], ['VGA', '#f4f1ea'], ['BOOT', '#3fbf6a']];
const RESPUESTAS_LINEA = [['12', '+12 V (amarillo)'], ['5', '+5 V (rojo)'], ['33', '+3,3 V (naranja)'], ['sb', '5VSB (morado)'], ['pg', 'PWR_OK (gris)'], ['m12', '−12 V (azul)'], ['ninguna', 'Ninguna: todas están en su margen']];
const es = (v, d = 2) => v.toFixed(d).replace('.', ',').replace('-', '−');
const nota = n => n.toLocaleString('es-ES', { maximumFractionDigits: 2 });
const nombreTipo = t => t === 'averia' ? 'No arranca' : 'Fuente';

/** Respuesta vacía de un equipo, según su tipo. */
const enBlanco = e => e.tipo === 'averia'
  ? { fase: null, seg: [], abrir: null, revisadas: [], causa: null, solucion: null }
  : { tipo: 'manual', seg: [], roja: null, sel: null, prep: null, carga: false, medidas: [], cortos: 0, fusible: false, linea: null, causa: null };
const completo = (e, r) => e.tipo === 'averia' ? !!(r.fase && r.abrir && r.causa && r.solucion) : !!(r.prep && r.medidas.length && r.linea && r.causa);
const empezado = (e, r) => e.tipo === 'averia' ? !!(r.fase || r.seg.length || r.abrir) : !!(r.seg.length || r.roja || r.sel || r.prep);

export function vistaExamen34() {
  const info = datosExamen(ID_EXAMEN), activo = configExamen(ID_EXAMEN).activo;
  let s = progreso.get(CLAVE) || null;   // { casoId, caso, codigo, alumno, limite, desfase, actual, resp }
  const guardar = () => progreso.set(CLAVE, s);
  let banco = null, raf = 0, lectura = '', enviando = false, avisado = false;

  const visor = huecoVisor({ pista: 'Arrastra para girar · rueda o pellizca para acercar · toca una pieza o un cable', alTocar: parte => tocar3D(parte) });
  const cab = h('div'), pestanas = h('div'), panel = h('div.av-panel'), pie = h('div');
  const rejilla = h('div.av-rejilla', h('div.av-visor', visor.el), panel);
  const raiz = h('section.averia', cab, pestanas, rejilla, pie);

  // ---------- Reloj: cuenta atrás y entrega automática ----------
  const reloj = h('div.reloj', { role: 'timer', 'aria-live': 'off' });
  const restante = () => s && s.limite ? Date.parse(s.limite) - (Date.now() + (s.desfase || 0)) : null;
  function tic() {
    const ms = restante();
    if (ms === null) { reloj.hidden = true; return; }
    reloj.hidden = false;
    const seg = Math.max(0, Math.ceil(ms / 1000));
    reloj.textContent = `Tiempo: ${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
    reloj.classList.toggle('poco', seg <= 300);
    if (seg <= 60 && !avisado) { avisado = true; reloj.setAttribute('aria-live', 'assertive'); }
    if (seg === 0 && !enviando) { document.querySelectorAll('dialog[open]').forEach(d => d.close()); enviar(true); }
  }
  const intervalo = setInterval(tic, 1000);

  const cabecera = extra => h('div.ej-cab',
    h('div', h('span.etiqueta', info.titulo), h('h1', 'Examen práctico · Temas 3 y 4')),
    extra || null);

  // ---------- Antes de empezar ----------
  function pintarInicio(msg) {
    rejilla.style.display = 'none'; pestanas.replaceChildren(); pie.replaceChildren();
    if (!activo) {
      cab.replaceChildren(cabecera(), h('div.mensaje', 'El examen todavía no está abierto. Mientras tanto, puedes hacer las prácticas todas las veces que quieras.'),
        h('div.fila', { style: 'margin-top:16px' }, h('a.btn.azul', { href: '#/practicas' }, 'Ir a las prácticas')));
      return;
    }
    if (!scriptConfigurado(ID_EXAMEN)) {
      cab.replaceChildren(cabecera(), h('div.mensaje.error', 'Este examen todavía no está conectado con la hoja del profesor. El resto de la web funciona igual.'));
      return;
    }
    const aviso = h('div.mensaje', { role: 'alert' }); if (msg) { aviso.className = 'mensaje error'; aviso.textContent = msg; } else aviso.hidden = true;
    const input = h('input', { id: 'codigo', autocomplete: 'off', inputmode: 'text', maxlength: 12, 'aria-describedby': 'ayuda-codigo' });
    const btn = h('button.btn.azul', { type: 'submit' }, 'Empezar el examen');
    const form = h('form.tarjeta.formulario', { onsubmit: async ev => {
      ev.preventDefault(); btn.disabled = true; btn.textContent = 'Conectando…';
      try {
        const codigo = input.value.trim().toUpperCase();
        const r = await llamar('examen-empezar', { codigo }, ID_EXAMEN);
        const previo = progreso.get(CLAVE), mismo = previo && previo.casoId === r.casoId;
        s = { casoId: r.casoId, caso: r.caso, codigo, alumno: r.alumno, limite: r.limite || null, desfase: r.ahora ? Date.parse(r.ahora) - Date.now() : 0,
          actual: mismo ? previo.actual : 0, resp: mismo ? previo.resp : r.caso.equipos.map(enBlanco) };
        guardar(); pintar(); tic();
      } catch (err) { aviso.hidden = false; aviso.className = 'mensaje error'; aviso.textContent = err.message; btn.disabled = false; btn.textContent = 'Empezar el examen'; }
    } },
      h('label', { for: 'codigo' }, h('b', 'Tu código de alumno')), input,
      h('p#ayuda-codigo', { style: 'margin:0;font-size:15px;color:var(--tinta-2)' }, 'Te lo da el profesor. Si recargas la página o se va la conexión, vuelve a poner tu código: recuperarás tu examen.'),
      btn, aviso);
    cab.replaceChildren(cabecera(),
      h('div.contenido', { style: 'max-width:70ch' },
        h('p', 'Te llegan ', h('b', 'cuatro equipos'), ': dos que no arrancan y dos en los que hay que medir la fuente con el polímetro. Puedes pasar de uno a otro y cambiar tus respuestas hasta que entregues.'),
        h('ul',
          h('li', 'Durante el examen la página no te dice si algo está bien o mal.'),
          h('li', 'Trabaja como en el taller: la seguridad cuenta, y lo que hagas mal dentro del equipo también.'),
          h('li', 'Si un equipo no queda arreglado o bien diagnosticado, su nota no pasa de un 4.'),
          h('li', 'Cuando se acabe el tiempo, se entrega solo lo que tengas.'))),
      form);
  }

  // ---------- 3D ----------
  function montar3D() {
    const v = visor.iniciar(); if (!v) return;
    cancelAnimationFrame(raf);
    const e = s.caso.equipos[s.actual], r = s.resp[s.actual];
    if (e.tipo === 'averia') {
      const sel = { caja: { formatos: ['ATX'] }, placa: { formato: 'ATX' }, cpu: {}, refri: { altura: 155 }, ram: { formato: 'DIMM', gen: 'DDR5', modulos: 2 },
        almac: { formato: '2,5"' }, fuente: { formato: 'ATX' }, gpu: e.conGpu ? { largo: 260, pcie8: 2 } : { ninguna: true } };
      v.mostrar(montaje(sel), { vista: 'frente' });
    } else {
      if (!banco) banco = bancoMedida();
      v.mostrar(banco.grupo, { vista: 'arriba' });
      v.camara.position.set(-2, 37, 31); v.controles.target.set(-2, 1.5, 5); v.controles.update();
      banco.reposo();
      banco.led.material.emissiveIntensity = e.apagado || r.fusible ? 0 : 1.6;
      ponerPolimetro();
    }
    v.resaltar(null); visor.rotulo('');
  }
  function ponerPolimetro() {
    if (!banco || !s) return;
    const r = s.resp[s.actual], p = banco.usar(r.tipo);
    banco.roja.clavija.position.copy(banco.borne(r.roja || 'v')); banco.negra.clavija.position.copy(banco.borne('com'));
    p.girarA(r.sel || 'off');
    p.lcd.pintar(r.sel ? { texto: r.sel === 'ohm' ? '1   .' : '0.00', unidad: r.sel === 'ohm' ? 'Ω' : r.sel === 'a10' ? 'A' : 'V', cc: r.sel === 'vca' ? false : r.sel === 'ohm' ? null : true, aviso: r.tipo === 'auto' ? 'AUTO' : '' } : { apagada: true });
    banco.colocar(banco.roja); banco.colocar(banco.negra);
  }
  function llevar(p, hilo, alLlegar) {
    cancelAnimationFrame(raf);
    const t0 = p.tip.clone(), d0 = p.dir.clone(), t1 = banco.sonda(hilo), d1 = p === banco.roja ? banco.DIR_ROJA : banco.DIR_NEGRA, ini = performance.now();
    const paso = ahora => {
      const t = Math.min(1, (ahora - ini) / 420), k = t * t * (3 - 2 * t);
      p.tip.lerpVectors(t0, t1, k); p.tip.y += Math.sin(Math.PI * k) * 4; p.dir.lerpVectors(d0, d1, k).normalize();
      banco.colocar(p);
      if (t < 1) raf = requestAnimationFrame(paso); else if (alLlegar) alLlegar();
    };
    raf = requestAnimationFrame(paso);
  }
  function tocar3D(parte) {
    if (!s || enviando || !parte) return;
    const e = s.caso.equipos[s.actual];
    if (e.tipo === 'averia') revisar(zonaDeParte(parte));
    else if (/^c/.test(parte) && LINEAS[parte.slice(1)]) tocar(parte.slice(1));
  }

  // ---------- Equipo que no arranca ----------
  const nombreZona = (e, id) => ZONAS[id] ? ZONAS[id].nombre : (e.zonasExtra.find(z => z.id === id) || {}).nombre || id;
  function revisar(zona, desdeLista = false) {
    const e = s.caso.equipos[s.actual], r = s.resp[s.actual];
    if (!zona) return;
    if (!r.abrir) { visor.rotulo('La caja está cerrada: paso 2'); return; }
    if (desdeLista && visor.visor) visor.visor.resaltar(ZONAS[zona] ? ZONAS[zona].partes[0] : null);
    visor.rotulo(nombreZona(e, zona));
    if (!r.revisadas.includes(zona)) { r.revisadas.push(zona); guardar(); pintarEquipo(); }
  }
  function panelAveria(e, r) {
    const cambia = f => () => { f(); guardar(); pintarEquipo(); };
    const leds = h('div.av-leds', LEDS.map(([n, c]) => h('span' + (e.led === n ? '.on' : ''), { style: `--led:${c}` }, h('i'), n)));
    const ficha = h('div.tarjeta.av-ficha',
      h('span.etiqueta', e.equipo), h('h2', 'Lo que pasa'), h('p', e.sintoma),
      h('dl.av-datos',
        h('dt', 'Ventiladores'), h('dd', e.ventiladores),
        h('dt', 'Pantalla'), h('dd', /Press|Reboot|bootable/.test(e.pantalla) ? h('code.av-pantalla', e.pantalla) : e.pantalla),
        h('dt', 'LED de la placa'), h('dd', leds),
        h('dt', 'Gráfica'), h('dd', e.conGpu ? 'Tarjeta gráfica dedicada' : 'La del procesador (sin tarjeta)')));

    const fase = h('div.tarjeta.av-paso', h('h3', '1 · ¿En qué paso del arranque falla?'),
      h('div.av-opciones', Object.entries(FASES).map(([id, txt]) => h('button.opcion' + (r.fase === id ? '.elegida' : ''),
        { type: 'button', 'aria-pressed': String(r.fase === id), onclick: cambia(() => { r.fase = id; }) }, txt))));

    const abierta = !!r.abrir;
    const seg = h('div.tarjeta.av-paso', h('h3', '2 · Antes de abrir la caja'),
      h('div.av-seguridad', SEG_ABRIR.map(([id, txt]) => h('button.av-check' + (r.seg.includes(id) ? '.hecho' : ''),
        { type: 'button', disabled: abierta, 'aria-pressed': String(r.seg.includes(id)), onclick: cambia(() => { r.seg = r.seg.includes(id) ? r.seg.filter(x => x !== id) : [...r.seg, id]; }) },
        h('span', r.seg.includes(id) ? '✓' : ''), txt))),
      abierta ? h('p.av-nota', { style: 'margin:10px 0 0' }, 'Caja abierta.')
        : h('button.btn.azul', { type: 'button', style: 'margin-top:12px', onclick: cambia(() => { r.abrir = { seguridad: r.seg.slice() }; }) }, 'Abrir la caja y revisar'));

    const zonas = [...Object.keys(ZONAS), ...e.zonasExtra.map(z => z.id)];
    const rev = h('div.tarjeta.av-paso' + (abierta ? '' : '.bloqueado'), h('h3', '3 · Revisa el equipo'),
      h('p.av-nota', abierta ? 'Toca en el 3D lo que quieras revisar o elígelo de la lista. Empieza por lo más sencillo y por lo que señalan el síntoma y los LED.' : 'Primero, el paso 2.'),
      h('div.av-zonas', zonas.map(id => h('button.chip' + (r.revisadas.includes(id) ? '.ok' : ''), { type: 'button', disabled: !abierta, onclick: () => revisar(id, true) }, nombreZona(e, id)))),
      r.revisadas.length ? h('ol.av-registro', r.revisadas.map(id => h('li', h('b', nombreZona(e, id) + ': '), e.obs[id] || ''))) : null);

    const hayRev = r.revisadas.length > 0;
    const opciones = (lista, campo, bloqueado) => h('div.av-opciones', lista.map(c => h('button.opcion' + (r[campo] === c.id ? '.elegida' : ''),
      { type: 'button', disabled: bloqueado, 'aria-pressed': String(r[campo] === c.id), onclick: cambia(() => { r[campo] = c.id; }) }, c.texto)));
    const diag = h('div.tarjeta.av-paso' + (hayRev ? '' : '.bloqueado'), h('h3', '4 · ¿Qué está mal?'), opciones(e.causas, 'causa', !hayRev));
    const sol = h('div.tarjeta.av-paso' + (r.causa ? '' : '.bloqueado'), h('h3', '5 · ¿Cómo lo arreglas?'), opciones(e.soluciones, 'solucion', !r.causa));
    return [ficha, fase, seg, rev, diag, sol];
  }

  // ---------- Fuente ----------
  const juzgable = (e, id) => LINEAS[id].min !== undefined && (!e.apagado || id === 'sb');
  function tocar(id) {
    const e = s.caso.equipos[s.actual], r = s.resp[s.actual];
    if (!r.prep) { visor.rotulo('Primero prepara el polímetro: paso 1'); return; }
    const conCarga = r.carga && e.conCarga;
    visor.rotulo(`${LINEAS[id].color}: ${LINEAS[id].nombre}`);
    if (r.fusible) { lectura = 'El polímetro no marca nada.'; pintarEquipo(); return; }
    const m = medir(e, r.tipo, { roja: r.roja, sel: r.sel }, id, conCarga);
    if (banco) {
      banco.tocar(banco.negra, banco.hiloGnd); banco.colocar(banco.negra);
      if (visor.visor) visor.visor.resaltar('c' + id);
      llevar(banco.roja, banco.hilo(id, id === '5' ? 1 : 0), () => {
        banco.poli.lcd.pintar({ texto: m.texto, unidad: m.unidad, cc: m.cc, aviso: r.tipo === 'auto' ? 'AUTO' : '' });
        if (m.evento === 'corto') banco.led.material.emissiveIntensity = 0;
      });
    }
    if (m.evento === 'corto') {
      r.cortos++; r.fusible = true;
      lectura = 'Salta una chispa y el equipo se apaga. El polímetro se queda a cero: ha saltado su fusible.';
    } else if (m.evento) {
      lectura = `El polímetro marca ${m.texto.replace('.', ',')} ${m.unidad}.`;
    } else {
      const dec = m.pocaPrecision ? 1 : 2, i = r.medidas.findIndex(x => x.id === id && x.carga === conCarga);
      const nueva = { id, carga: conCarga, v: m.valor, dec, juicio: i >= 0 ? r.medidas[i].juicio : null };
      if (i >= 0) r.medidas[i] = nueva; else r.medidas.push(nueva);
      lectura = `El polímetro marca ${es(m.valor, dec)} V.`;
    }
    guardar(); pintarEquipo();
  }
  function panelFuente(e, r) {
    const cambia = (f, poli) => () => { f(); guardar(); if (poli) ponerPolimetro(); pintarEquipo(); };
    const ficha = h('div.tarjeta.av-ficha',
      h('span.etiqueta', e.equipo), h('h2', 'Lo que pasa'), h('p', e.sintoma),
      h('dl.av-datos',
        h('dt', 'Equipo'), h('dd', e.apagado ? 'Apagado (no enciende), enchufado y con la fuente en I' : 'Encendido, con la caja abierta'),
        h('dt', 'Fuente'), h('dd', 'ATX de 450 W')));

    const listo = !!r.prep;
    const prep = h('div.tarjeta.av-paso', h('h3', '1 · Prepara el polímetro'),
      h('div.variantes', { role: 'group', 'aria-label': 'Tipo de polímetro' }, [['manual', 'Rango manual'], ['auto', 'Autorango']].map(([id, txt]) =>
        h('button', { type: 'button', 'aria-pressed': String(r.tipo === id), disabled: listo, onclick: cambia(() => { r.tipo = id; r.sel = null; }, true) }, txt))),
      h('div.av-seguridad', { style: 'margin-top:10px' }, SEG_MEDIR.map(([id, txt]) => h('button.av-check' + (r.seg.includes(id) ? '.hecho' : ''),
        { type: 'button', disabled: listo, 'aria-pressed': String(r.seg.includes(id)), onclick: cambia(() => { r.seg = r.seg.includes(id) ? r.seg.filter(x => x !== id) : [...r.seg, id]; }) },
        h('span', r.seg.includes(id) ? '✓' : ''), txt))),
      h('p.av-nota', { style: 'margin:12px 0 6px' }, 'La punta negra ya está en COM. ¿Dónde va la roja?'),
      h('div.av-zonas', BORNES.map(([id, txt]) => h('button.chip' + (r.roja === id ? '.ok' : ''), { type: 'button', 'aria-pressed': String(r.roja === id), onclick: cambia(() => { r.roja = id; }, true) }, txt))),
      h('p.av-nota', { style: 'margin:8px 0 6px' }, 'Posición del selector:'),
      h('div.av-zonas', SELECTORES[r.tipo].map(([id, txt]) => h('button.chip' + (r.sel === id ? '.ok' : ''), { type: 'button', 'aria-pressed': String(r.sel === id), onclick: cambia(() => { r.sel = id; }, true) }, txt))),
      listo ? h('p.av-nota', { style: 'margin:6px 0 0' }, 'Polímetro preparado. Puedes cambiar el borne o el selector si lo necesitas.')
        : h('button.btn.azul', { type: 'button', disabled: !r.roja || !r.sel, onclick: cambia(() => { r.prep = { tipo: r.tipo, seguridad: r.seg.slice(), roja: r.roja, sel: r.sel }; }) }, 'Empezar a medir'),
      r.fusible ? h('button.btn.sec', { type: 'button', style: 'margin-top:10px', onclick: cambia(() => { r.fusible = false; lectura = ''; if (banco) banco.led.material.emissiveIntensity = e.apagado ? 0 : 1.6; }, true) }, 'Cambiar el fusible y volver a encender') : null);

    const fila = m => h('tr', h('td', LINEAS[m.id].color), h('td', LINEAS[m.id].nombre), h('td', m.carga ? 'Con carga' : e.apagado ? 'Apagado' : 'En reposo'), h('td.mono', es(m.v, m.dec) + ' V'),
      !juzgable(e, m.id) ? h('td', '—') : h('td', h('div.av-juicio', [[true, 'Bien'], [false, 'Fuera']].map(([val, txt]) =>
        h('button', { type: 'button', 'aria-pressed': String(m.juicio === val), onclick: () => { m.juicio = val; guardar(); pintarEquipo(); } }, txt)))));
    const med = h('div.tarjeta.av-paso' + (listo ? '' : '.bloqueado'), h('h3', '2 · Mide por detrás del conector'),
      e.conCarga ? h('div.variantes', { role: 'group', 'aria-label': 'Estado del equipo' }, [[false, 'En reposo'], [true, 'Con carga (trabajando a tope)']].map(([c, txt]) =>
        h('button', { type: 'button', 'aria-pressed': String(r.carga === c), disabled: !listo, onclick: cambia(() => { r.carga = c; }) }, txt))) : null,
      h('p.av-nota', { style: 'margin-top:10px' }, 'La punta negra va a un cable negro (masa). Toca en el 3D el cable que quieras medir con la roja, o elígelo aquí:'),
      h('div.av-zonas', ORDEN.map(id => h('button.chip' + (r.medidas.some(m => m.id === id && m.carga === (r.carga && e.conCarga)) ? '.ok' : ''), { type: 'button', disabled: !listo, onclick: () => tocar(id) }, LINEAS[id].color))),
      lectura ? h('p.mensaje', { role: 'status' }, lectura) : null,
      r.medidas.length ? h('p.av-nota', { style: 'margin:10px 0 0' }, 'Di de cada medida si está dentro de su margen o fuera.') : null,
      r.medidas.length ? h('table.av-tabla', h('thead', h('tr', h('th', 'Cable'), h('th', 'Línea'), h('th', 'Equipo'), h('th', 'Medida'), h('th', '¿En margen?'))), h('tbody', r.medidas.map(fila))) : null);

    const hay = r.medidas.length > 0;
    const lin = h('div.tarjeta.av-paso' + (hay ? '' : '.bloqueado'), h('h3', '3 · ¿Qué línea está fuera de su margen?'),
      h('div.av-zonas', RESPUESTAS_LINEA.map(([id, txt]) => h('button.chip' + (r.linea === id ? '.ok' : ''), { type: 'button', disabled: !hay, 'aria-pressed': String(r.linea === id), onclick: cambia(() => { r.linea = id; }) }, txt))));
    const diag = h('div.tarjeta.av-paso' + (hay ? '' : '.bloqueado'), h('h3', '4 · Diagnóstico'),
      h('div.av-opciones', e.causas.map(c => h('button.opcion' + (r.causa === c.id ? '.elegida' : ''), { type: 'button', disabled: !hay, 'aria-pressed': String(r.causa === c.id), onclick: cambia(() => { r.causa = c.id; }) }, c.texto))));
    return [ficha, prep, med, lin, diag];
  }

  // ---------- Pantalla del examen ----------
  function pintarPestanas() {
    pestanas.replaceChildren(h('div.variantes', { role: 'group', 'aria-label': 'Equipos del examen', style: 'margin:0 0 14px' },
      s.caso.equipos.map((e, i) => {
        const r = s.resp[i], marca = completo(e, r) ? ' ✓' : empezado(e, r) ? ' …' : '';
        return h('button', { type: 'button', 'aria-pressed': String(i === s.actual), onclick: () => { if (i === s.actual) return; s.actual = i; lectura = ''; guardar(); pintarPestanas(); montar3D(); pintarEquipo(); window.scrollTo({ top: raiz.offsetTop, behavior: 'smooth' }); } },
          `Equipo ${i + 1} · ${nombreTipo(e.tipo)}${marca}`);
      })));
  }
  function pintarEquipo() {
    const e = s.caso.equipos[s.actual], r = s.resp[s.actual];
    panel.replaceChildren(...(e.tipo === 'averia' ? panelAveria(e, r) : panelFuente(e, r)));
    pintarPestanas();
  }
  function pintarExamen() {
    rejilla.style.display = '';
    cab.replaceChildren(cabecera(h('div.fila', reloj, s.alumno ? h('span.chip', s.alumno) : null)));
    pie.replaceChildren(h('div.barra-acciones',
      h('span', { style: 'color:var(--tinta-2)' }, 'Puedes cambiar tus respuestas hasta que entregues.'),
      h('button.btn.azul', { type: 'button', onclick: confirmar }, 'Entregar el examen')));
    pintarPestanas(); montar3D(); pintarEquipo();
  }

  // ---------- Entrega ----------
  function confirmar() {
    const faltan = s.caso.equipos.map((e, i) => completo(e, s.resp[i]) ? null : `Equipo ${i + 1}`).filter(Boolean);
    const dlg = h('dialog',
      h('h2', '¿Entregar el examen?'),
      faltan.length ? h('p', h('b', 'Te faltan cosas en: '), faltan.join(', ') + '.') : h('p', 'Has completado los cuatro equipos.'),
      h('p', 'Después ya no podrás cambiar nada.'),
      h('div.fila', { style: 'justify-content:flex-end' },
        h('button.btn.sec', { type: 'button', onclick: () => dlg.close() }, 'Seguir con el examen'),
        h('button.btn.azul', { type: 'button', onclick: async ev => { ev.target.disabled = true; dlg.close(); await enviar(); } }, 'Entregar')));
    dlg.addEventListener('close', () => dlg.remove());
    document.body.append(dlg); dlg.showModal();
  }
  /** Lo que se envía: solo lo que ha hecho el alumno, sin los valores que ya conoce el servidor. */
  const respuesta = () => ({ equipos: s.caso.equipos.map((e, i) => {
    const r = s.resp[i];
    return e.tipo === 'averia'
      ? { fase: r.fase, abrir: r.abrir, revisadas: r.revisadas, causa: r.causa, solucion: r.solucion }
      : { prep: r.prep, medidas: r.medidas.map(m => ({ id: m.id, carga: m.carga, juicio: m.juicio })), cortos: r.cortos, linea: r.linea, causa: r.causa };
  }) });
  async function enviar(automatico) {
    if (enviando || !s) return;
    enviando = true;
    const espera = h('div.mensaje', { role: 'status' }, automatico ? 'Se ha acabado el tiempo: entregando lo que tienes…' : 'Enviando…');
    pie.append(espera);
    if (automatico) espera.scrollIntoView({ block: 'center' });
    try {
      const r = await llamar('examen-entregar', { codigo: s.codigo, casoId: s.casoId, respuesta: respuesta(), automatica: !!automatico }, ID_EXAMEN);
      const caso = s.caso;
      s = null; progreso.set(CLAVE, undefined);
      pintarResultado(r, caso);
    } catch (err) {
      enviando = false;
      espera.className = 'mensaje error';
      espera.textContent = err.message + ' Tus respuestas siguen guardadas en este navegador: vuelve a pulsar «Entregar el examen».';
    }
  }
  function pintarResultado(r, caso) {
    cancelAnimationFrame(raf);
    rejilla.style.display = 'none'; panel.replaceChildren(); pestanas.replaceChildren(); pie.replaceChildren(); reloj.hidden = true;
    const partes = [cabecera(), h('div.mensaje.ok', { style: 'margin-bottom:16px' }, 'Examen entregado. Ya está guardado en la hoja del profesor.')];
    if (r.nota !== undefined) {
      const tope = (v, d) => String(v ?? d).replace('.', ',');
      partes.push(h('div.tarjeta', { style: 'padding:22px' },
        h('span.etiqueta', 'Nota'), h('div.nota-grande', nota(r.nota), h('small', { style: 'font-size:28px;color:var(--tinta-2)' }, ' / 10')),
        h('div.bloques', (r.equipos || []).map((x, i) => h('div.tarjeta.bloque', h('small', `Equipo ${i + 1} · ${nombreTipo(x.tipo)}`), h('b', nota(x.nota) + ' / 10')))),
        (r.equipos || []).some(x => !x.resuelto) ? h('p.mensaje.error', { style: 'margin-top:14px' },
          `Sin arreglar o mal diagnosticado: ${(r.equipos || []).map((x, i) => x.resuelto ? null : 'equipo ' + (i + 1)).filter(Boolean).join(', ')}. ` +
          (r.topeNoResuelto === null ? '' : r.ambito === 'EXAMEN' ? `Por eso la nota del examen no pasa de ${tope(r.topeNoResuelto, 4)}.` : `La nota de esos equipos no pasa de ${tope(r.topeNoResuelto, 4)}.`)) : null,
        (r.equipos || []).some(x => x.grave) ? h('p.mensaje.error', { style: 'margin-top:10px' },
          `Has hecho algo grave en: ${(r.equipos || []).map((x, i) => x.grave ? 'equipo ' + (i + 1) : null).filter(Boolean).join(', ')} (abrir la caja sin prepararte o un cortocircuito con el polímetro). En un taller real es una falta grave.` +
          (r.topeGrave === null ? '' : r.ambito === 'EXAMEN' ? ` Por eso la nota del examen no pasa de ${tope(r.topeGrave, 4)}.` : ` La nota de esos equipos no pasa de ${tope(r.topeGrave, 4)}.`)) : null));
    }
    if (r.detalle) {
      const NOMBRES = { fase: 'Paso del arranque', seguridad: 'Seguridad antes de abrir', zona: 'Revisar donde estaba el fallo', causa: 'Qué estaba mal', solucion: 'Cómo se arregla',
        preparacion: 'Preparar el polímetro', medidas: 'Medir lo necesario', juicio: 'Decir si cada medida está en margen', linea: 'Línea fuera de margen' };
      r.detalle.forEach((d, i) => partes.push(h('section.categoria', h('h3', `Equipo ${i + 1} · ${nombreTipo(caso.equipos[i].tipo)}`),
        h('ul.detalle', Object.keys(d.maximos).map(k => h('li', { class: d.puntos[k] ? '' : 'ko' }, `${d.puntos[k] ? '✓' : '✗'} ${k === 'causa' && caso.equipos[i].tipo === 'fuente' ? 'Diagnóstico' : NOMBRES[k]}: ${nota(d.puntos[k])} / ${nota(d.maximos[k])}`))))));
    }
    partes.push(h('div.barra-acciones', h('a.btn.sec', { href: '#/' }, 'Volver al inicio'), h('span')));
    cab.replaceChildren(...partes);
    window.scrollTo(0, 0);
  }

  function pintar() { if (!s) pintarInicio(); else pintarExamen(); }

  return { el: raiz, montado() { pintar(); tic(); }, destruir() { cancelAnimationFrame(raf); clearInterval(intervalo); visor.destruir(); } };
}
