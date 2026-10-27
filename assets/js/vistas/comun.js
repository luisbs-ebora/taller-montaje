// comun.js — piezas de interfaz compartidas por las vistas.
import { h } from '../util.js';
import { Visor, webglDisponible } from '../visor3d.js';

/** Crea un hueco de visor 3D. Devuelve { el, visor (o null), rotulo(texto) }. */
export function huecoVisor({ autoRotar = false, pista = 'Arrastra para girar · rueda o pellizca para acercar · toca una zona para ver su nombre', alTocar } = {}) {
  const rot = h('div.rotulo', { role: 'status', 'aria-live': 'polite' });
  const el = h('div.visor', rot, h('div.pista', pista));
  const r = { el, visor: null, rotulo: t => { rot.textContent = t || ''; } };
  r.iniciar = () => {
    if (r.visor) return r.visor;
    if (!webglDisponible()) { el.append(h('p.aviso', { style: 'padding:20px' }, 'Este navegador no puede mostrar 3D (WebGL desactivado). El resto de la página funciona igual.')); return null; }
    r.visor = new Visor(el, { autoRotar, alTocar });
    return r.visor;
  };
  r.destruir = () => { if (r.visor) r.visor.destruir(); r.visor = null; };
  return r;
}

export function precio(n) { return n.toLocaleString('es-ES') + ' €'; }

/** Características de una pieza del catálogo para mostrarlas en una tarjeta. */
export function caracteristicas(p) {
  const s = [];
  const si = v => v ? 'Sí' : 'No';
  switch (p.cat) {
    case 'cpu': s.push(['Socket', p.socket], ['Memoria', p.ram.join(' / ')], ['Núcleos / hilos', p.nucleos + ' / ' + p.hilos],
      ['Frecuencia', p.base.toLocaleString('es-ES') + ' – ' + p.turbo.toLocaleString('es-ES') + ' GHz'], ['TDP', p.tdp + ' W'],
      ['Gráficos integrados', si(p.graficos)], ['Disipador de serie', si(p.disipadorSerie)]); break;
    case 'placa': s.push(['Formato', p.formato], ['Socket', p.socket], ['Chipset', p.chipset], ['Memoria', p.ranurasRam + ' × ' + p.ram + ' (máx. ' + p.ramMax + ' GB)'],
      ['M.2', p.m2.map(m => m.tipo.join('/')).join(' · ')], ['SATA', p.sata + ' puertos'], ['Salidas de vídeo', p.video.length ? p.video.join(', ') : 'Ninguna']); break;
    case 'ram': s.push(['Generación', p.gen], ['Formato', p.formato], ['Módulos', p.modulos + ' × ' + p.gbModulo + ' GB'], ['Velocidad', p.velocidad + ' MT/s'], ['Latencia', 'CL' + p.cl]); break;
    case 'almac': s.push(['Tipo', p.tipo], ['Formato', p.formato], ['Capacidad', p.gb >= 1000 ? (p.gb / 1000) + ' TB' : p.gb + ' GB']); break;
    case 'gpu': if (p.ninguna) s.push(['Imagen', 'Gráficos integrados del procesador']);
      else s.push(['Memoria de vídeo', p.vram + ' GB'], ['Longitud', p.largo + ' mm'], ['Conectores de corriente', p.pcie8 ? p.pcie8 + ' × PCIe 8 pines' : 'No lleva'], ['Fuente recomendada', p.fuenteRec + ' W']); break;
    case 'refri': if (p.serie) s.push(['Tipo', 'El que viene en la caja del procesador'], ['Pasta térmica', 'Ya aplicada']);
      else s.push(['Tipo', p.tipo === 'liquida' ? 'Líquida (AIO)' : 'Aire'], ['Sockets', p.sockets.join(', ')], ['TDP máximo', p.tdpMax + ' W'],
        [p.radiador ? 'Radiador' : 'Altura', p.radiador ? p.radiador + ' mm' : p.altura + ' mm'], ['Pasta térmica', p.pastaPuesta ? 'Ya aplicada' : 'Hay que ponerla']); break;
    case 'caja': s.push(['Placas', p.formatos.join(', ')], ['Gráfica máx.', p.gpuMax + ' mm'], ['Disipador máx.', p.refriMax + ' mm'],
      ['Radiador 240 mm', si(p.radiador240)], ['Fuente', p.fuente], ['Bahías 2,5"', p.bahias25]); break;
    case 'fuente': s.push(['Potencia', p.w + ' W'], ['Certificación', p.cert], ['Formato', p.formato], ['Conectores PCIe 8 pines', p.pcie8]); break;
  }
  return s;
}
