// averia.js — Práctica «Este PC no arranca» (Tema 3). Se genera y corrige en el navegador: no cuenta para nota.
import { h, md, progreso } from '../util.js';
import { huecoVisor } from './comun.js';
import { montaje } from '../piezas3d.js';
import { FASES, ZONAS, zonaDeParte, crearCaso, corregir, informe } from '../practica/averias.js';

const CLAVE = 'averia:t3';
const minus = t => t.charAt(0).toLowerCase() + t.slice(1);
const LEDS = [['CPU', '#e5484d'], ['DRAM', '#ffd23f'], ['VGA', '#f4f1ea'], ['BOOT', '#3fbf6a']];
const SEGURIDAD = [
  ['apagar', 'Apagar y poner el interruptor de la fuente en 0'],
  ['desenchufar', 'Desenchufar y pulsar el botón unos segundos para descargar'],
  ['pulsera', 'Ponerme la pulsera antiestática'],
];

export function vistaAveria() {
  let caso, estado, anterior = null;
  const visor = huecoVisor({ pista: 'Arrastra para girar · rueda para acercar · toca una pieza para revisarla', alTocar: parte => revisar(parte) });
  const panel = h('div.av-panel');
  const el = h('section.averia',
    h('span.etiqueta', 'Práctica · Tema 3 · no cuenta para nota'), h('h1', 'Este PC no arranca'),
    h('p.lead', { style: 'color:var(--tinta-2);font-size:19px;max-width:66ch;margin:6px 0 18px' }, 'Un equipo recién montado que no funciona bien. Mira el síntoma, piensa en qué paso del arranque falla, prepárate con seguridad, revisa el equipo en 3D y di qué está mal montado.'),
    h('div.av-rejilla', h('div.av-visor', visor.el), panel));

  function nuevo() {
    caso = crearCaso(Math.floor(Math.random() * 2147483647), { excluir: anterior });
    anterior = caso.fallo.id;
    estado = { fase: null, seguridad: new Set(), seguridadAntes: null, revisadas: [], registro: [], causa: null, corregido: null, avisoSeguridad: false };
    const v = visor.iniciar();
    if (v) {
      const sel = { caja: { formatos: ['ATX'] }, placa: { formato: 'ATX' }, cpu: {}, refri: { altura: 155 }, ram: { formato: 'DIMM', gen: 'DDR5', modulos: 2 },
        almac: { formato: '2,5"' }, fuente: { formato: 'ATX' }, gpu: caso.conGpu ? { largo: 260, pcie8: 2 } : { ninguna: true } };
      v.mostrar(montaje(sel), { vista: 'frente' });
    }
    visor.rotulo('');
    pintar();
  }

  function revisar(parte) {
    if (!caso || estado.corregido) return;
    revisarZona(zonaDeParte(parte));
  }
  // También se puede elegir de la lista: se ilumina en el 3D dónde está
  function revisarZona(zona, desdeLista = false) {
    if (!zona) { visor.rotulo(''); return; }
    const z = ZONAS[zona];
    if (desdeLista && visor.visor) visor.visor.resaltar(z.partes[0]);
    visor.rotulo(z.nombre);
    if (estado.seguridad.size < SEGURIDAD.length) {
      // tocar dentro sin prepararse: aviso y cuenta como fallo de seguridad
      estado.avisoSeguridad = true;
      if (estado.seguridadAntes === null) estado.seguridadAntes = false;
      pintar();
      return;
    }
    if (estado.seguridadAntes === null) estado.seguridadAntes = true;
    let texto = z.bien, mal = false;
    if (zona === caso.fallo.zona) { texto = caso.fallo.mal; mal = true; }
    else if (zona === 'gpu' && !caso.conGpu) texto = z.sinGpu;
    if (!estado.revisadas.includes(zona)) { estado.revisadas.push(zona); estado.registro.push({ zona, texto, mal }); }
    pintar();
  }

  function pintar() {
    const f = caso.fallo;
    const leds = h('div.av-leds', LEDS.map(([n, c]) => h('span' + (f.led === n ? '.on' : ''), { style: `--led:${c}` }, h('i'), n)));
    const ficha = h('div.tarjeta.av-ficha',
      h('span.etiqueta', caso.equipo), h('h2', 'Lo que pasa'), h('p', f.sintoma),
      h('dl.av-datos',
        h('dt', 'Ventiladores'), h('dd', f.id === 'separador' ? 'Giran un segundo y se paran' : f.ventiladores ? 'Giran' : 'No giran'),
        h('dt', 'Pantalla'), h('dd', /Press|Reboot/.test(f.pantalla) ? h('code.av-pantalla', f.pantalla) : f.pantalla),
        h('dt', 'LED de la placa'), h('dd', leds),
        h('dt', 'Gráfica'), h('dd', caso.conGpu ? 'Tarjeta gráfica dedicada' : 'La del procesador (sin tarjeta)')));

    // 1. Fase
    const fase = h('div.tarjeta.av-paso', h('h3', '1 · ¿En qué paso del arranque falla?'),
      h('div.av-opciones', Object.entries(FASES).map(([id, txt]) => h('button.opcion' + (estado.fase === id ? (f.fase.includes(id) ? '.ok' : '.ko') : ''),
        { type: 'button', disabled: !!estado.fase || !!estado.corregido, onclick: () => { estado.fase = id; pintar(); } }, txt))),
      estado.fase ? h('p.explicacion', { html: (f.fase.includes(estado.fase) ? '<b>Bien.</b> ' : '<b>No es ese.</b> ') + md(explicaFase(f)) }) : null);

    // 2. Seguridad
    const seg = h('div.tarjeta.av-paso' + (estado.fase ? '' : '.bloqueado'), h('h3', '2 · Antes de abrir la caja'),
      h('div.av-seguridad', SEGURIDAD.map(([id, txt]) => h('button.av-check' + (estado.seguridad.has(id) ? '.hecho' : ''),
        { type: 'button', disabled: !estado.fase || estado.seguridad.has(id) || !!estado.corregido, onclick: () => { estado.seguridad.add(id); estado.avisoSeguridad = false; pintar(); } },
        h('span', estado.seguridad.has(id) ? '✓' : ''), txt))),
      estado.avisoSeguridad ? h('p.mensaje.error', '¡Alto! Antes de tocar nada dentro: apaga, interruptor en 0, desenchufa, descarga y ponte la pulsera.') : null);

    // 3. Revisar
    const listo = estado.seguridad.size === SEGURIDAD.length;
    const rev = h('div.tarjeta.av-paso' + (listo ? '' : '.bloqueado'), h('h3', '3 · Revisa el equipo'),
      h('p.av-nota', listo ? 'Toca en el 3D lo que quieras revisar (acerca con la rueda) o elígelo de la lista. Empieza por lo más sencillo y por lo que señalan el síntoma y los LED.' : 'Primero, el paso 2.'),
      h('div.av-zonas', Object.entries(ZONAS).map(([id, z]) => h('button.chip' + (estado.revisadas.includes(id) ? '.ok' : ''), { type: 'button', disabled: !!estado.corregido, onclick: () => revisarZona(id, true) }, z.nombre))),
      estado.registro.length ? h('ol.av-registro', estado.registro.map(r => h('li' + (r.mal ? '.mal' : ''), h('b', ZONAS[r.zona].nombre + ': '), r.texto))) : null);

    // 4. Diagnóstico
    const diag = h('div.tarjeta.av-paso' + (estado.registro.length ? '' : '.bloqueado'), h('h3', '4 · ¿Qué está mal?'),
      h('div.av-opciones', caso.causas.map(c => h('button.opcion' + (estado.causa === c.id ? '.elegida' : '') + (estado.corregido ? (c.id === f.id ? '.ok' : estado.causa === c.id ? '.ko' : '') : ''),
        { type: 'button', disabled: !estado.registro.length || !!estado.corregido, onclick: () => { estado.causa = c.id; pintar(); } }, c.texto))),
      !estado.corregido ? h('button.btn.azul', { type: 'button', disabled: !estado.causa, onclick: () => comprobar() }, 'Comprobar') : null);

    const partes = [ficha, fase, seg, rev, diag];
    if (estado.corregido) partes.push(resultado());
    panel.replaceChildren(...partes);
  }

  function explicaFase(f) {
    const txt = {
      fuente: 'Si **no pasa nada** (o se enciende y se apaga enseguida), la fuente no llega a arrancar o se corta: enchufe, interruptor, 24 pines, POWER SW o un cortocircuito.',
      post: 'Si **los ventiladores giran** pero no hay imagen, o sale un aviso al arrancar, el fallo está en el **POST**: memoria, EPS, gráfica, monitor o ventilador del procesador.',
      arranque: 'Si pasa el POST pero dice que **no encuentra con qué arrancar**, el fallo está en la búsqueda del arranque: disco, orden de arranque o sistema.',
      reposo: 'Si **funciona** pero pierde la fecha y la hora al desenchufarlo, el fallo está en lo que guarda la placa en **reposo**: la pila.',
    };
    return f.fase.map(x => txt[x]).join(' ');
  }

  function comprobar() {
    estado.corregido = corregir(caso, { fase: estado.fase, seguridadAntes: !!estado.seguridadAntes, revisadas: estado.revisadas, causa: estado.causa });
    progreso.anotarPractica({ tema: 'tema3', tipo: CLAVE, nota: estado.corregido.nota });
    const v = visor.visor;
    if (v) v.resaltar(ZONAS[caso.fallo.zona].partes[0]);
    visor.rotulo('Aquí estaba el fallo: ' + ZONAS[caso.fallo.zona].nombre);
    pintar();
  }

  function resultado() {
    const r = estado.corregido, p = r.puntos, f = caso.fallo;
    const fila = (ok, txt) => h('li' + (ok ? '.ok' : '.ko'), ok ? '✓ ' : '✗ ', txt);
    return h('div.tarjeta.av-resultado',
      h('h3', `Resultado: ${r.nota.toLocaleString('es-ES')} / 10`),
      h('ul.av-puntos',
        fila(p.fase, p.fase ? 'Has acertado en qué paso del arranque falla.' : 'El paso del arranque no era ese: ' + f.fase.map(x => FASES[x]).join(' o ') + '.'),
        fila(p.seguridad, p.seguridad ? 'Te has preparado con seguridad antes de tocar nada.' : 'Has intentado tocar dentro sin apagar, desenchufar y ponerte la pulsera.'),
        fila(p.zona, p.zona ? 'Has revisado donde estaba el fallo.' : 'No has revisado: ' + minus(ZONAS[f.zona].nombre) + '.'),
        fila(p.causa, p.causa ? 'Diagnóstico correcto.' : 'El fallo era: ' + minus(f.causa) + '.')),
      h('p', h('b', 'Solución: '), f.solucion),
      h('p', h('b', 'En el informe de montaje: '), h('i', informe(caso))),
      h('p.av-nota', `Has revisado ${estado.revisadas.length} ${estado.revisadas.length === 1 ? 'zona' : 'zonas'}. Un técnico empieza por lo más sencillo y por lo que señalan el síntoma y los LED.`),
      h('button.btn.azul', { type: 'button', onclick: () => { nuevo(); el.scrollIntoView({ behavior: 'smooth' }); } }, 'Otro equipo'));
  }

  return { el, montado() { nuevo(); }, destruir() { visor.destruir(); } };
}
