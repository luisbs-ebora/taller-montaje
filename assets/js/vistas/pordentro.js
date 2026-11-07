// pordentro.js — «Por dentro»: abre una pieza, mira qué hay dentro y cambia algo para ver qué pasa.
// Cada pieza (assets/js/pordentro/*.js) construye su escena y sus modos; esta vista pone la mesa, la cámara,
// los botones, los nombres de las partes, los bocadillos y el medidor.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { h } from '../util.js';
import { animar, esperar, ease, actualizarAnimaciones, cancelarAnimaciones, velocidad } from '../animado/anim.js';
import { kit, nuevaTinta, TINTA } from '../animado/toon.js';
import pasta from '../pordentro/pasta.js';
import refrigeracion from '../pordentro/refrigeracion.js';
import fuente from '../pordentro/fuente.js';
import disco from '../pordentro/disco.js';

export const PIEZAS = [pasta, refrigeracion, fuente, disco];

export async function vistaPorDentro(idPieza) {
  const def = PIEZAS.find(p => p.id === idPieza) || PIEZAS[0];

  /* ---------- Interfaz ---------- */
  const lienzo = h('canvas.am-lienzo', { 'aria-label': `${def.titulo} en 3D. Usa los botones para cambiar lo que pasa.` });
  const capaEtiquetas = h('div.pd-etiquetas');
  const capaBurbujas = h('div.am-burbujas');
  const sin3d = h('div.am-sin3d', { hidden: true }, h('p', 'Este navegador no puede mostrar gráficos 3D (WebGL). Prueba con otro navegador o actualízalo.'));
  const medidorEl = h('div.pd-medidor', { hidden: true });
  const mNombre = h('span.pd-m-nombre'), mValor = h('b.pd-m-valor'), mBarra = h('i'), mEstado = h('span.pd-m-estado');
  medidorEl.append(mNombre, h('div.pd-m-tubo', mBarra), mValor, mEstado);
  const pista = h('p.am-pista', 'Arrastra para girar · rueda para acercar');
  const escenaEl = h('div.am-escena.pd-escena', lienzo, capaEtiquetas, capaBurbujas, medidorEl, pista, sin3d);

  const modosEl = h('div.pd-modos', { role: 'group', 'aria-label': 'Qué quieres ver' });
  const mTitulo = h('h2'), mTexto = h('p');
  const bNombres = h('button.am-btn', { type: 'button', 'aria-pressed': 'true' }, 'Nombres: sí');
  const bVista = h('button.am-btn', { type: 'button' }, 'Vista inicial');
  const bGrande = h('button.am-btn', { type: 'button' }, '⛶ Pantalla completa');
  const panel = h('section.pd-panel', { 'aria-live': 'polite' },
    h('div.pd-explica', mTitulo, mTexto),
    modosEl,
    h('div.pd-extra', bNombres, bVista, bGrande));

  const lista = h('nav.pd-lista', { 'aria-label': 'Piezas' }, PIEZAS.map(p =>
    h('a.pd-pieza' + (p.id === def.id ? '.activa' : ''), { href: `#/pordentro/${p.id}`, 'aria-current': p.id === def.id ? 'page' : null },
      h('span.pd-icono', p.icono), h('span', h('b', p.titulo), h('small', p.tema)))));

  const el = h('div.animado.pordentro',
    h('div.am-cab', h('div', h('span.etiqueta', 'Por dentro'), h('h1', def.titulo), h('p.lead', def.resumen))),
    lista,
    h('div.pd-rejilla', escenaEl, panel),
    def.nota ? h('p.am-atajos', def.nota) : null);

  /* ---------- Estado ---------- */
  let renderer, escena, camara, controles, ro, pieza, modoActual = null, generacion = 0, nombres = true;
  const burbujas = [], temporizadores = new Set();
  const proy = new THREE.Vector3();
  const despues = (ms, fn) => { const t = setTimeout(() => { temporizadores.delete(t); fn(); }, ms); temporizadores.add(t); };

  // Medidor (termómetro u otro)
  let valor = 0, valorMeta = 0;
  function pintarMedidor() {
    const m = pieza && pieza.medidor;
    if (!m) return;
    const f = Math.max(0, Math.min(1, (valor - m.min) / (m.max - m.min)));
    mBarra.style.height = (f * 100) + '%';
    mValor.textContent = `${Math.round(valor)} ${m.unidad}`;
    const z = m.zonas.find(([a, b]) => valor >= a && valor < b) || m.zonas[m.zonas.length - 1];
    medidorEl.dataset.zona = z[2];
    mEstado.textContent = z[3];
  }

  const ctx = {
    THREE, animar, esperar, ease,
    get rapido() { return velocidad.instantaneo; },
    vivo: g => g === generacion,
    burbuja(texto, pos, tipo = '', ms = 2600) {
      const b = h('div.am-burbuja' + (tipo ? '.' + tipo : ''), h('span', texto));
      capaBurbujas.append(b);
      const reg = { el: b, pos: pos.clone ? pos.clone() : new THREE.Vector3(...pos) };
      burbujas.push(reg);
      despues(ms * velocidad.factor, () => { b.remove(); const i = burbujas.indexOf(reg); if (i >= 0) burbujas.splice(i, 1); });
    },
    limpiarBurbujas() { burbujas.splice(0).forEach(b => b.el.remove()); },
    // Lleva el medidor a un valor poco a poco
    medir(meta, ms = 2200) {
      valorMeta = meta;
      const v0 = valor;
      return animar(ms, t => { valor = v0 + (meta - v0) * t; pintarMedidor(); }, ease.suave);
    },
    ponerMedidor(v) { valor = valorMeta = v; pintarMedidor(); },
    get medidor() { return valor; },
  };

  /* ---------- Escena ---------- */
  function iniciar() {
    try { renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true }); }
    catch (e) { sin3d.hidden = false; return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    escena = new THREE.Scene();
    escena.background = new THREE.Color(0xf6eddd);
    camara = new THREE.PerspectiveCamera(36, 1, 0.3, 400);
    controles = new OrbitControls(camara, lienzo);
    controles.enableDamping = true;
    controles.maxPolarAngle = 1.45;
    controles.minDistance = def.distancia ? def.distancia[0] : 12;
    controles.maxDistance = def.distancia ? def.distancia[1] : 120;
    escena.add(new THREE.AmbientLight(0xffffff, 1.15));
    const sol = new THREE.DirectionalLight(0xfff4e0, 2.2);
    sol.position.set(-20, 40, 26);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 120 });
    sol.shadow.bias = -0.0006;
    sol.shadow.intensity = 0.55;
    escena.add(sol);
    const mesa = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.13 }));
    mesa.rotation.x = -Math.PI / 2; mesa.position.y = def.suelo ?? -0.6; mesa.receiveShadow = true;
    escena.add(mesa);
    // alfombrilla azul como en el montaje animado
    const [AW, AD] = def.alfombrilla || [46, 34];
    const g = new THREE.BoxGeometry(AW, 0.6, AD);
    const alf = new THREE.Mesh(g, new THREE.MeshToonMaterial({ color: 0x9cc3e6 }));
    alf.receiveShadow = true; alf.position.set(0, (def.suelo ?? -0.6) + 0.3, 0);
    const borde = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: TINTA, side: THREE.BackSide }));
    borde.scale.set((AW + 0.3) / AW, 0.9 / 0.6, (AD + 0.3) / AD); alf.add(borde);
    escena.add(alf);

    pieza = def.crear({ ...ctx, k: kit(nuevaTinta(), []) , escena });
    escena.add(pieza.grupo);
    if (pieza.leyenda) panel.insertBefore(h('ul.pd-leyenda', pieza.leyenda.map(([c, t]) => h('li', h('i', { style: `background:#${c.toString(16).padStart(6, '0')}` }), t))), panel.querySelector('.pd-extra'));
    if (pieza.medidor) { medidorEl.hidden = false; mNombre.textContent = pieza.medidor.nombre; ctx.ponerMedidor(pieza.medidor.inicial ?? pieza.medidor.min); }

    // Etiquetas con el nombre de cada parte
    for (const e of pieza.etiquetas || []) {
      e.el = h('span.pd-etiqueta', e.texto);
      e.v = new THREE.Vector3();
      capaEtiquetas.append(e.el);
    }

    irA(def.camara, true);
    ro = new ResizeObserver(ajustar); ro.observe(escenaEl); ajustar();

    const reloj = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(reloj.getDelta(), 0.05);
      actualizarAnimaciones(performance.now());
      if (pieza.cadaFrame) pieza.cadaFrame(dt, ctx);
      controles.update();
      renderer.render(escena, camara);
      const w = lienzo.clientWidth, hh = lienzo.clientHeight;
      for (const b of burbujas) { proy.copy(b.pos).project(camara); b.el.style.transform = `translate(${((proy.x + 1) / 2) * w}px, ${((1 - proy.y) / 2) * hh}px)`; }
      for (const e of pieza.etiquetas || []) {
        const visible = nombres && e.obj.visible !== false && (!e.cuando || e.cuando());
        e.el.hidden = !visible;
        if (!visible) continue;
        e.obj.getWorldPosition(e.v);
        if (e.off) e.v.add(new THREE.Vector3(...e.off));
        proy.copy(e.v).project(camara);
        e.el.style.transform = `translate(${((proy.x + 1) / 2) * w}px, ${((1 - proy.y) / 2) * hh}px)`;
        e.el.style.opacity = proy.z > 1 ? 0 : 1;
      }
    });
  }
  function ajustar() {
    if (!renderer) return;
    const r = escenaEl.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camara.aspect = r.width / r.height;
    const visible = r.width / r.height;
    camara.fov = Math.min(70, Math.max(34, (2 * Math.atan(Math.tan((22 * Math.PI) / 180) / Math.min(1, visible / 1.4)) * 180) / Math.PI));
    camara.updateProjectionMatrix();
  }
  function irA({ pos, obj }, alMomento = false) {
    const p1 = new THREE.Vector3(...pos), o1 = new THREE.Vector3(...obj);
    if (alMomento) { camara.position.copy(p1); controles.target.copy(o1); return; }
    const p0 = camara.position.clone(), o0 = controles.target.clone();
    animar(900, t => { camara.position.lerpVectors(p0, p1, t); controles.target.lerpVectors(o0, o1, t); });
  }

  /* ---------- Modos ---------- */
  function pintarModos() {
    modosEl.replaceChildren(...pieza.modos.map(m => h('button.am-btn' + (m.peligro ? '.am-peligro' : '') + (m === modoActual ? '.am-principal' : ''),
      { type: 'button', 'aria-pressed': m === modoActual ? 'true' : 'false', onclick: () => elegir(m) }, m.nombre)));
  }
  async function elegir(m) {
    const g = ++generacion;
    cancelarAnimaciones();
    ctx.limpiarBurbujas();
    modoActual = m;
    mTitulo.textContent = m.titulo || m.nombre;
    mTexto.textContent = m.texto;
    pintarModos();
    if (m.camara) irA(m.camara);
    try { await m.aplicar(ctx, g); } catch (e) { console.error(e); }
  }

  bNombres.addEventListener('click', () => { nombres = !nombres; bNombres.setAttribute('aria-pressed', String(nombres)); bNombres.textContent = 'Nombres: ' + (nombres ? 'sí' : 'no'); });
  bVista.addEventListener('click', () => irA(modoActual && modoActual.camara || def.camara));
  bGrande.addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await el.querySelector('.pd-rejilla').requestFullscreen(); } catch (e) {}
  });

  return {
    el,
    montado() {
      iniciar();
      if (!renderer) return;
      elegir(pieza.modos.find(m => m.id === pieza.inicial) || pieza.modos[0]);
    },
    destruir() {
      generacion++;
      cancelarAnimaciones();
      temporizadores.forEach(clearTimeout);
      if (ro) ro.disconnect();
      if (renderer) {
        renderer.setAnimationLoop(null);
        escena.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        renderer.dispose();
        renderer.forceContextLoss();
      }
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    },
  };
}
