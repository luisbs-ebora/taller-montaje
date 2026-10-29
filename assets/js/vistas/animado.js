// animado.js — Montaje animado en estilo cartoon.
// Modo libre (el alumno toca las piezas) y modo clase (el profesor avanza paso a paso con el proyector).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { h } from '../util.js';
import { animar, esperar, ease, actualizarAnimaciones, cancelarAnimaciones, alMomento, velocidad } from '../animado/anim.js';
import { construirPiezas, ORDEN } from '../animado/piezas.js';
import { TINTA, SELECCION } from '../animado/toon.js';

const LENTO = 2.2;

export async function vistaAnimado(temaId) {
  if (temaId !== 'tema1') throw new Error('Este tema todavía no tiene montaje animado.');

  /* ---------- Interfaz ---------- */
  const lienzo = h('canvas.am-lienzo', { 'aria-label': 'Mesa de montaje en 3D. Usa la lista de pasos para seleccionar piezas.' });
  const pista = h('p.am-pista', 'Toca una pieza para verla · arrastra para girar · rueda para acercar');
  const pasos = h('ol.am-pasos');
  const progresoBarra = h('span'), cuenta = h('span.am-cuenta');
  const panel = h('aside.am-panel', { 'aria-label': 'Pasos del montaje' },
    h('div.am-panel-cab', h('h2', 'Pasos'), cuenta),
    h('div.am-progreso', progresoBarra), pasos,
    h('p.am-nota', 'Puedes hacerlo en otro orden: si algo no toca, te avisa.'));

  const fTitulo = h('h2'), fTexto = h('p'), fReq = h('p.am-requiere', { hidden: true });
  const btnAccion = h('button.am-btn.am-principal', { type: 'button' });
  const btnMal = h('button.am-btn.am-peligro', { type: 'button' }, '¿Y si lo hago mal?');
  const ficha = h('section.am-ficha', { hidden: true, 'aria-live': 'polite' },
    h('button.am-cerrar', { type: 'button', 'aria-label': 'Cerrar', onclick: () => cerrarFicha() }, '×'),
    fTitulo, fTexto, fReq, h('div.am-ficha-botones', btnAccion, btnMal));

  const aviso = h('div.am-aviso', { role: 'status' });
  const tooltip = h('div.am-tooltip');
  const capaBurbujas = h('div.am-burbujas');
  const destello = h('div.am-destello');
  const sin3d = h('div.am-sin3d', { hidden: true }, h('p', 'Este navegador no puede mostrar gráficos 3D (WebGL). Prueba con otro navegador o actualízalo.'));

  // Barra del modo clase
  const cPaso = h('span.am-clase-paso'), cTitulo = h('h2'), cTexto = h('p');
  const bAnt = h('button.am-btn', { type: 'button', title: 'Flecha izquierda' }, '◀ Anterior');
  const bRep = h('button.am-btn', { type: 'button', title: 'Tecla R' }, '↻ Repetir');
  const bSig = h('button.am-btn.am-principal', { type: 'button', title: 'Flecha derecha o espacio' }, 'Siguiente ▶');
  const bMal = h('button.am-btn.am-peligro', { type: 'button', title: 'Tecla M' }, '¿Y si lo hago mal?');
  const bVel = h('button.am-btn', { type: 'button', title: 'Tecla L', 'aria-pressed': 'false' }, 'Velocidad: normal');
  const bSalir = h('button.am-btn', { type: 'button' }, 'Salir');
  const barraClase = h('div.am-barra-clase',
    h('div.am-clase-info', cPaso, cTitulo, cTexto),
    h('div.am-clase-controles', bAnt, bRep, bSig, bMal, bVel, bSalir));

  const dialogo = h('dialog.am-final',
    h('h2', '¡Equipo montado!'),
    h('p', 'Primero las piezas sobre la placa, luego la caja, la placa dentro, la fuente y sus cables, los discos y las tarjetas. Se revisa todo, se conecta el monitor y se enchufa lo último. Así se hace.'),
    h('div.am-ficha-botones',
      h('button.am-btn.am-principal', { type: 'button', onclick: () => { dialogo.close(); construir([], true); } }, 'Volver a montar'),
      h('button.am-btn', { type: 'button', onclick: () => dialogo.close() }, 'Seguir mirando')));

  const escenaEl = h('div.am-escena', lienzo, pista, panel, ficha, aviso, tooltip, capaBurbujas, destello, barraClase, sin3d, dialogo);

  const bClase = h('button.btn.azul', { type: 'button', onclick: () => entrarClase() }, 'Modo clase (proyector)');
  const bVista = h('button.btn.sec', { type: 'button', onclick: () => irA(VISTA.pos, VISTA.obj) }, 'Vista general');
  const bNuevo = h('button.btn.sec', { type: 'button', onclick: () => construir([], true) }, 'Empezar de nuevo');
  const bLento = h('button.btn.sec', { type: 'button', 'aria-pressed': 'false', onclick: () => cambiarVelocidad() }, 'Más lento');

  const el = h('div.animado',
    h('div.am-cab',
      h('div', h('span.etiqueta', 'Tema 1 · Montaje'), h('h1', 'Montaje animado'),
        h('p.lead', 'Monta un PC paso a paso y mira qué pasa si te equivocas. Toca una pieza para ver qué es y cómo se monta.')),
      h('div.fila', bClase, bVista, bNuevo, bLento)),
    escenaEl,
    h('p.am-atajos', 'Modo clase con teclado o presentador: ', h('kbd', '→'), ' o ', h('kbd', 'espacio'), ' siguiente · ', h('kbd', '←'), ' anterior · ', h('kbd', 'R'), ' repetir · ', h('kbd', 'M'), ' error · ', h('kbd', 'L'), ' lento · ', h('kbd', 'Esc'), ' salir'));

  /* ---------- Estado ---------- */
  let renderer, escena, camara, controles, raiz, ro, luzChispa;
  let P = {}, hecho = new Set(), ocupado = false, seleccion = null, encima = null, encendido = false;
  let clase = false, pantallaCompleta = false, generacion = 0, mensajeMal = null;
  const particulas = [], burbujas = [], temporizadores = new Set();
  const VISTA = { pos: new THREE.Vector3(-15, 94, 102), obj: new THREE.Vector3(-17, 0, 3) };
  const VISTA_FINAL = { pos: new THREE.Vector3(-14, 52, 52), obj: new THREE.Vector3(-45, 4, -2) };

  const despues = (ms, fn) => { const t = setTimeout(() => { temporizadores.delete(t); fn(); }, ms); temporizadores.add(t); };

  const ctx = {
    get placa() { return P.placa; },
    get piezas() { return P; },
    enfocar: (p, ms = 750, dir) => { if (!velocidad.instantaneo) enfocar(p, ms, dir); },
    // Coordenadas de la placa (en la mesa o dentro de la caja) a coordenadas del mundo
    enPlaca: (x, y, z) => { P.placa.grupo.updateWorldMatrix(true, false); return P.placa.grupo.localToWorld(new THREE.Vector3(x, y, z)); },
    // Lo montado en la placa viaja con ella cuando se mete en la caja
    alPlaca: obj => { P.placa.cuerpo.attach(obj); },
    burbuja: (t, p, tipo) => { if (!velocidad.instantaneo) burbuja(t, p, tipo); },
    chispas: (p, fuerte) => { if (!velocidad.instantaneo) chispas(p, fuerte); },
  };

  /* ---------- Escena ---------- */
  function iniciar() {
    try {
      renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
    } catch (e) {
      sin3d.hidden = false;
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    escena = new THREE.Scene();
    escena.background = new THREE.Color(0xf6eddd);
    camara = new THREE.PerspectiveCamera(36, 1, 0.5, 600);
    camara.position.copy(VISTA.pos);
    controles = new OrbitControls(camara, lienzo);
    controles.target.copy(VISTA.obj);
    controles.enableDamping = true;
    controles.maxPolarAngle = 1.32;
    controles.minDistance = 16;
    controles.maxDistance = 170;

    escena.add(new THREE.AmbientLight(0xffffff, 1.15));
    const sol = new THREE.DirectionalLight(0xfff4e0, 2.3);
    sol.position.set(-38, 50, 30);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -75, right: 75, top: 50, bottom: -50, near: 1, far: 160 });
    sol.target.position.set(-16, 0, 0);
    escena.add(sol.target);
    sol.shadow.bias = -0.0006;
    escena.add(sol);
    luzChispa = new THREE.PointLight(0xffc23a, 0, 40);
    escena.add(luzChispa);

    const mesa = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.ShadowMaterial({ opacity: 0.13 }));
    mesa.rotation.x = -Math.PI / 2; mesa.position.y = -0.6; mesa.receiveShadow = true;
    escena.add(mesa);
    const [AW, AD, AX] = [124, 62, -16];
    const geo = new THREE.BoxGeometry(AW, 0.6, AD);
    const alf = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: 0x9cc3e6 }));
    alf.receiveShadow = true; alf.position.set(AX, -0.3, 0);
    const borde = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: TINTA, side: THREE.BackSide }));
    borde.scale.set((AW + 0.3) / AW, 0.9 / 0.6, (AD + 0.3) / AD); alf.add(borde);
    escena.add(alf);
    const rejilla = new THREE.GridHelper(AW - 2, 40, 0x86b0d6, 0x86b0d6);
    rejilla.scale.z = (AD - 2) / (AW - 2); rejilla.position.set(AX, 0.01, 0);
    escena.add(rejilla);

    ro = new ResizeObserver(ajustar);
    ro.observe(escenaEl);
    ajustar();

    const reloj = new THREE.Clock(), proy = new THREE.Vector3();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(reloj.getDelta(), 0.05);
      actualizarAnimaciones(performance.now());
      for (const p of Object.values(P)) {
        const meta = p === encima && !p.montado && !ocupado && p.accion ? 0.5 : 0;
        p.hover += (meta - p.hover) * Math.min(1, dt * 12);
        p.cuerpo.position.y = p.hover + p.salto;
        if (p.actualizarCordon) p.actualizarCordon();
        if (p.cadaFrame) p.cadaFrame(dt);
      }
      for (const p of Object.values(P)) {
        if (!p.rotores) continue;
        if (!encendido) p.velocidad *= Math.pow(0.35, dt);
        for (const r of p.rotores) r.obj.rotation[r.eje] += p.velocidad * dt;
      }
      if (encendido && P.ram) {
        const m = P.ram.luz.material;
        m.color.setHSL((performance.now() / 2500) % 1, 0.85, 0.6);
        m.emissive.copy(m.color).multiplyScalar(0.5);
      }
      for (let i = particulas.length - 1; i >= 0; i--) {
        const q = particulas[i];
        q.v.y -= q.g * dt;
        if (q.freno) q.v.multiplyScalar(Math.pow(0.6, dt));
        q.m.position.addScaledVector(q.v, dt);
        q.m.rotation.x += q.giro * dt; q.m.rotation.y += q.giro * 0.7 * dt;
        q.vida -= dt;
        if (q.vida < 0.4) q.m.scale.setScalar(Math.max(0.001, q.vida / 0.4));
        if (q.vida <= 0 || q.m.position.y < -1) { escena.remove(q.m); particulas.splice(i, 1); }
      }
      controles.update();
      renderer.render(escena, camara);
      const w = lienzo.clientWidth, hh = lienzo.clientHeight;
      for (const b of burbujas) {
        proy.copy(b.pos).project(camara);
        b.el.style.transform = `translate(${((proy.x + 1) / 2) * w}px, ${((1 - proy.y) / 2) * hh}px)`;
      }
    });

    lienzo.addEventListener('pointerdown', alPulsar);
    lienzo.addEventListener('pointerup', alSoltar);
    lienzo.addEventListener('dblclick', alDobleClic);
    lienzo.addEventListener('pointermove', alMover);
    lienzo.addEventListener('pointerleave', () => { encima = null; tooltip.classList.remove('visible'); });
    addEventListener('keydown', alTeclado);
    document.addEventListener('fullscreenchange', alCambiarPantalla);

    construir([], true);
  }

  // Monta de golpe (sin animación) los pasos indicados. Con intro, las piezas caen con rebote.
  async function construir(ids, intro = false) {
    const mia = ++generacion;
    cancelarAnimaciones();
    if (raiz) { escena.remove(raiz); raiz.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    particulas.splice(0).forEach(q => escena.remove(q.m));
    raiz = new THREE.Group();
    escena.add(raiz);
    P = construirPiezas();
    for (const p of Object.values(P)) raiz.add(p.grupo, p.fijo);
    hecho = new Set(); seleccion = null; encima = null; encendido = false; mensajeMal = null;
    if (!clase) cerrarFicha();
    ocupado = true;
    await alMomento(async () => {
      for (const id of ids) { await P[id].montar(ctx); P[id].montado = true; hecho.add(id); }
    });
    if (mia !== generacion) return;
    for (const p of Object.values(P)) if (p.rotores) p.velocidad = 0;
    ocupado = false;
    if (intro) {
      irA(VISTA.pos, VISTA.obj, 900);
      Object.keys(P).forEach((id, i) => {
        const p = P[id];
        p.salto = 16;
        esperar(120 + i * 60).then(() => animar(750, t => { p.salto = 16 * (1 - t); }, ease.rebote));
      });
    }
    refrescar();
  }

  /* ---------- Cámara ---------- */
  // En modo clase acerca la cámara; con «dir» la coloca mirando desde ese lado.
  function enfocar(punto, ms, dirFija) {
    const t0 = controles.target.clone(), c0 = camara.position.clone();
    let c1;
    if (clase || dirFija) {
      const dir = dirFija ? dirFija.clone().normalize() : c0.clone().sub(t0).normalize();
      if (dir.y < 0.55) { dir.y = 0.55; dir.normalize(); }
      const dist = clase ? 52 : Math.min(c0.distanceTo(t0), 75);
      c1 = punto.clone().addScaledVector(dir, dist);
    } else c1 = c0.clone().add(punto.clone().sub(t0));
    return animar(ms, t => {
      controles.target.lerpVectors(t0, punto, t);
      camara.position.lerpVectors(c0, c1, t);
    });
  }
  // Modo clase: después de cada paso, la cámara va a la pieza del paso siguiente
  function enfocarSiguiente() {
    const id = siguienteId();
    if (!id) return irA(VISTA_FINAL.pos, VISTA_FINAL.obj, 900);
    const p = P[id];
    const punto = p.foco ? p.foco() : p.grupo.getWorldPosition(new THREE.Vector3());
    const t0 = controles.target.clone(), c0 = camara.position.clone();
    const dir = (p.focoDir || new THREE.Vector3(0.1, 0.85, 0.75)).clone().normalize();
    const c1 = punto.clone().addScaledVector(dir, 62);
    return animar(900, t => { controles.target.lerpVectors(t0, punto, t); camara.position.lerpVectors(c0, c1, t); });
  }
  function irA(pos, obj, ms = 900) {
    if (!controles) return;
    const t0 = controles.target.clone(), c0 = camara.position.clone();
    return animar(ms, t => {
      controles.target.lerpVectors(t0, obj, t);
      camara.position.lerpVectors(c0, pos, t);
    });
  }
  function ajustar() {
    if (!renderer) return;
    const r = escenaEl.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    // Centra la mesa en el hueco libre: a la izquierda del panel o encima de la barra de clase
    const px = !clase && r.width > 820 ? panel.offsetWidth + 24 : 0;
    const py = clase ? barraClase.offsetHeight : 0;
    camara.aspect = (r.width + px) / (r.height + py);
    // Ángulo de visión: que la mesa quepa a lo ancho aunque la pantalla sea estrecha
    const visible = r.width / r.height;
    camara.fov = Math.min(72, Math.max(36, (2 * Math.atan(Math.tan((31 * Math.PI) / 180) / visible) * 180) / Math.PI));
    if (px || py) camara.setViewOffset(r.width + px, r.height + py, px, py, r.width, r.height);
    else camara.clearViewOffset();
    camara.updateProjectionMatrix();
  }

  /* ---------- Efectos ---------- */
  function burbuja(texto, pos, tipo = '') {
    const b = h('div.am-burbuja' + (tipo ? '.' + tipo : ''), h('span', texto));
    capaBurbujas.append(b);
    const reg = { el: b, pos: pos.clone() };
    burbujas.push(reg);
    despues(1900 * velocidad.factor, () => { b.remove(); burbujas.splice(burbujas.indexOf(reg), 1); });
  }
  const geoChispa = new THREE.OctahedronGeometry(0.35);
  const matChispa = [0xffd23f, 0xff8a3d, 0xffffff].map(c => new THREE.MeshBasicMaterial({ color: c }));
  function chispas(pos, fuerte = true) {
    const n = fuerte ? 46 : 22, f = fuerte ? 1 : 0.55;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geoChispa, matChispa[i % 3]);
      m.position.copy(pos);
      escena.add(m);
      particulas.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 22 * f, (Math.random() * 16 + 5) * f, (Math.random() - 0.5) * 22 * f), vida: 0.6 + Math.random() * 0.5, g: 34, giro: 10 });
    }
    luzChispa.position.copy(pos).add(new THREE.Vector3(0, 2, 0));
    animar(700, t => { luzChispa.intensity = 900 * f * (1 - t); }, ease.salida);
    if (fuerte) {
      destello.classList.remove('activo'); void destello.offsetWidth; destello.classList.add('activo');
      burbuja('¡CHISPAZO!', pos.clone().add(new THREE.Vector3(0, 4, 0)), 'peligro');
    }
  }
  const geoConfeti = new THREE.PlaneGeometry(0.9, 0.5);
  const colConfeti = [0xff6a3d, 0xffd23f, 0x4a86e8, 0x3fbf6a, 0x8b6fe0, 0xe5484d].map(c => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
  function confeti() {
    for (let i = 0; i < 170; i++) {
      const m = new THREE.Mesh(geoConfeti, colConfeti[i % colConfeti.length]);
      m.position.set((Math.random() - 0.5) * 50, 26 + Math.random() * 14, (Math.random() - 0.5) * 34);
      m.rotation.set(Math.random() * 6, Math.random() * 6, 0);
      escena.add(m);
      particulas.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 6, -Math.random() * 4, (Math.random() - 0.5) * 6), vida: 4 + Math.random() * 2, g: 5, giro: 5, freno: true });
    }
  }

  /* ---------- Lógica de pasos ---------- */
  const faltan = p => p.requiere.filter(r => !hecho.has(r));
  const nombres = ids => ids.map(r => P[r].nombre).join(', ');
  const puedeMal = p => p.mal && !p.montado && (p.id === 'enchufe' || !faltan(p).length);
  const siguienteId = () => ORDEN.find(id => !hecho.has(id));

  function tintar(p, color) { p.tintas.forEach(t => t.color.set(color)); }

  let tAviso;
  function avisar(texto, tipo = '') {
    aviso.textContent = texto;
    aviso.className = 'am-aviso visible ' + tipo;
    clearTimeout(tAviso);
    tAviso = setTimeout(() => { aviso.className = 'am-aviso'; }, 5200 * velocidad.factor);
  }

  async function sacudir(p) {
    await animar(480, (_, t) => { p.cuerpo.position.x = Math.sin(t * Math.PI * 7) * 0.5 * (1 - t); }, ease.lineal);
    p.cuerpo.position.x = 0;
  }

  async function intentar(p) {
    if (ocupado || p.montado || !p.montar) return;
    const falta = faltan(p);
    if (falta.length) {
      if (p.id === 'enchufe') return verMal(p);
      sacudir(p);
      if (falta.includes('pulsera')) avisar('Primero la pulsera antiestática: la electricidad estática de tu cuerpo puede estropear los componentes.', 'cuidado');
      else avisar('Todavía no. Antes: ' + nombres(falta) + '.', 'cuidado');
      return;
    }
    const mia = generacion;
    ocupado = true; mensajeMal = null; refrescar();
    tintar(p, TINTA);
    p.hover = 0;
    try { await p.montar(ctx); } finally { if (mia === generacion) ocupado = false; }
    if (mia !== generacion) return;
    p.montado = true;
    hecho.add(p.id);
    if (seleccion === p && !clase) tintar(p, SELECCION);
    refrescar();
    if (p.id === 'enchufe') await encender();
    else if (clase) enfocarSiguiente();
  }

  // Enseña el error típico del paso y luego deja la escena como estaba.
  async function verMal(p) {
    if (ocupado || !puedeMal(p)) return;
    const mia = generacion;
    const estado = ORDEN.filter(id => hecho.has(id));
    const idSel = seleccion && seleccion.id;
    ocupado = true; mensajeMal = p; refrescar();
    tintar(p, TINTA);
    p.hover = 0;
    avisar(p.tituloMal + ': ' + p.textoMal, 'peligro');
    try { await p.mal(ctx); await esperar(1300); } finally { if (mia === generacion) ocupado = false; }
    if (mia !== generacion) return;
    await construir(estado);
    mensajeMal = P[p.id];
    if (idSel && !clase) seleccionar(P[idSel]);
    refrescar();
    if (clase) enfocarSiguiente();
  }

  async function encender() {
    encendido = true;
    const B = P.placa;
    B.led.material.color.set(0x3fbf6a); B.led.material.emissive.set(0x2fbf5a);
    P.disipador.velocidad = 22; P.fuente.velocidad = 14; P.gpu.velocidad = 16; P.ventiladores.velocidad = 14;
    P.ventiladores.aire('bien');
    P.monitor.pantalla.material.color.set(0x7fb4ff); P.monitor.pantalla.material.emissive.set(0x3a6fd0);
    P.caja.ledFrente.material.color.set(0x3fbf6a); P.caja.ledFrente.material.emissive.set(0x2fbf5a);
    await irA(VISTA_FINAL.pos, VISTA_FINAL.obj, 1200);
    burbuja('¡Encendido!', ctx.enPlaca(0, 16, 0));
    burbuja('¡Hay imagen!', new THREE.Vector3(-50, 35, -44));
    confeti();
    if (clase) return;
    await esperar(1400);
    if (!encendido) return;
    cerrarFicha();
    dialogo.showModal();
  }

  /* ---------- Pintar interfaz ---------- */
  function refrescar() {
    pintarPasos();
    mostrarFicha();
    pintarClase();
  }

  function pintarPasos() {
    const sig = siguienteId();
    pasos.replaceChildren(...ORDEN.map((id, i) => {
      const p = P[id], listo = hecho.has(id);
      const estado = listo ? 'hecho' : !faltan(p).length ? 'disponible' : 'bloqueado';
      return h('li.' + estado + (id === sig ? '.siguiente' : ''),
        h('button', { type: 'button', onclick: () => { seleccionar(p); if (!ocupado) enfocar(p.foco ? p.foco() : p.grupo.position.clone(), 700); } },
          h('span.am-num', listo ? '✓' : String(i + 1)), h('span.am-txt', p.nombre)));
    }));
    progresoBarra.style.width = (hecho.size / ORDEN.length) * 100 + '%';
    cuenta.textContent = `${hecho.size} de ${ORDEN.length}`;
  }

  function seleccionar(p) {
    if (seleccion && seleccion !== p) tintar(seleccion, TINTA);
    seleccion = p;
    if (!ocupado) tintar(p, SELECCION);
    pista.classList.add('oculta');
    if (!ocupado) animar(440, t => { p.salto = Math.sin(Math.PI * t) * (p.montado || p.id === 'placa' ? 0.3 : 1.4); }, ease.lineal);
    mostrarFicha();
  }

  function mostrarFicha() {
    const p = seleccion;
    if (!p || clase) { ficha.hidden = true; return; }
    ficha.hidden = false;
    fTitulo.textContent = p.nombre;
    fTexto.textContent = p.texto;
    const falta = faltan(p);
    fReq.hidden = !(falta.length && !p.montado);
    fReq.textContent = falta.length ? 'Antes: ' + nombres(falta) : '';
    btnAccion.hidden = !p.accion;
    btnAccion.disabled = ocupado || p.montado;
    btnAccion.textContent = p.montado ? '✓ Hecho' : p.accion || '';
    btnMal.hidden = !p.mal || p.montado;
    btnMal.disabled = ocupado || !puedeMal(p);
    btnMal.title = puedeMal(p) ? p.tituloMal : 'Primero: ' + nombres(falta);
  }
  function cerrarFicha() {
    if (seleccion) tintar(seleccion, TINTA);
    seleccion = null;
    ficha.hidden = true;
  }

  function pintarClase() {
    if (!clase) return;
    const n = hecho.size;
    const actual = ORDEN[n];
    const p = actual && P[actual];
    barraClase.classList.toggle('error', !!mensajeMal);
    if (mensajeMal) {
      cPaso.textContent = `Paso ${ORDEN.indexOf(mensajeMal.id) + 1} de ${ORDEN.length} · Así NO`;
      cTitulo.textContent = mensajeMal.tituloMal;
      cTexto.textContent = mensajeMal.textoMal;
    } else if (p) {
      cPaso.textContent = `Paso ${n + 1} de ${ORDEN.length}`;
      cTitulo.textContent = p.nombre;
      cTexto.textContent = p.texto;
    } else {
      cPaso.textContent = 'Terminado';
      cTitulo.textContent = '¡Equipo montado y encendido!';
      cTexto.textContent = 'Repaso: pulsera; procesador, pasta, disipador, RAM y SSD en la mesa; chapa, separadores y ventiladores; placa a la caja; fuente, 24 pines, EPS y disco duro; gráfica y Wi‑Fi; panel frontal; revisar; monitor a la gráfica y, al final, enchufar.';
    }
    bAnt.disabled = ocupado || n === 0;
    bRep.disabled = ocupado || n === 0;
    bSig.disabled = ocupado;
    bSig.textContent = p ? 'Siguiente ▶' : 'Volver a empezar';
    bMal.disabled = ocupado || !p || !puedeMal(p);
    bMal.hidden = !p;
    requestAnimationFrame(ajustar);
  }

  /* ---------- Modo clase ---------- */
  async function entrarClase() {
    if (!renderer) return;
    clase = true;
    escenaEl.classList.add('clase');
    cerrarFicha();
    pista.classList.add('oculta');
    try {
      if (escenaEl.requestFullscreen) { await escenaEl.requestFullscreen(); pantallaCompleta = true; }
    } catch (e) { pantallaCompleta = false; }
    let i = 0;
    while (i < ORDEN.length && hecho.has(ORDEN[i])) i++;
    if (i !== hecho.size) await construir(ORDEN.slice(0, i));
    mensajeMal = null;
    refrescar();
    ajustar();
    enfocarSiguiente();
    bSig.focus();
  }
  function salirClase() {
    if (!clase) return;
    clase = false;
    escenaEl.classList.remove('clase');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    pantallaCompleta = false;
    refrescar();
    ajustar();
  }
  function alCambiarPantalla() {
    if (!document.fullscreenElement && clase && pantallaCompleta) salirClase();
    else requestAnimationFrame(ajustar);
  }
  async function siguiente() {
    const id = siguienteId();
    if (ocupado) return;
    if (!id) { await construir([], true); return; }
    await intentar(P[id]);
  }
  async function anterior() {
    if (ocupado || !hecho.size) return;
    await construir(ORDEN.slice(0, hecho.size - 1));
  }
  async function repetir() {
    if (ocupado || !hecho.size) return;
    const n = hecho.size;
    await construir(ORDEN.slice(0, n - 1));
    await intentar(P[ORDEN[n - 1]]);
  }
  function malActual() {
    const id = siguienteId();
    if (id) verMal(P[id]);
  }
  function cambiarVelocidad() {
    velocidad.factor = velocidad.factor === 1 ? LENTO : 1;
    const lento = velocidad.factor !== 1;
    escenaEl.style.setProperty('--am-vel', velocidad.factor);
    bVel.textContent = 'Velocidad: ' + (lento ? 'lenta' : 'normal');
    bVel.setAttribute('aria-pressed', String(lento));
    bLento.setAttribute('aria-pressed', String(lento));
    bLento.textContent = lento ? 'Velocidad normal' : 'Más lento';
  }

  bSig.addEventListener('click', siguiente);
  bAnt.addEventListener('click', anterior);
  bRep.addEventListener('click', repetir);
  bMal.addEventListener('click', malActual);
  bVel.addEventListener('click', cambiarVelocidad);
  bSalir.addEventListener('click', salirClase);
  btnAccion.addEventListener('click', () => seleccion && intentar(seleccion));
  btnMal.addEventListener('click', () => seleccion && verMal(seleccion));

  function alTeclado(ev) {
    if (ev.target.closest && ev.target.closest('input, textarea, select')) return;
    if (!clase) { if (ev.key === 'Escape') cerrarFicha(); return; }
    const k = ev.key.toLowerCase();
    if (['arrowright', 'pagedown', ' '].includes(k)) { ev.preventDefault(); siguiente(); }
    else if (['arrowleft', 'pageup'].includes(k)) { ev.preventDefault(); anterior(); }
    else if (k === 'r') repetir();
    else if (k === 'm') malActual();
    else if (k === 'l') cambiarVelocidad();
    else if (k === 'escape') salirClase();
  }

  /* ---------- Ratón ---------- */
  const ray = new THREE.Raycaster(), raton = new THREE.Vector2();
  function piezaEn(ev) {
    const r = lienzo.getBoundingClientRect();
    raton.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(raton, camara);
    for (const hit of ray.intersectObjects(raiz.children, true)) {
      let o = hit.object;
      if (!o.visible || o.userData.atraviesa) continue;
      while (o && !o.userData.id) o = o.parent;
      if (o) return P[o.userData.id];
    }
    return null;
  }
  let abajo = null;
  function alPulsar(ev) { abajo = { x: ev.clientX, y: ev.clientY }; }
  function alSoltar(ev) {
    if (!abajo || Math.hypot(ev.clientX - abajo.x, ev.clientY - abajo.y) > 6) { abajo = null; return; }
    abajo = null;
    const p = piezaEn(ev);
    if (p) seleccionar(p); else cerrarFicha();
  }
  function alDobleClic(ev) { if (clase) return; const p = piezaEn(ev); if (p) intentar(p); }
  function alMover(ev) {
    if (ev.pointerType !== 'mouse') return;
    const p = piezaEn(ev);
    encima = p;
    lienzo.style.cursor = p ? 'pointer' : 'grab';
    if (p) {
      tooltip.textContent = p.nombre + (p.montado ? ' ✓' : '');
      tooltip.style.transform = `translate(${ev.offsetX + 16}px, ${ev.offsetY + 14}px)`;
      tooltip.classList.add('visible');
    } else tooltip.classList.remove('visible');
  }

  return {
    el,
    montado: iniciar,
    destruir() {
      generacion++;
      if (renderer) { cancelarAnimaciones(); velocidad.factor = 1; }
      temporizadores.forEach(clearTimeout); temporizadores.clear();
      clearTimeout(tAviso);
      removeEventListener('keydown', alTeclado);
      document.removeEventListener('fullscreenchange', alCambiarPantalla);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      if (ro) ro.disconnect();
      if (renderer) {
        renderer.setAnimationLoop(null);
        escena.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        renderer.dispose();
        renderer.forceContextLoss();
      }
      if (controles) controles.dispose();
    }
  };
}
