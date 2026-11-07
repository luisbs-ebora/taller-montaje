// fuente.js — La fuente de alimentación por dentro: de los 230 V del enchufe a los 12, 5 y 3,3 V del ordenador.
import * as THREE from 'three';

const C = { chapa: 0x6b7180, pcb: 0x2f7d4f, negro: 0x2b2a33, cobre: 0xd98c4a, azul: 0x3557a6, aleta: 0xdfe3e8,
  trafo: 0xf2c14e, rojo: 0xe5484d, blanco: 0xf4f1ea };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Los cables de salida, con sus colores del estándar ATX
const CABLES = [
  { id: '12', color: 0xffd23f, nombre: 'Amarillo: 12 V' },
  { id: '5', color: 0xe5484d, nombre: 'Rojo: 5 V' },
  { id: '33', color: 0xff8a3d, nombre: 'Naranja: 3,3 V' },
  { id: 'gnd', color: 0x2b2a33, nombre: 'Negro: masa (0 V)' },
  { id: 'sb', color: 0x8b6fe0, nombre: 'Morado: 5 V de reposo' },
  { id: 'on', color: 0x3fbf6a, nombre: 'Verde: PS_ON (encender)' },
  { id: 'pg', color: 0x9aa3b2, nombre: 'Gris: Power Good' },
];

