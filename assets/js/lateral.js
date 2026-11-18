// lateral.js — Menú lateral: los temas (plegables, con sus lecciones), las herramientas y la evaluación.
// Se construye una vez y en cada cambio de página solo se actualizan las marcas y el tema abierto.
import { h, curso, tema, progreso } from './util.js';

const CLAVE_PLEGADO = 'taller-montaje:lateral';
const CLAVE_TEMA = 'taller-montaje:tema';
const ANCHO_FIJO = '(min-width: 1280px)';
const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const escribir = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };

const HERRAMIENTAS = [
  { href: '#/tema1/piezas', texto: 'Piezas en 3D', es: r => /\/piezas$/.test(r) },
  { href: '#/tema1/animado', texto: 'Montaje animado', es: r => /\/animado$/.test(r) },
  { href: '#/pordentro', texto: 'Por dentro', es: r => r.startsWith('pordentro') }
];
const EVALUACION = [
  { href: '#/practicas', texto: 'Prácticas', es: r => r === 'practicas' || /\/practica$/.test(r) || /\/reto\/\d+$/.test(r) },
  { href: '#/examenes', texto: 'Exámenes', es: r => r === 'examenes' || /\/examen$/.test(r) }
];

export async function crearLateral(aside, boton) {
  const c = await curso();
  const temas = await Promise.all(c.temas.map(x => tema(x.id)));
  const fijo = window.matchMedia(ANCHO_FIJO);
  const enlaces = []; // { a, es(ruta) }
  const enlace = (href, contenido, es) => { const a = h('a', { href }, contenido); enlaces.push({ a, es }); return a; };

  const bloques = temas.map(t => {
    const cuenta = h('span.cuenta');
    const items = t.lecciones.map((l, i) => {
      const marca = h('span.marca-l', { 'aria-hidden': 'true' });
      const a = enlace(`#/${t.id}/leccion/${l.id}`, [marca, h('span', l.titulo)], r => r === `${t.id}/leccion/${l.id}`);
      return { l, a, marca, li: h('li', a) };
    });
    const todas = enlace(`#/${t.id}`, 'Ver el tema', r => r === t.id);
    todas.classList.add('ver-tema');
    const det = h('details.lat-tema',
      h('summary', h('span.lat-n', 'Tema ' + t.numero), h('span.lat-t', t.titulo), cuenta),
      h('ul', h('li', todas), items.map(x => x.li)));
    return { t, det, cuenta, items };
  });

  const grupo = (titulo, lista) => h('div.lat-grupo', h('p.lat-rotulo', titulo),
    h('ul', lista.map(x => h('li', enlace(x.href, x.texto, x.es)))));

  aside.replaceChildren(
    h('ul.lat-inicio', h('li', enlace('#/', 'Inicio', r => r === ''))),
    h('div.lat-grupo', h('p.lat-rotulo', 'Temas'), bloques.map(b => b.det)),
    grupo('Herramientas', HERRAMIENTAS),
    grupo('Evaluación', EVALUACION));

  // --- Plegar y desplegar ---
  const velo = h('div.lat-velo', { hidden: true });
  aside.after(velo);
  let abiertoMovil = false, ocultoPorExamen = false;
  const plegado = () => leer(CLAVE_PLEGADO) === '1';
  function pintar() {
    const visible = fijo.matches ? !plegado() && !ocultoPorExamen : abiertoMovil;
    document.body.classList.toggle('con-lateral', fijo.matches && visible);
    aside.classList.toggle('abierto', !fijo.matches && visible);
    aside.toggleAttribute('inert', !visible);
    velo.hidden = fijo.matches || !visible;
    boton.setAttribute('aria-expanded', String(visible));
    boton.setAttribute('aria-label', visible ? 'Ocultar el menú' : 'Mostrar el menú');
  }
  boton.addEventListener('click', () => {
    if (fijo.matches) {
      if (ocultoPorExamen) { ocultoPorExamen = false; escribir(CLAVE_PLEGADO, '0'); }
      else escribir(CLAVE_PLEGADO, plegado() ? '0' : '1');
    } else abiertoMovil = !abiertoMovil;
    pintar();
  });
  velo.addEventListener('click', () => { abiertoMovil = false; pintar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && abiertoMovil) { abiertoMovil = false; pintar(); boton.focus(); } });
  fijo.addEventListener('change', () => { abiertoMovil = false; pintar(); });

  // --- En cada cambio de página ---
  let temaAbierto = null;
  function actualizar(ruta) {
    for (const b of bloques) {
      b.cuenta.textContent = `${progreso.completadas(b.t.id, b.t.lecciones)}/${b.t.lecciones.length}`;
      for (const x of b.items) {
        const p = progreso.leccion(b.t.id, x.l.id);
        x.marca.textContent = p.completa ? '✓' : '';
        x.marca.className = 'marca-l' + (p.completa ? ' ok' : p.vista ? ' vista' : '');
        x.a.title = p.completa ? 'Completada' : p.vista ? 'Empezada' : '';
      }
    }
    for (const { a, es } of enlaces) { if (es(ruta)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
    // Tema abierto: el de la página en la que estás; si la página no es de ningún tema, el último que visitaste.
    const deRuta = (ruta.match(/^(tema\d+)(?:$|\/leccion\/)/) || [])[1];
    if (deRuta) escribir(CLAVE_TEMA, deRuta);
    const quiero = deRuta || temaAbierto || leer(CLAVE_TEMA) || temas[0].id;
    if (quiero !== temaAbierto) {
      temaAbierto = bloques.some(b => b.t.id === quiero) ? quiero : temas[0].id;
      for (const b of bloques) b.det.open = b.t.id === temaAbierto;
    }
    // En un examen el menú se recoge para dejar todo el ancho; el botón lo vuelve a sacar.
    ocultoPorExamen = /\/examen$/.test(ruta);
    abiertoMovil = false;
    pintar();
  }
  return { actualizar };
}
