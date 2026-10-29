// piezas.js — Explorador de piezas en 3D.
import { h, tema, cargarJSON, BASE_CONTENIDO } from '../util.js';
import { huecoVisor } from './comun.js';
import { piezaSuelta } from '../piezas3d.js';
import { selectorTemas } from './inicio.js';

const VARIANTES = {
  placa: [['ATX', { formato: 'ATX' }], ['MicroATX', { formato: 'MicroATX' }], ['Mini-ITX', { formato: 'Mini-ITX' }]],
  refri: [['Torre', {}], ['Doble torre', { altura: 165 }], ['Perfil bajo', { altura: 47 }], ['De serie', { serie: true }], ['Líquida (bloque)', { tipo: 'liquida' }]],
  ram: [['DIMM DDR5', { formato: 'DIMM', gen: 'DDR5' }], ['DIMM DDR4', { formato: 'DIMM', gen: 'DDR4' }], ['SO-DIMM', { formato: 'SO-DIMM', gen: 'DDR5' }]],
  almac: [['M.2 y 2,5"', {}], ['M.2 2280', { formato: 'M.2 2280' }], ['2,5"', { formato: '2,5"' }]],
  gpu: [['Doble ventilador', { largo: 240 }], ['Perfil bajo', { largo: 170, pcie8: 0 }], ['Triple ventilador', { largo: 320, pcie8: 2 }]],
  fuente: [['ATX', { formato: 'ATX' }], ['SFX', { formato: 'SFX' }]],
  caja: [['ATX', { formato: 'ATX' }], ['MicroATX', { formato: 'MicroATX' }], ['Mini-ITX', { formato: 'Mini-ITX' }]],
  hdd: [['Cerrado', {}], ['Por dentro', { abierto: true }]],
  optica: [['Cerrada', {}], ['Bandeja abierta', { abierta: true }]],
  red: [['Wi‑Fi PCIe', { tipo: 'wifi' }], ['Ethernet PCIe', { tipo: 'ethernet' }]]
};

export async function vistaPiezas(temaId) {
  const t = await tema(temaId);
  const [info, modelos] = await Promise.all([cargarJSON(t.base + 'piezas.json'), cargarJSON(BASE_CONTENIDO + 'modelos.json').catch(() => ({}))]);
  let cat = t.piezas[0], variante = 0, descargado = -1; // descargado: índice del modelo realista que se ve, o -1 (esquema)
  const ficha = h('div.tarjeta.ficha');
  const lista = h('div.lista-piezas', { role: 'group', 'aria-label': 'Piezas' });
  const visor = huecoVisor({ alTocar: parte => mostrarParte(parte) });
  const parteBox = h('p', { 'aria-live': 'polite', style: 'margin:12px 0 0;font-size:16px' });

  function mostrarParte(parte) {
    const txt = parte && info[cat].partes[parte];
    parteBox.innerHTML = txt ? '<b>' + txt.replace(/:/, ':</b>') : '<span style="color:var(--tinta-2)">Toca una zona de la pieza para ver qué es.</span>';
    visor.rotulo(txt ? txt.split(':')[0] : '');
  }

  async function pintar() {
    lista.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.cat === cat ? 'true' : 'false'));
    const d = info[cat];
    const vars = VARIANTES[cat] || [];
    const glbs = [].concat(modelos[cat] || []);
    const glb = glbs[descargado];
    ficha.replaceChildren(...[
      h('span.etiqueta', 'Pieza'), h('h2', d.nombre),
      h('p', { style: 'margin:8px 0 0' }, d.resumen),
      vars.length && !glb ? h('div.variantes', { role: 'group', 'aria-label': 'Variantes' }, vars.map(([n], i) => h('button', { type: 'button', 'aria-pressed': i === variante ? 'true' : 'false', onclick: () => { variante = i; pintar(); } }, n))) : null,
      glbs.length ? h('div.variantes', { role: 'group', 'aria-label': 'Modelo' },
        h('button', { type: 'button', 'aria-pressed': glb ? 'false' : 'true', onclick: () => { descargado = -1; pintar(); } }, 'Esquema interactivo'),
        glbs.map((m, i) => h('button', { type: 'button', 'aria-pressed': i === descargado ? 'true' : 'false', onclick: () => { descargado = i; pintar(); } }, glbs.length > 1 ? 'Realista: ' + m.titulo : 'Modelo realista'))) : null,
      h('dl', h('dt', 'Dónde va'), h('dd', d.donde), h('dt', 'En la ficha técnica, fíjate en'), h('dd', d.fijate)),
      glb ? h('p', { style: 'font-size:14px;color:var(--tinta-2)' }, 'Modelo: ', glb.credito) : parteBox].filter(Boolean));
    mostrarParte(null);
    const v = visor.iniciar(); if (!v) return;
    if (glb) {
      try { await v.mostrarGLB(glb.archivo, { tamano: glb.tamano || 20, rotacion: glb.rotacion || [0, 0, 0] }); return; }
      catch (e) { console.error(e); descargado = -1; await pintar(); ficha.append(h('p.mensaje.error', 'No se ha podido cargar el modelo realista.')); return; }
    }
    v.mostrar(piezaSuelta(cat, (vars[variante] || [, {}])[1]));
  }

  t.piezas.forEach(c => lista.append(h('button', { type: 'button', 'data-cat': c, onclick: () => { cat = c; variante = 0; descargado = -1; pintar(); } }, info[c].nombre)));
  const selector = await selectorTemas(t.id, id => `#/${id}/piezas`);
  const el = h('div',
    selector,
    h('span.etiqueta', 'Tema ' + t.numero), h('h1', { style: 'margin-bottom:18px' }, t.numero === 1 ? 'Las piezas de un PC' : 'Piezas del tema ' + t.numero),
    h('div.piezas', lista, visor.el, ficha));
  return { el, montado: pintar, destruir() { visor.destruir(); } };
}
