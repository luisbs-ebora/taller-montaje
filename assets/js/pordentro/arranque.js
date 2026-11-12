// arranque.js — La secuencia de arranque (Tema 3, sesión 3) sobre un equipo montado: del botón al sistema operativo.
// Los pasos son los de los apuntes: reposo, pulsación, fuente y Power Good, UEFI, POST, búsqueda del arranque,
// gestor de arranque y sistema operativo. Enlaza con el Tema 4 (5VSB, PS_ON y PWR_OK).
import * as THREE from 'three';
import { montaje } from '../piezas3d.js';
import { M, METAL, caja, cil, redondo, lienzo } from '../modelos-t4.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const COL = { sb: 0x9a6cf0, on: 0x35d06a, pg: 0xc9ced6, v12: 0xf5cf2e, boton: 0xffffff };
const LEDS = [['CPU', 0xe5484d], ['DRAM', 0xffd23f], ['VGA', 0xf4f1ea], ['BOOT', 0x3fbf6a]];

export default {
  id: 'arranque', icono: '⏻', titulo: 'La secuencia de arranque', tema: 'Tema 3 · Sesión 3', realista: true,
  resumen: 'Qué pasa dentro del equipo desde que pulsas el botón hasta que aparece el sistema operativo, paso a paso. Y dónde mirar si se queda a medias.',
  nota: 'Saber el orden sirve para diagnosticar: según dónde se pare, el fallo está en un sitio u otro. Recuerda: dentro de la caja solo se toca con el equipo apagado, el interruptor en 0, desenchufado y con la pulsera puesta.',
  camara: { pos: [14, 34, 96], obj: [6, 22, 0] },
  alfombrilla: [96, 44], suelo: -0.3, distancia: [20, 220],

  crear(ctx) {
    const g = new THREE.Group();
    const add = (m, x, y, z) => { m.position.set(x, y, z); m.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.add(m); return m; };

    /* ----- El equipo ----- */
    const sel = { caja: { formatos: ['ATX'] }, placa: { formato: 'ATX' }, cpu: {}, refri: { altura: 155 }, ram: { formato: 'DIMM', gen: 'DDR5', modulos: 2 },
      almac: { formato: '2,5"' }, fuente: { formato: 'ATX' }, gpu: { largo: 260, pcie8: 2 } };
    const pc = montaje(sel); pc.position.set(-8, 23.4, 0); g.add(pc);
    const P = (x, y, z) => V(x - 8, y + 23.4, z); // de coordenadas del equipo a la escena
    // mallas de cada parte, para iluminarlas (con material propio)
    const partes = {}, giran = [];
    pc.traverse(o => {
      if (o.userData.gira) giran.push(o);
      if (!o.isMesh) return;
      let q = o; while (q && !q.userData.parte) q = q.parent;
      if (q) (partes[q.userData.parte] = partes[q.userData.parte] || []).push(o);
    });
    const propios = new Set();
    function luz(nombres, color = 0xffb020, fuerza = 0.7) {
      for (const n of [].concat(nombres)) for (const m of partes[n] || []) {
        if (!propios.has(m)) { m.material = m.material.clone(); propios.add(m); }
        m.material.emissive = new THREE.Color(color); m.material.emissiveIntensity = fuerza;
      }
    }
    const apagarLuces = () => { for (const m of propios) m.material.emissiveIntensity = 0; };

    /* ----- Botón de encendido y su cable hasta F_PANEL ----- */
    const boton = cil(0.9, 0.5, M(0xd9dde2, METAL), 28); boton.rotation.z = Math.PI / 2; add(boton, 14.75, 43, 3);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.09, 10, 36), new THREE.MeshStandardMaterial({ color: 0x3aa0ff, emissive: 0x3aa0ff, emissiveIntensity: 0 })); aro.rotation.y = Math.PI / 2; add(aro, 14.85, 43, 3);
    const curva = (...p) => new THREE.CatmullRomCurve3(p, false, 'catmullrom', 0.4);
    const cables = {};
    function cable(id, c, radio = 0.16) {
      const m = new THREE.Mesh(new THREE.TubeGeometry(c, 60, radio, 8), new THREE.MeshStandardMaterial({ color: id === 'boton' ? 0x30343a : COL[id], roughness: 0.6 }));
      m.castShadow = true; g.add(m);
      cables[id] = { m, c, on: false, acum: 0, parts: [], color: COL[id] };
    }
    cable('boton', curva(P(22, 19.5, 2.6), P(20.5, 12, -6), P(16, -10.6, -8.8), P(8, -11, -9), P(2.6, -9, -9)), 0.13);
    // del 24 pines solo se dibujan los cuatro cables que cuentan la historia
    [['sb', 0], ['on', 1], ['pg', 2], ['v12', 3]].forEach(([id, i]) => {
      const d = i * 0.36;
      cable(id, curva(P(-6.2, -15.6 - d * 0.5, -6), P(1, -12.4 - d, -8), P(6.6 + d, -11 - d, -8.7), P(6.9 + d, 6, -8.7), P(5.6 + d * 0.4, 10.2 + i * 0.75, -8.6), P(3.9, 9.4 + i * 0.9, -8.5)));
    });
    const geoP = new THREE.SphereGeometry(0.42, 10, 8);
    const matP = {}; for (const k in COL) matP[k] = new THREE.MeshBasicMaterial({ color: COL[k], toneMapped: false });
    function corriente(id, on) {
      const c = cables[id]; c.on = on;
      if (id !== 'boton') { c.m.material.emissive.setHex(on ? c.color : 0); c.m.material.emissiveIntensity = on ? 0.55 : 0; }
    }

    /* ----- LED de diagnóstico de la placa ----- */
    const leds = LEDS.map(([n, c], i) => {
      const m = caja(0.7, 0.5, 0.2, new THREE.MeshStandardMaterial({ color: 0x3a3d42, emissive: c, emissiveIntensity: 0 }));
      m.position.copy(P(1.6, 15 + i * 0.95, -9.5)); g.add(m); return m;
    });
    const led = (i, on) => { leds[i].material.emissiveIntensity = on ? 2.4 : 0; };

    /* ----- Monitor ----- */
    const MX = 34;
    add(redondo(9, 0.6, 7, 1.2, M(0x1b1d21, { roughness: 0.4 }), 0.1), MX, 0, 1);
    add(caja(1.6, 10, 1, M(0x1b1d21, { roughness: 0.4 })), MX, 5, 0);
    add(caja(23.4, 14, 0.9, M(0x15171a, { roughness: 0.4 })), MX, 16.4, 0.6);
    const L = lienzo(960, 560);
    const pant = new THREE.Mesh(new THREE.PlaneGeometry(22.4, 13), new THREE.MeshBasicMaterial({ map: L.t, toneMapped: false })); pant.position.set(MX, 16.4, 1.07); g.add(pant);
    function pantalla(modo, lineas = []) {
      const x = L.x, W = 960, H = 560;
      x.fillStyle = '#050607'; x.fillRect(0, 0, W, H); x.textBaseline = 'middle';
      if (modo === 'uefi') {
        x.fillStyle = '#e8eef5'; x.font = 'bold 86px Arial, Helvetica, sans-serif'; x.textAlign = 'center'; x.fillText('UEFI', W / 2, 120);
        x.font = 'bold 42px Consolas, "Courier New", monospace'; x.textAlign = 'left';
        lineas.forEach((l, i) => { x.fillStyle = /✓/.test(l) ? '#8ff0b0' : '#cfd6de'; x.fillText(l, 170, 220 + i * 62); });
        x.fillStyle = '#7d8793'; x.font = '26px Arial, Helvetica, sans-serif'; x.textAlign = 'center'; x.fillText('Pulsa SUPR o F2 para entrar en la configuración', W / 2, H - 40);
      } else if (modo === 'gestor') {
        x.fillStyle = '#e8eef5'; x.font = 'bold 44px Arial, Helvetica, sans-serif'; x.textAlign = 'center'; x.fillText('Gestor de arranque', W / 2, 220);
        x.font = '32px Arial, Helvetica, sans-serif'; x.fillStyle = '#aab4bf'; x.fillText('Cargando el sistema operativo…', W / 2, 290);
        x.strokeStyle = '#3a8dde'; x.lineWidth = 8; x.beginPath(); x.arc(W / 2, 400, 34, 0, Math.PI * 1.5); x.stroke();
      } else if (modo === 'so') {
        const gr = x.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#22508f'); gr.addColorStop(1, '#4fb0cf'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
        x.fillStyle = 'rgba(255,255,255,.92)'; x.beginPath(); x.arc(W / 2, 200, 66, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#22508f'; x.beginPath(); x.arc(W / 2, 184, 24, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(W / 2, 250, 44, Math.PI, 0); x.fill();
        x.fillStyle = '#fff'; x.font = 'bold 44px Arial, Helvetica, sans-serif'; x.textAlign = 'center'; x.fillText('Alumno', W / 2, 320);
        x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.roundRect(W / 2 - 170, 370, 340, 54, 8); x.fill();
        x.fillStyle = '#6b7786'; x.font = '28px Arial, Helvetica, sans-serif'; x.fillText('Contraseña', W / 2, 398);
      }
      L.t.needsUpdate = true;
    }
    // cable de vídeo de la gráfica (detrás del equipo) al monitor
    const video = new THREE.Mesh(new THREE.TubeGeometry(curva(P(-23, 4.5, -2), P(-27, -4, -8), P(-22, -22.6, -15), P(20, -22.6, -15), V(MX, 1, -4), V(MX, 12, 0)), 60, 0.3, 8), M(0x17181b, { roughness: 0.7 })); g.add(video);

    /* ----- Estado ----- */
    let girando = 0, tiempo = 0;
    const SOBRE = { fuente: P(-13, -9, 6), boton: V(15, 49, 3), placa: P(3.5, 22, -4), cpu: P(-11.5, 21, 8), ram: P(-3, 23, -4), gpu: P(-4, 9, 8), disco: P(14, -7, 6), mon: V(MX, 27, 2), bios: P(-7, -2, -4) };
    const POST = ['Procesador .......... ✓', 'Memoria: 16 GB ...... ✓', 'Tarjeta gráfica ..... ✓', 'Discos y teclado .... ✓'];
    // Deja el equipo como queda después de completar n pasos
    function poner(n) {
      apagarLuces(); for (const k in cables) corriente(k, false);
      leds.forEach((_, i) => led(i, false));
      girando = 0; aro.material.emissiveIntensity = 0; boton.position.x = 14.75; pantalla('off');
      if (n >= 1) corriente('sb', true);
      if (n >= 2) { corriente('on', true); aro.material.emissiveIntensity = 1.6; }
      if (n >= 3) { corriente('v12', true); corriente('pg', true); girando = 1; luz('carcasa', 0xffb020, 0.25); }
      if (n >= 5) pantalla('uefi', POST);
      if (n >= 6) { pantalla('gestor'); luz('ssd25', 0x35d06a, 0.6); }
      if (n >= 7) pantalla('so');
    }
    const espera = async (gen, ms) => { await ctx.esperar(ms); return ctx.vivo(gen); };
    const PASOS = [
      async gen => { // 1 · reposo
        luz('carcasa', COL.sb, 0.35); corriente('sb', true);
        ctx.burbuja('Enchufado y apagado: 5 V de reposo', SOBRE.fuente, '', 4200);
        if (!(await espera(gen, 2200))) return false;
        ctx.burbuja('La placa «escucha» el botón', SOBRE.placa, '', 3600);
        return espera(gen, 2600);
      },
      async gen => { // 2 · pulsación
        ctx.burbuja('Pulsas el botón', SOBRE.boton, '', 2600);
        await ctx.animar(260, t => { boton.position.x = 14.75 - 0.3 * t; }); if (!ctx.vivo(gen)) return false;
        corriente('boton', true);
        await ctx.animar(260, t => { boton.position.x = 14.45 + 0.3 * t; });
        if (!(await espera(gen, 1500))) return false;
        corriente('boton', false); luz('fpanel', 0xffffff, 1);
        ctx.burbuja('POWER SW avisa a la placa (F_PANEL)', P(2, -5, -4), '', 3200);
        if (!(await espera(gen, 2400))) return false;
        corriente('on', true); aro.material.emissiveIntensity = 1.6;
        ctx.burbuja('La placa pide encender: cable verde (PS_ON)', P(8, 0, -4), '', 4200);
        return espera(gen, 3000);
      },
      async gen => { // 3 · fuente y Power Good
        luz('carcasa', 0xffb020, 0.5); corriente('v12', true);
        await ctx.animar(1400, t => { girando = t; });
        if (!ctx.vivo(gen)) return false;
        ctx.burbuja('La fuente arranca: 12 V, 5 V y 3,3 V', SOBRE.fuente, '', 3600);
        if (!(await espera(gen, 2600))) return false;
        corriente('pg', true);
        ctx.burbuja('Tensiones estables: cable gris (Power Good)', P(8, 4, -4), '', 4200);
        return espera(gen, 3000);
      },
      async gen => { // 4 · UEFI
        luz('bios', 0x3aa0ff, 2.2);
        ctx.burbuja('El firmware (UEFI) está en este chip', SOBRE.bios, '', 3600);
        if (!(await espera(gen, 2600))) return false;
        luz(['aletas', 'base', 'ihs'], 0x3aa0ff, 0.45);
        ctx.burbuja('El procesador empieza a ejecutarlo', SOBRE.cpu, '', 3600);
        return espera(gen, 2800);
      },
      async gen => { // 5 · POST
        const fases = [[0, ['aletas', 'base', 'ihs'], 'Comprueba el procesador', SOBRE.cpu], [1, ['dimm', 'chips'], 'Comprueba la memoria', SOBRE.ram], [2, ['ventiladores', 'conector'], 'Comprueba la gráfica', SOBRE.gpu], [3, ['ssd25'], 'Comprueba discos y teclado', SOBRE.disco]];
        for (const [i, ps, txt, pos] of fases) {
          apagarLuces(); luz('carcasa', 0xffb020, 0.25); luz(ps, LEDS[i][1], 0.55); led(i, true);
          ctx.burbuja(`LED ${LEDS[i][0]}: ${txt.charAt(0).toLowerCase() + txt.slice(1)}`, pos, '', 1900);
          if (i >= 2) pantalla('uefi', POST.slice(0, i + 1)); // en cuanto la gráfica funciona, hay imagen
          if (!(await espera(gen, 1900))) return false;
          led(i, false);
        }
        apagarLuces(); luz('carcasa', 0xffb020, 0.25); pantalla('uefi', POST);
        ctx.burbuja('POST superado: los LED se apagan y hay imagen', SOBRE.mon, '', 4200);
        return espera(gen, 3000);
      },
      async gen => { // 6 · búsqueda del arranque
        led(3, true); luz('ssd25', 0x35d06a, 0.8);
        ctx.burbuja('Busca, por orden, una unidad con sistema', SOBRE.disco, '', 3600);
        if (!(await espera(gen, 2600))) return false;
        led(3, false); pantalla('gestor');
        ctx.burbuja('La encuentra: arranca el gestor de arranque', SOBRE.mon, '', 3600);
        return espera(gen, 2800);
      },
      async gen => { // 7 · sistema operativo
        luz(['dimm', 'chips'], 0x35d06a, 0.4);
        ctx.burbuja('Carga el núcleo y los controladores en la memoria', SOBRE.ram, '', 3600);
        if (!(await espera(gen, 2600))) return false;
        pantalla('so');
        ctx.burbuja('Pantalla de inicio de sesión: ha arrancado', SOBRE.mon, '', 5200);
        return espera(gen, 1500);
      },
    ];
    const paso = (n, nombre, titulo, texto, camara) => ({ id: 'p' + n, nombre, titulo, texto, camara, async aplicar(ctx, gen) { poner(n - 1); await PASOS[n - 1](gen); } });
    const DENTRO = { pos: [10, 30, 70], obj: [-4, 22, 0] }, TODO = { pos: [14, 34, 96], obj: [6, 22, 0] };
    const modos = [
      paso(1, '1 · Reposo', '1 · Reposo: enchufado y apagado',
        'Con el equipo enchufado y el interruptor de la fuente en I, aunque esté «apagado», la fuente ya da 5 V de reposo por el cable morado (5VSB). Sirven para que la placa «escuche» el botón. Por eso nunca se toca nada dentro sin desenchufar. Si falla aquí: no pasa nada al pulsar el botón; mira el enchufe, el cable y el interruptor de la fuente.', DENTRO),
      paso(2, '2 · Botón', '2 · Pulsación: el botón avisa a la placa',
        'El botón de la caja solo cierra un contacto: el cable POWER SW, conectado en F_PANEL, avisa a la placa. La placa pide a la fuente que se encienda uniendo el cable verde (PS_ON) con masa. Si falla aquí: no pasa nada al pulsar; revisa que POWER SW esté en sus patillas de F_PANEL.', DENTRO),
      paso(3, '3 · Fuente', '3 · La fuente arranca y envía Power Good',
        'La fuente arranca: aparecen los 12 V, 5 V y 3,3 V y empiezan a girar los ventiladores. Cuando sus tensiones son estables, la fuente lo dice por el cable gris (Power Good). Hasta entonces la placa no deja arrancar al procesador. Si falla aquí: se enciende un segundo y se apaga; puede ser un cortocircuito o el cable de 24 pines mal puesto.', DENTRO),
      paso(4, '4 · UEFI', '4 · UEFI: el firmware de la placa',
        'El procesador empieza a ejecutar el firmware (UEFI), que está guardado en un chip de la placa. Es el programa que sabe cómo es esa placa y cómo poner en marcha todo lo demás. Si falla aquí: giran los ventiladores pero no hay imagen y se queda encendido el LED CPU; revisa el cable EPS del procesador.', DENTRO),
      paso(5, '5 · POST', '5 · POST: la autoprueba de encendido',
        'El POST comprueba, por orden, el procesador, la memoria, la gráfica y los dispositivos. Muchas placas encienden un LED en cada comprobación (CPU, DRAM, VGA y BOOT) y lo apagan cuando pasa. Si hay un error grave, se para y deja encendido el LED de lo que falla: así sabes qué revisar primero.', TODO),
      paso(6, '6 · Arranque', '6 · Búsqueda del arranque',
        'Pasado el POST, la UEFI busca, en el orden de arranque configurado, una unidad que tenga un sistema operativo. Cuando la encuentra, pone en marcha su gestor de arranque (Windows Boot Manager o GRUB). Si falla aquí: mensaje «Reboot and select proper boot device» y LED BOOT; revisa que el disco esté conectado y el orden de arranque.', TODO),
      paso(7, '7 · Sistema', '7 · Gestor de arranque y sistema operativo',
        'El gestor de arranque carga el sistema operativo: el núcleo y los controladores pasan del disco a la memoria y aparece la pantalla de inicio de sesión. A partir de aquí manda el sistema operativo. Si falla aquí, el problema ya no es de montaje, sino del sistema o del disco.', TODO),
      {
        id: 'todo', nombre: 'Todo seguido', titulo: 'Del botón al sistema operativo',
        texto: 'Botón, fuente, Power Good, UEFI, POST, orden de arranque, gestor y sistema operativo. Si no pasa nada al pulsar, el fallo está en los primeros pasos (enchufe, fuente, botón). Si giran los ventiladores pero no hay imagen, en el POST. Si dice que no encuentra un dispositivo de arranque, en la búsqueda del arranque.', camara: TODO,
        async aplicar(ctx, gen) { poner(0); for (const p of PASOS) { if (!(await p(gen))) return; ctx.limpiarBurbujas(); } },
      },
    ];

    const sobreParte = (n, off) => ({ obj: (partes[n] || [pc])[0], off });
    const etiquetas = [
      { texto: 'Fuente', ...sobreParte('carcasa', [2, -3, 9]) },
      { texto: 'Botón de encendido', obj: boton, off: [4, 2.5, 0] },
      { texto: 'F_PANEL', ...sobreParte('fpanel', [3, -2.4, 3]) },
      { texto: 'Conector de 24 pines', ...sobreParte('atx24', [8, 0, 3]) },
      { texto: 'LED de diagnóstico', obj: leds[3], off: [5.5, 2.4, 2] },
      { texto: 'Chip de la UEFI', ...sobreParte('bios', [-4, -2.6, 3]) },
      { texto: 'Disco', ...sobreParte('ssd25', [3, 3, 4]) },
    ];

    poner(0);
    return {
      grupo: g, modos, etiquetas, inicial: 'p1',
      leyenda: [[COL.sb, 'Morado: 5 V de reposo'], [COL.on, 'Verde: PS_ON (encender)'], [COL.v12, 'Amarillo: 12 V'], [COL.pg, 'Gris: Power Good']],
      cadaFrame(dt) {
        tiempo += dt;
        for (const o of giran) o.rotation.z += girando * 9 * dt;
        for (const k in cables) {
          const c = cables[k];
          if (c.on) { c.acum += dt; while (c.acum > 0.22) { c.acum -= 0.22; const m = new THREE.Mesh(geoP, matP[k]); g.add(m); c.parts.push({ m, u: 0 }); } }
          for (let i = c.parts.length - 1; i >= 0; i--) {
            const p = c.parts[i]; p.u += dt * 0.55;
            if (p.u >= 1 || !c.on) { g.remove(p.m); c.parts.splice(i, 1); continue; }
            // el verde es una orden de la placa a la fuente: va al revés que los demás
            c.c.getPointAt(k === 'on' ? 1 - p.u : p.u, p.m.position);
          }
        }
      },
    };
  },
};
