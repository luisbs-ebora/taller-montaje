// medir.js — Práctica «¿Está bien la fuente?» (Tema 4). Se genera y corrige en el navegador: no cuenta para nota.
import { h, progreso } from '../util.js';
import { huecoVisor, informeAlumno, informeCompleto, informeComparado } from './comun.js';
import { bancoMedida } from '../modelos-t4.js';
import { LINEAS, ORDEN, RESPUESTAS_LINEA, SELECTORES, AVISOS, crearCaso, medir, configCorrecta, enMargen, corregir, juzgable, informeReferencia } from '../practica/medidas.js';

const CLAVE = 'medir:t4';
const es = (v, d = 2) => v.toFixed(d).replace('.', ',').replace('-', '−');
const SEGURIDAD = [['pulsera', 'Pulsera antiestática puesta'], ['puntas', 'Puntas revisadas: el aislante no está roto']];
const BORNES = [['v', 'VΩ'], ['ma', 'mA'], ['a10', '10 A']];

export function vistaMedir() {
  let caso, estado, anterior = null, banco = null, raf = 0;
  let tipo = 'manual';
  try { if (localStorage.getItem('polimetro:tipo') === 'auto') tipo = 'auto'; } catch (e) {}
  const visor = huecoVisor({ pista: 'Arrastra para girar · rueda para acercar · toca un cable del conector para medirlo', alTocar: parte => { if (parte && /^c/.test(parte) && LINEAS[parte.slice(1)]) tocar(parte.slice(1)); } });
  const panel = h('div.av-panel');
  const el = h('section.averia',
    h('span.etiqueta', 'Práctica · Tema 4 · no cuenta para nota'), h('h1', '¿Está bien la fuente?'),
    h('p.lead', { style: 'color:var(--tinta-2);font-size:19px;max-width:66ch;margin:6px 0 18px' }, 'Te traen un equipo con un problema. Prepara el polímetro, mide por detrás del conector de 24 pines, compara cada valor con su margen y decide si la culpa es de la fuente.'),
    h('div.av-rejilla', h('div.av-visor', visor.el), panel));

  function nuevo() {
    caso = crearCaso(Math.floor(Math.random() * 2147483647), { excluir: anterior });
    anterior = caso.def.id;
    estado = { seguridad: new Set(), roja: null, sel: null, carga: false, medidas: [], preparacion: null, aviso: '', linea: null, causa: null, corregido: null, fusible: false, informe: {} };
    const v = visor.iniciar();
    if (v) {
      if (!banco) {
        banco = bancoMedida(); v.mostrar(banco.grupo, { vista: 'arriba' });
        // encuadre cerrado: el polímetro y el conector, que es donde se trabaja
        v.camara.position.set(-2, 37, 31); v.controles.target.set(-2, 1.5, 5); v.controles.update();
      }
      banco.usar(tipo); banco.reposo();
      banco.led.material.emissiveIntensity = caso.def.apagado ? 0 : 1.6;
      v.resaltar(null);
    }
    visor.rotulo('');
    pintar();
  }

  // Mueve una punta hasta un cable con una animación corta
  function llevar(p, hilo, alLlegar) {
    cancelAnimationFrame(raf);
    const t0 = p.tip.clone(), d0 = p.dir.clone(), t1 = banco.sonda(hilo), d1 = p === banco.roja ? banco.DIR_ROJA : banco.DIR_NEGRA, ini = performance.now();
    const paso = ahora => {
      const t = Math.min(1, (ahora - ini) / 420), e = t * t * (3 - 2 * t);
      p.tip.lerpVectors(t0, t1, e); p.tip.y += Math.sin(Math.PI * e) * 4; p.dir.lerpVectors(d0, d1, e).normalize();
      banco.colocar(p);
      if (t < 1) raf = requestAnimationFrame(paso); else if (alLlegar) alLlegar();
    };
    raf = requestAnimationFrame(paso);
  }
  function ponerPolimetro() {
    if (!banco) return;
    const p = banco.usar(tipo);
    banco.roja.clavija.position.copy(banco.borne(estado.roja || 'v')); banco.negra.clavija.position.copy(banco.borne('com'));
    p.girarA(estado.sel || 'off');
    p.lcd.pintar(estado.sel ? { texto: estado.sel === 'ohm' ? '1   .' : '0.00', unidad: estado.sel === 'ohm' ? 'Ω' : estado.sel === 'a10' ? 'A' : 'V', cc: estado.sel === 'vca' ? false : estado.sel === 'ohm' ? null : true, aviso: tipo === 'auto' ? 'AUTO' : '' } : { apagada: true });
    banco.colocar(banco.roja); banco.colocar(banco.negra);
  }

  function tocar(id) {
    if (!caso || estado.corregido) return;
    const listo = estado.seguridad.size === SEGURIDAD.length && estado.roja && estado.sel;
    if (!listo) { estado.aviso = 'Antes de medir: las dos comprobaciones de seguridad, la punta roja en su borne y el selector en su posición.'; if (estado.preparacion === null && estado.roja && estado.sel) estado.preparacion = false; pintar(); return; }
    if (estado.fusible) { estado.aviso = 'El fusible del polímetro ha saltado. Pulsa «Cambiar el fusible» y coloca bien la punta roja.'; pintar(); return; }
    const cfg = { roja: estado.roja, sel: estado.sel };
    if (estado.preparacion === null) estado.preparacion = configCorrecta(tipo, cfg);
    const r = medir(caso, tipo, cfg, id, estado.carga);
    const hilo = banco && banco.hilo(id, id === '5' ? 1 : 0);
    if (banco) {
      banco.tocar(banco.negra, banco.hiloGnd); banco.colocar(banco.negra);
      if (visor.visor) visor.visor.resaltar('c' + id);
      llevar(banco.roja, hilo, () => {
        banco.poli.lcd.pintar({ texto: r.texto, unidad: r.unidad, cc: r.cc, aviso: tipo === 'auto' ? 'AUTO' : '' });
        if (r.evento === 'corto') banco.led.material.emissiveIntensity = 0;
      });
    }
    visor.rotulo(`${LINEAS[id].color}: ${LINEAS[id].nombre}`);
    if (r.evento) {
      estado.aviso = AVISOS[r.evento];
      if (r.evento === 'corto') { estado.fusible = true; estado.preparacion = false; }
    } else {
      estado.aviso = r.pocaPrecision ? 'Con el rango de 200 mide, pero pierdes un decimal. Para estas tensiones, mejor el de 20.' : '';
      const i = estado.medidas.findIndex(m => m.id === id && m.carga === estado.carga);
      const m = { id, carga: estado.carga, v: r.valor, dec: r.pocaPrecision ? 1 : 2 };
      if (i >= 0) estado.medidas[i] = m; else estado.medidas.push(m);
    }
    pintar();
  }

  function pintar() {
    const d = caso.def, fin = !!estado.corregido;
    const ficha = h('div.tarjeta.av-ficha',
      h('span.etiqueta', caso.equipo), h('h2', 'Lo que pasa'), h('p', d.sintoma),
      h('dl.av-datos',
        h('dt', 'Equipo'), h('dd', d.apagado ? 'Apagado (no enciende), enchufado y con la fuente en I' : 'Encendido, con la caja abierta'),
        h('dt', 'Fuente'), h('dd', 'ATX de 450 W')));

    // 1. Preparar
    const prep = h('div.tarjeta.av-paso', h('h3', '1 · Prepara el polímetro'),
      h('div.variantes', { role: 'group', 'aria-label': 'Tipo de polímetro' }, [['manual', 'Rango manual'], ['auto', 'Autorango']].map(([id, txt]) =>
        h('button', { type: 'button', 'aria-pressed': String(tipo === id), disabled: fin || estado.medidas.length > 0, onclick: () => { tipo = id; try { localStorage.setItem('polimetro:tipo', id); } catch (e) {} estado.sel = null; ponerPolimetro(); pintar(); } }, txt))),
      h('div.av-seguridad', { style: 'margin-top:10px' }, SEGURIDAD.map(([id, txt]) => h('button.av-check' + (estado.seguridad.has(id) ? '.hecho' : ''),
        { type: 'button', disabled: estado.seguridad.has(id) || fin, onclick: () => { estado.seguridad.add(id); estado.aviso = ''; pintar(); } }, h('span', estado.seguridad.has(id) ? '✓' : ''), txt))),
      h('p.av-nota', { style: 'margin:12px 0 6px' }, 'La punta negra ya está en COM. ¿Dónde va la roja?'),
      h('div.av-zonas', BORNES.map(([id, txt]) => h('button.chip' + (estado.roja === id ? '.ok' : ''), { type: 'button', disabled: fin, onclick: () => { estado.roja = id; estado.aviso = ''; ponerPolimetro(); pintar(); } }, txt))),
      h('p.av-nota', { style: 'margin:8px 0 6px' }, 'Posición del selector:'),
      h('div.av-zonas', SELECTORES[tipo].map(([id, txt]) => h('button.chip' + (estado.sel === id ? '.ok' : ''), { type: 'button', disabled: fin, onclick: () => { estado.sel = id; estado.aviso = ''; ponerPolimetro(); pintar(); } }, txt))),
      estado.fusible ? h('button.btn.sec', { type: 'button', onclick: () => { estado.fusible = false; estado.aviso = ''; if (banco) banco.led.material.emissiveIntensity = caso.def.apagado ? 0 : 1.6; pintar(); } }, 'Cambiar el fusible y volver a encender') : null);

    // 2. Medir
    const listo = estado.seguridad.size === SEGURIDAD.length && estado.roja && estado.sel;
    const fila = m => {
      const ok = enMargen(m.id, m.v), juz = juzgable(caso, m.id);
      const juicio = !juz ? h('td', '—') : h('td', h('div.av-juicio', [[true, 'Bien'], [false, 'Fuera']].map(([val, txt]) =>
        h('button' + (fin && m.juicio === val ? (val === ok ? '.ok' : '.ko') : ''), { type: 'button', 'aria-pressed': String(m.juicio === val), disabled: fin, onclick: () => { m.juicio = val; pintar(); } }, txt))));
      return h('tr', h('td', LINEAS[m.id].color), h('td', LINEAS[m.id].nombre), h('td', m.carga ? 'Con carga' : d.apagado ? 'Apagado' : 'En reposo'), h('td.mono', es(m.v, m.dec) + ' V'), juicio,
        fin ? h('td' + (ok ? '.ok' : '.ko'), !juz ? '—' : ok ? '✓ en margen' : '✗ fuera') : null);
    };
    const med = h('div.tarjeta.av-paso' + (listo ? '' : '.bloqueado'), h('h3', '2 · Mide por detrás del conector'),
      caso.conCarga ? h('div.variantes', { role: 'group', 'aria-label': 'Estado del equipo' }, [[false, 'En reposo'], [true, 'Con carga (un juego abierto)']].map(([c, txt]) =>
        h('button', { type: 'button', 'aria-pressed': String(estado.carga === c), disabled: fin, onclick: () => { estado.carga = c; pintar(); } }, txt))) : null,
      h('p.av-nota', { style: 'margin-top:10px' }, 'La punta negra va a un cable negro (masa). Toca en el 3D el cable que quieras medir con la roja, o elígelo aquí:'),
      h('div.av-zonas', ORDEN.map(id => h('button.chip' + (estado.medidas.some(m => m.id === id && m.carga === estado.carga) ? '.ok' : ''), { type: 'button', disabled: fin, onclick: () => tocar(id) }, LINEAS[id].color))),
      estado.aviso ? h('p.mensaje.error', estado.aviso) : null,
      estado.medidas.length ? h('p.av-nota', { style: 'margin:10px 0 0' }, 'Di de cada medida si está dentro de su margen (±5 %) o fuera.') : null,
      estado.medidas.length ? h('table.av-tabla', h('thead', h('tr', h('th', 'Cable'), h('th', 'Línea'), h('th', 'Equipo'), h('th', 'Medida'), h('th', '¿En margen?'), fin ? h('th', 'Era') : null)), h('tbody', estado.medidas.map(fila))) : null);

    // 3. Línea
    const hay = estado.medidas.length > 0;
    const lin = h('div.tarjeta.av-paso' + (hay ? '' : '.bloqueado'), h('h3', '3 · ¿Qué línea está fuera de su margen?'),
      h('div.av-zonas', RESPUESTAS_LINEA.map(([id, txt]) => h('button.chip' + (estado.linea === id ? '.ok' : ''), { type: 'button', disabled: !hay || fin, onclick: () => { estado.linea = id; pintar(); } }, txt))));

    // 4. Diagnóstico
    const diag = h('div.tarjeta.av-paso' + (hay ? '' : '.bloqueado'), h('h3', '4 · Diagnóstico'),
      h('div.av-opciones', caso.causas.map(c => h('button.opcion' + (estado.causa === c.id ? '.elegida' : '') + (fin ? (c.id === d.id ? '.ok' : estado.causa === c.id ? '.ko' : '') : ''),
        { type: 'button', disabled: !hay || fin, onclick: () => { estado.causa = c.id; pintar(); } }, c.texto))),
      );

    // 5. Informe
    const listoInforme = () => !!estado.causa && !!estado.linea && informeCompleto(estado.informe);
    const bComprobar = h('button.btn.azul', { type: 'button', disabled: !listoInforme(), onclick: comprobar }, 'Comprobar');
    const inf = h('div.tarjeta.av-paso' + (hay ? '' : '.bloqueado'), h('h3', '5 · Escribe el informe'),
      h('p.av-nota', 'Como en el taller: lo que no se apunta, no se ha hecho. Escribe las medidas con su valor.'),
      informeAlumno(estado.informe, { bloqueado: !hay || fin, alCambiar: () => { bComprobar.disabled = !listoInforme(); } }),
      !fin ? bComprobar : null);

    const partes = [ficha, prep, med, lin, diag, inf];
    if (fin) partes.push(resultado());
    panel.replaceChildren(...partes);
  }

  function comprobar() {
    estado.corregido = corregir(caso, { preparacion: estado.preparacion === true, medidas: estado.medidas, linea: estado.linea, causa: estado.causa });
    progreso.anotarPractica({ tema: 'tema4', tipo: CLAVE, nota: estado.corregido.nota });
    pintar();
  }

  function resultado() {
    const r = estado.corregido, p = r.puntos, d = caso.def;
    const fila = (ok, txt) => h('li' + (ok ? '.ok' : '.ko'), ok ? '✓ ' : '✗ ', txt);
    const falta = d.clave.map(([id, c]) => LINEAS[id].color.toLowerCase() + (c && caso.conCarga ? ' con carga' : '')).join(', ');
    const buena = RESPUESTAS_LINEA.find(([id]) => id === d.fuera)[1];
    return h('div.tarjeta.av-resultado',
      h('h3', `Resultado: ${r.nota.toLocaleString('es-ES')} / 10`),
      h('ul.av-puntos',
        fila(p.preparacion, p.preparacion ? 'Polímetro bien preparado a la primera.' : `La preparación correcta era: roja en VΩ y selector en tensión continua${tipo === 'auto' ? '' : ', rango 20'}, con las comprobaciones de seguridad hechas.`),
        fila(p.medidas, p.medidas ? 'Has medido lo que hacía falta para este síntoma.' : 'Te faltaba medir: ' + falta + '.'),
        fila(p.juicio, p.juicio ? 'Has dicho bien de cada medida si estaba en margen.' : 'Alguna medida no la has valorado bien (o la has dejado sin valorar): mira la columna «Era».'),
        fila(p.linea, p.linea ? 'Has acertado la línea.' : 'La respuesta era: ' + buena + '.'),
        fila(p.causa, p.causa ? 'Diagnóstico correcto.' : 'El diagnóstico era: ' + d.causa.charAt(0).toLowerCase() + d.causa.slice(1) + '.')),
      h('p', h('b', 'Qué se hace: '), d.solucion),
      informeComparado(estado.informe, informeReferencia(caso)),
      h('p.av-nota', 'Márgenes (±5 %): +12 V de 11,40 a 12,60 · +5 V y 5VSB de 4,75 a 5,25 · +3,3 V de 3,14 a 3,47 · PWR_OK, unos 5 V · −12 V de −10,8 a −13,2 (±10 %).'),
      h('p.av-nota', 'En el taller: la fuente no se abre nunca, no se prueban fuentes sueltas con un clip y las medidas de 230 V solo las hace el profesor.'),
      h('button.btn.azul', { type: 'button', onclick: () => { nuevo(); el.scrollIntoView({ behavior: 'smooth' }); } }, 'Otro equipo'));
  }

  return { el, montado() { nuevo(); }, destruir() { cancelAnimationFrame(raf); visor.destruir(); } };
}