export default {
  id: 'fuente', icono: '⚡', titulo: 'La fuente de alimentación', tema: 'Tema 3 · Sesión 3 y UD4',
  resumen: 'Por qué no se abre nunca una fuente, cómo convierte los 230 V del enchufe en las tensiones del ordenador y qué cable hace qué al pulsar el botón.',
  nota: 'Esto se mira aquí, no en el taller: una fuente de verdad no se abre nunca, ni desenchufada. Si falla, se cambia entera.',
  camara: { pos: [24, 22, 30], obj: [0, 3, 1] },
  alfombrilla: [48, 44],
  distancia: [12, 110],

  crear(ctx) {
    const { k } = ctx;
    const g = new THREE.Group();
    const add = (padre, m, x, y, z) => { m.position.set(x, y, z); padre.add(m); return m; };
    const W = 15, H = 8.6, D = 14;

    // Carcasa sin tapa
    const caja = new THREE.Group(); g.add(caja);
    add(caja, k.caja(W, 0.4, D, C.chapa), 0, 0.2, 0);
    add(caja, k.caja(0.4, H, D, C.chapa), -W / 2, H / 2, 0);
    add(caja, k.caja(0.4, H, D, C.chapa), W / 2, H / 2, 0);
    const trasera = add(caja, k.caja(W, H, 0.4, C.chapa), 0, H / 2, -D / 2);
    const frontal = add(caja, k.caja(W, H * 0.45, 0.4, C.chapa), 0, H * 0.225, D / 2);
    // La tapa con el ventilador, levantada para ver dentro
    const tapa = new THREE.Group(); g.add(tapa);
    add(tapa, k.caja(W, 0.4, D, C.chapa), 0, 0, 0);
    add(tapa, k.cil(5.6, 0.5, C.negro, 0.04, 40), 0, -0.45, 0);
    const aspas = new THREE.Group(); aspas.position.y = -0.8; tapa.add(aspas);
    for (let i = 0; i < 7; i++) { const s = new THREE.Group(); s.rotation.y = i * Math.PI * 2 / 7; const p = k.caja(3.6, 0.15, 1.4, 0x4a4a55, 0.03); p.position.x = 2.6; p.rotation.x = 0.4; s.add(p); aspas.add(s); }
    tapa.position.set(0, H + 9, -6); tapa.rotation.x = -0.55;

    // Dentro
    const pcb = add(g, k.caja(W - 1.2, 0.3, D - 1.2, C.pcb, 0.04), 0, 0.6, 0);
    const filtro = add(g, k.toro(1.1, 0.55, C.cobre, 0.05), -5, 2.2, -4.2); filtro.rotation.y = Math.PI / 2;
    const conden = add(g, k.cil(1.5, 4, C.azul, 0.05, 28), -1.8, 2.75, -3.6);
    const halo = add(g, new THREE.Mesh(new THREE.SphereGeometry(3, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0, depthWrite: false })), -1.8, 2.9, -3.6);
    add(g, k.cil(1.45, 0.12, 0xc9ced6, 0.02, 28), -1.8, 4.8, -3.6);
    const disip1 = add(g, k.caja(0.4, 5, 8, C.aleta), 1.6, 3.2, -1.5);
    const disip2 = add(g, k.caja(0.4, 5, 8, C.aleta), 5.6, 3.2, -1.5);
    for (const x of [1.15, 5.15]) for (const z of [-4, -1.5, 1]) add(g, k.caja(0.5, 1, 0.8, C.negro, 0.03), x, 1.3, z);
    const trafo = add(g, k.caja(3.2, 3.2, 3, C.trafo), 3.6, 2.4, 3.6);
    add(g, k.caja(3.4, 0.6, 3.2, C.negro, 0.03), 3.6, 4.1, 3.6);
    const pequenos = [];
    for (const [x, z] of [[-5.2, 4.4], [-3.8, 4.4], [-2.4, 4.4], [-0.8, 4.8], [-5.2, 2.4]]) pequenos.push(add(g, k.cil(0.5, 1.5, C.negro, 0.03), x, 1.5, z));

    // Entrada trasera: conector del cable de corriente e interruptor
    const c14 = add(g, k.caja(2.6, 1.8, 0.6, C.negro, 0.04), -4.2, 4.6, -D / 2 - 0.4);
    const inter = new THREE.Group(); inter.position.set(0.4, 4.6, -D / 2 - 0.45); g.add(inter);
    const tecla = k.caja(1.4, 1.6, 0.4, C.rojo, 0.04); inter.add(tecla);
    // Cable de corriente hasta el enchufe de la pared
    const enchufe = new THREE.Group(); g.add(enchufe);
    add(enchufe, k.caja(6, 7, 1, C.blanco), 0, 3.5, 0);
    add(enchufe, k.cil(1.6, 0.4, 0xe8e2d6, 0.03), 0, 3.5, 0.6).rotation.x = Math.PI / 2;
    enchufe.position.set(-14, 0, -19);
    const cordon = add(g, k.tubo(new THREE.CatmullRomCurve3([V(-4.2, 4.6, -D / 2 - 0.8), V(-5, 2, -10), V(-10, 0.8, -14), V(-14, 3.5, -18.2)]), 0.42, C.negro, 0.04), 0, 0, 0);

    // Cables de salida y su conector
    const tubos = CABLES.map((c, i) => {
      const x = -3 + i;
      const curva = new THREE.CatmullRomCurve3([V(x, 2.2, 3.5), V(x, 2.6, D / 2 + 1), V(x * 1.1, 1.2, D / 2 + 4), V(x * 1.2, 0.9, D / 2 + 8)]);
      const m = k.tubo(curva, 0.32, c.color, 0.035);
      m.material = m.material.clone();
      g.add(m);
      return { ...c, m, curva };
    });
    const conector = add(g, k.caja(9.6, 1.6, 2.2, C.negro), 0, 1.0, D / 2 + 9.2);

    /* ----- Electricidad: chispas que recorren el camino ----- */
    const camino = new THREE.CatmullRomCurve3([V(-14, 3.5, -18), V(-10, 0.8, -14), V(-5, 2, -10), V(-4.2, 4.6, -D / 2), V(-5, 2.8, -4.2), V(-1.8, 5, -3.6), V(1.6, 5.4, -1.5), V(3.6, 4.4, 3.6), V(0, 2.5, 3.8)], false, 'catmullrom', 0.2);
    const geoChispa = new THREE.SphereGeometry(0.32, 10, 8);
    const matAlterna = new THREE.MeshBasicMaterial({ color: 0xffe066 });
    const matContinua = new THREE.MeshBasicMaterial({ color: 0xff6a3d });
    const chispas = [];
    let corriente = false, giro = 0, acum = 0, carga = 0, tiempo = 0;
    const encendidos = new Set();

    function luces(ids) {
      encendidos.clear(); ids.forEach(i => encendidos.add(i));
      for (const t of tubos) {
        const on = encendidos.has(t.id);
        t.m.material.emissive.setHex(on ? t.color : 0x000000);
        t.m.material.emissiveIntensity = on ? 0.55 : 0;
      }
    }
    function teclaEn(on) { tecla.rotation.x = on ? -0.3 : 0.3; }
    async function enchufar(on, ms = 900) {
      const z0 = enchufe.position.z, z1 = on ? -19 : -27;
      if (!on) cordon.visible = false;
      await ctx.animar(ms, t => { enchufe.position.z = z0 + (z1 - z0) * t; });
      cordon.visible = on;
    }
    async function base(gen) {
      // estado de partida: enchufada, interruptor en I, todo apagado salvo el reposo
      corriente = false; giro = 0; carga = 0; teclaEn(true); cordon.visible = true;
      if (enchufe.position.z !== -19) await enchufar(true, 500);
      luces(['sb']);
      return ctx.vivo(gen);
    }

    const etiquetas = [
      { texto: 'Filtro', obj: filtro, off: [-2.4, -0.6, 2.4] },
      { texto: 'Condensador grande', obj: conden, off: [0, 2.8, 0] },
      { texto: 'Disipadores', obj: disip2, off: [0, 3.2, 0] },
      { texto: 'Transformador', obj: trafo, off: [0, 2.6, 0] },
      { texto: 'Ventilador (en la tapa)', obj: tapa, off: [0, 1.5, 0] },
      { texto: 'Entrada 230 V', obj: c14, off: [-2.5, 1.8, 0] },
      { texto: 'Interruptor I/O', obj: inter, off: [3, 1.6, 0] },
      { texto: 'Cables de salida', obj: conector, off: [0, 1.8, 0] },
    ];

    const modos = [
      {
        id: 'partes', nombre: 'Las partes', titulo: 'Qué hay dentro de una fuente',
        texto: 'La corriente del enchufe entra por detrás. El filtro limpia las interferencias, el condensador grande guarda energía, los componentes de los disipadores la cortan muy deprisa y el transformador la baja a tensiones pequeñas. El ventilador de la tapa saca el calor. Por delante salen los cables hacia el ordenador.',
        async aplicar(ctx, gen) { await base(gen); },
      },
      {
        id: 'recorrido', nombre: 'Recorrido de la corriente', titulo: 'De 230 V alterna a 12, 5 y 3,3 V continua',
        texto: 'Del enchufe llegan 230 V de corriente alterna (cambia de sentido 50 veces por segundo). La fuente la convierte en corriente continua y la baja: 12 V para el procesador y la gráfica (cable amarillo), 5 V (rojo) y 3,3 V (naranja) para placa, discos y memoria. El negro es la masa, el 0 V.',
        async aplicar(ctx, gen) {
          if (!(await base(gen))) return;
          corriente = true; giro = 10; luces(['sb', '12', '5', '33', 'pg']);
          ctx.burbuja('230 V alterna', V(-10, 4, -14), '', 3200);
          await ctx.esperar(1600);
          if (!ctx.vivo(gen)) return;
          ctx.burbuja('12 V · 5 V · 3,3 V continua', V(0, 4.5, D / 2 + 6), '', 3600);
        },
      },
      {
        id: 'arranque', nombre: 'Pulsar el botón', titulo: 'Qué pasa al pulsar el botón de encendido',
        texto: 'Con el equipo enchufado y apagado, el cable morado ya da 5 V de reposo para que la placa «escuche» el botón. Al pulsarlo, la placa activa el cable verde (PS_ON) y la fuente arranca. Cuando sus tensiones son estables, avisa con el gris (Power Good) y el ordenador empieza a arrancar.',
        async aplicar(ctx, gen) {
          if (!(await base(gen))) return;
          const paso = async (texto, ids, pos, extra) => {
            luces(ids); if (extra) extra();
            ctx.burbuja(texto, pos, '', 2600);
            await ctx.esperar(2000);
            return ctx.vivo(gen);
          };
          if (!(await paso('1. Morado: 5 V de reposo', ['sb'], V(1, 3.4, D / 2 + 6)))) return;
          if (!(await paso('2. Botón → verde (PS_ON)', ['sb', 'on'], V(2, 3.4, D / 2 + 6)))) return;
          if (!(await paso('3. Arranca: 12 V, 5 V y 3,3 V', ['sb', 'on', '12', '5', '33'], V(-2, 3.4, D / 2 + 6), () => { corriente = true; giro = 10; }))) return;
          await paso('4. Gris: Power Good → arranca el PC', ['sb', 'on', '12', '5', '33', 'pg'], V(3, 3.4, D / 2 + 6));
        },
      },
      {
        id: 'desenchufada', nombre: 'Desenchufada', peligro: true, titulo: 'Desenchufada… y el condensador sigue cargado',
        texto: 'Aunque la desenchufes, el condensador grande puede guardar carga mucho tiempo y dar una descarga peligrosa. Por eso una fuente no se abre nunca, ni para limpiarla por dentro. Si falla, se cambia entera.',
        async aplicar(ctx, gen) {
          await base(gen);
          if (!ctx.vivo(gen)) return;
          corriente = false; giro = 0; luces([]);
          await enchufar(false);
          if (!ctx.vivo(gen)) return;
          carga = 1;
          ctx.burbuja('¡Sigue cargado!', V(-1.8, 7.5, -3.6), 'peligro', 9000);
        },
      },
      {
        id: 'interruptor', nombre: 'Interruptor en 0', titulo: 'Interruptor trasero en 0: así se monta',
        texto: 'Con el interruptor de atrás en 0 no sale nada de la fuente, ni siquiera los 5 V de reposo del cable morado. Durante todo el montaje la fuente va desenchufada y con el interruptor en 0. Solo se enchufa al final, con todo revisado.',
        async aplicar(ctx, gen) {
          if (!(await base(gen))) return;
          await ctx.esperar(400);
          if (!ctx.vivo(gen)) return;
          await ctx.animar(400, t => { tecla.rotation.x = -0.3 + 0.6 * t; });
          luces([]);
          ctx.burbuja('0: no sale nada', V(0.4, 7, -D / 2 - 1), '', 3200);
        },
      },
    ];

    return {
      grupo: g, modos, etiquetas, inicial: 'partes',
      leyenda: CABLES.map(c => [c.color, c.nombre]),
      cadaFrame(dt) {
        tiempo += dt;
        aspas.rotation.y += giro * dt;
        // el condensador brilla si guarda carga
        const brillo = carga ? 0.35 + 0.35 * Math.sin(tiempo * 6) : 0;
        if (!conden.userData.propio) { conden.material = conden.material.clone(); conden.userData.propio = true; }
        conden.material.emissive.setHex(0xffd23f); conden.material.emissiveIntensity = brillo;
        halo.material.opacity = carga ? 0.18 + 0.18 * Math.sin(tiempo * 6) : 0;
        halo.scale.setScalar(carga ? 1 + 0.12 * Math.sin(tiempo * 6) : 1);
        if (corriente) {
          acum += dt;
          while (acum > 0.12) { acum -= 0.12; const m = new THREE.Mesh(geoChispa, matAlterna); g.add(m); chispas.push({ m, u: 0 }); }
        }
        for (let i = chispas.length - 1; i >= 0; i--) {
          const c = chispas[i];
          c.u += dt * 0.32;
          if (c.u >= 1 || !corriente) { g.remove(c.m); chispas.splice(i, 1); continue; }
          c.m.position.copy(camino.getPointAt(c.u));
          c.m.material = c.u > 0.86 ? matContinua : matAlterna;
          c.m.scale.setScalar(c.u < 0.55 ? 1 + 0.35 * Math.sin(c.u * 60) : 0.8);
        }
      },
    };
  },
};
