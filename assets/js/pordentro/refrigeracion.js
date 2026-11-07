// refrigeracion.js — Los tres tipos de disipador (de serie, de torre y líquida AIO) y cómo se llevan el calor.
import * as THREE from 'three';

const C = { placa: 0x2f7d4f, zocalo: 0x37405a, cpu: 0xc9ced6, cobre: 0xd98c4a, aleta: 0xdfe3e8, negro: 0x2b2a33,
  aspa: 0x4a4a55, ram: 0x37405a, tubo: 0x1d1b24, caliente: 0xff6a3d, frio: 0x4a86e8, aire: 0x9fd4ff };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export default {
  id: 'refrigeracion', icono: '🌀', titulo: 'Disipadores por dentro', tema: 'Tema 3 · Sesión 2',
  resumen: 'De serie, de torre o refrigeración líquida: los tres sacan el calor del procesador, pero de forma distinta. Y si el ventilador no se conecta a CPU_FAN…',
  nota: 'Temperaturas orientativas, con el procesador trabajando a tope. El tamaño de las piezas no está a escala exacta.',
  camara: { pos: [26, 22, 34], obj: [0, 8, 0] },
  alfombrilla: [46, 36],
  distancia: [14, 110],

  crear(ctx) {
    const { k } = ctx;
    const g = new THREE.Group();
    const add = (padre, m, x, y, z) => { m.position.set(x, y, z); padre.add(m); return m; };

    // Placa con zócalo, procesador y dos módulos de RAM al lado
    const placa = add(g, k.caja(30, 1, 26, C.placa), 0, 0, 0);
    add(g, k.caja(8, 0.8, 8, C.zocalo), 0, 0.9, 0);
    const cpu = add(g, k.caja(6, 0.7, 6, C.cpu), 0, 1.6, 0);
    const ram = [add(g, k.caja(0.8, 5, 13, C.ram), 8, 3, 0), add(g, k.caja(0.8, 5, 13, C.ram), 10, 3, 0)];

    function ventilador(radio = 4, marcoAncho = 9, marcoGrueso = 1.2) {
      const v = new THREE.Group();
      v.add(k.caja(marcoAncho, marcoGrueso, marcoAncho, C.negro, 0.05));
      const rotor = new THREE.Group(); rotor.position.y = marcoGrueso / 2 + 0.05; v.add(rotor);
      for (let i = 0; i < 7; i++) { const s = new THREE.Group(); s.rotation.y = i * Math.PI * 2 / 7; const p = k.caja(radio * 0.75, 0.15, 1.3, C.aspa, 0.03); p.position.x = radio * 0.5; p.rotation.x = 0.4; s.add(p); rotor.add(s); }
      rotor.add(k.cil(1.1, 0.4, C.negro, 0.03));
      v.userData.rotor = rotor;
      return v;
    }

    /* ----- De serie ----- */
    const serie = new THREE.Group(); g.add(serie);
    add(serie, k.cil(4.6, 0.6, C.cobre, 0.05, 32), 0, 2.25, 0);
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI * 2 / 16;
      const f = k.caja(3.6, 3.2, 0.35, C.aleta, 0.04);
      f.position.set(Math.cos(a) * 2.6, 4.1, Math.sin(a) * 2.6); f.rotation.y = -a; serie.add(f);
    }
    const venSerie = add(serie, ventilador(4, 9.6, 1.0), 0, 6.2, 0);

    /* ----- De torre ----- */
    const torre = new THREE.Group(); g.add(torre);
    add(torre, k.caja(6.2, 1.2, 6.2, C.cobre), 0, 2.55, 0);
    const tubosTorre = [];
    for (const [x, z] of [[-1.6, -1.6], [-0.6, 1.4], [0.6, -1.4], [1.6, 1.6]]) {
      const lado = x < 0 ? -1 : 1;
      const curva = new THREE.CatmullRomCurve3([V(x * 0.6, 2.6, z), V(x * 1.6 + lado * 0.6, 3.6, z), V(lado * 3.2, 6, z), V(lado * 3.2, 19, z)]);
      const t = k.tubo(curva, 0.38, C.cobre, 0.05); torre.add(t);
      tubosTorre.push(curva);
    }
    const aletasTorre = [];
    for (let i = 0; i < 24; i++) { const a = k.caja(10, 0.14, 6.4, C.aleta, 0.03); a.position.set(0, 6.4 + i * 0.52, 0); torre.add(a); aletasTorre.push(a); }
    const venTorre = ventilador(4.5, 11, 1.3); venTorre.rotation.z = Math.PI / 2; venTorre.position.set(-5.8, 12.5, 0); torre.add(venTorre);

    /* ----- Líquida (AIO) ----- */
    const aio = new THREE.Group(); g.add(aio);
    const bomba = add(aio, k.cil(3, 2.2, C.negro, 0.05, 32), 0, 3.1, 0);
    const anillo = add(aio, k.cil(2.2, 0.3, 0x8b6fe0, 0.03, 32), 0, 4.3, 0);
    const RAD = { y: 21, z: -8 };
    const radiador = add(aio, k.caja(26, 2.4, 6, 0x37405a), 0, RAD.y, RAD.z);
    for (let i = 0; i < 26; i++) add(aio, new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 5.6), new THREE.MeshToonMaterial({ color: 0x9aa3b2 })), -12.4 + i * 1, RAD.y, RAD.z);
    const vensAio = [-6.3, 6.3].map(x => { const v = ventilador(4.6, 12, 1.2); v.position.set(x, RAD.y - 1.9, RAD.z); aio.add(v); return v; });
    const ida = new THREE.CatmullRomCurve3([V(-1, 3.6, -1.8), V(-2, 6, -5), V(-6, 12, -9), V(-12.6, RAD.y, RAD.z)]);
    const vuelta = new THREE.CatmullRomCurve3([V(12.6, RAD.y, RAD.z), V(7, 12, -9), V(2.4, 6, -5), V(1, 3.6, -1.8)]);
    aio.add(k.tubo(ida, 0.6, C.tubo, 0.05)); aio.add(k.tubo(vuelta, 0.6, C.tubo, 0.05));

    /* ----- Partículas: calor y aire ----- */
    const geo = new THREE.SphereGeometry(0.22, 8, 6);
    // los puntos que van por dentro de los tubos se dibujan por encima para que se vean
    const mats = { caliente: new THREE.MeshBasicMaterial({ color: C.caliente }), frio: new THREE.MeshBasicMaterial({ color: C.frio }), aire: new THREE.MeshBasicMaterial({ color: C.aire }),
      calienteTubo: new THREE.MeshBasicMaterial({ color: C.caliente, depthTest: false }), frioTubo: new THREE.MeshBasicMaterial({ color: C.frio, depthTest: false }) };
    const parts = [];
    function soltar(tipo, datos) { if (parts.length > 220) return; const m = new THREE.Mesh(geo, mats[tipo === 'curva' ? datos.mat + 'Tubo' : datos.mat]); if (tipo === 'curva') m.renderOrder = 5; g.add(m); parts.push({ tipo, m, t: 0, ...datos }); }

    let tipo = 'serie', ventila = true, bombea = true, acum = 0;
    function mostrar(t) {
      tipo = t; serie.visible = t === 'serie'; torre.visible = t === 'torre'; aio.visible = t === 'aio';
      for (const p of parts.splice(0)) g.remove(p.m);
    }

    const etiquetas = [
      { texto: 'Procesador', obj: cpu, off: [-6, -0.6, 3] },
      { texto: 'Memoria RAM', obj: ram[1], off: [2.5, 2.5, 0] },
      { texto: 'Aletas de aluminio', obj: serie.children[1], off: [0, 1, 4], cuando: () => tipo === 'serie' },
      { texto: 'Ventilador', obj: venSerie, off: [5.5, 0.6, 0], cuando: () => tipo === 'serie' },
      { texto: 'Base de cobre', obj: torre.children[0], off: [0, 0, 4.5], cuando: () => tipo === 'torre' },
      { texto: 'Heatpipes (tubos de calor)', obj: torre.children[1], off: [5.2, 5.2, 3.4], cuando: () => tipo === 'torre' },
      { texto: 'Torre de aletas', obj: aletasTorre[20], off: [5.8, 0, 3], cuando: () => tipo === 'torre' },
      { texto: 'Ventilador', obj: venTorre, off: [-1.5, 6.5, 0], cuando: () => tipo === 'torre' },
      { texto: 'Bloque con la bomba', obj: bomba, off: [0, 2.4, 3.5], cuando: () => tipo === 'aio' },
      { texto: 'Radiador', obj: radiador, off: [0, 2.6, 0], cuando: () => tipo === 'aio' },
      { texto: 'Tubos con líquido', obj: aio.children[aio.children.length - 1], off: [8, 10, -6], cuando: () => tipo === 'aio' },
    ];

    const modos = [
      {
        id: 'serie', nombre: 'De serie', titulo: 'Disipador de serie',
        texto: 'Es el que viene en la caja del procesador. Un bloque de aletas de aluminio con un ventilador encima que sopla hacia abajo. El de Intel se fija con cuatro patillas apretadas en diagonal hasta oír el clic; el de AMD, con un clip o con tornillos. Suele traer la pasta ya puesta: no se añade más.',
        camara: { pos: [20, 18, 26], obj: [0, 4, 0] },
        async aplicar(ctx) { mostrar('serie'); ventila = true; await ctx.medir(76, 2200); },
      },
      {
        id: 'torre', nombre: 'De torre', titulo: 'Disipador de torre con heatpipes',
        texto: 'La base de cobre recoge el calor. Los heatpipes son tubos de cobre cerrados con un poco de líquido dentro: con el calor se evapora, sube a las aletas, se enfría y vuelve a bajar. El ventilador empuja aire a través de las aletas. Se fija con placa trasera y tornillos apretados en cruz. Ojo: es alto, hay que comprobar que no choca con la RAM ni con el panel lateral.',
        camara: { pos: [26, 22, 34], obj: [0, 9, 0] },
        async aplicar(ctx) { mostrar('torre'); ventila = true; await ctx.medir(63, 2200); },
      },
      {
        id: 'aio', nombre: 'Líquida (AIO)', titulo: 'Refrigeración líquida AIO («todo en uno»)',
        texto: 'Sobre el procesador va un bloque con una bomba. La bomba mueve el líquido: sale caliente hacia el radiador, los ventiladores del radiador le quitan el calor y vuelve frío al bloque. El radiador va arriba o delante de la caja, según el manual. La bomba se conecta a CPU_FAN o a AIO_PUMP.',
        camara: { pos: [10, 26, 40], obj: [0, 11, -4] },
        async aplicar(ctx) { mostrar('aio'); ventila = true; bombea = true; await ctx.medir(56, 2200); },
      },
      {
        id: 'sinfan', nombre: 'Ventilador sin conectar', peligro: true, titulo: 'El ventilador no está conectado a CPU_FAN',
        texto: 'Si el cable del ventilador no va a CPU_FAN, el ventilador no gira. Las aletas se llenan de calor y nadie se lo lleva. Muchas placas avisan al arrancar con «CPU Fan Error», porque no detectan que el ventilador gire.',
        camara: { pos: [26, 22, 34], obj: [0, 9, 0] },
        async aplicar(ctx, gen) {
          mostrar('torre'); ventila = false;
          ctx.burbuja('CPU Fan Error!', V(-5.8, 18.5, 0), 'peligro', 4000);
          await ctx.medir(95, 4200);
          if (!ctx.vivo(gen)) return;
          ctx.burbuja('Baja la velocidad para no quemarse', V(0, 22, 0), 'peligro', 3500);
        },
      },
      {
        id: 'sinbomba', nombre: 'Bomba sin conectar', peligro: true, titulo: 'La bomba de la AIO no está conectada',
        texto: 'Los ventiladores del radiador giran, pero si la bomba no está conectada el líquido no se mueve: el calor se queda en el bloque, encima del procesador. La bomba va a CPU_FAN o a AIO_PUMP, según el manual de la placa.',
        camara: { pos: [10, 26, 40], obj: [0, 11, -4] },
        async aplicar(ctx) { mostrar('aio'); ventila = true; bombea = false; ctx.burbuja('El líquido no se mueve', V(-6, 12, -9), 'peligro', 3500); await ctx.medir(94, 4200); },
      },
    ];

    return {
      grupo: g, modos, etiquetas, inicial: 'serie',
      medidor: { nombre: 'Temperatura del procesador', unidad: '°C', min: 20, max: 105, inicial: 35,
        zonas: [[-99, 72, 'ok', 'Bien'], [72, 88, 'aviso', 'Caliente'], [88, 999, 'peligro', 'Demasiado caliente']] },
      cadaFrame(dt) {
        const giro = ventila ? 10 : 0;
        venSerie.userData.rotor.rotation.y += giro * dt;
        venTorre.userData.rotor.rotation.y += giro * dt;
        vensAio.forEach(v => { v.userData.rotor.rotation.y += giro * dt; });
        anillo.material.color.setHSL((performance.now() / 4000) % 1, 0.6, 0.6);
        acum += dt;
        while (acum > 0.05) {
          acum -= 0.05;
          if (tipo === 'serie') {
            const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 3;
            soltar('sube', { mat: 'caliente', x: Math.cos(a) * r, z: Math.sin(a) * r, y: 2.6, vy: ventila ? 3 : 1.2, vida: ventila ? 1.4 : 1 });
          } else if (tipo === 'torre') {
            soltar('curva', { mat: 'caliente', curva: tubosTorre[Math.floor(Math.random() * 4)], vel: 0.55 });
            if (ventila) soltar('aire', { mat: 'aire', x: -6, y: 7 + Math.random() * 11, z: (Math.random() - 0.5) * 5 });
          } else {
            if (bombea) { soltar('curva', { mat: 'caliente', curva: ida, vel: 0.6 }); soltar('curva', { mat: 'frio', curva: vuelta, vel: 0.6 }); }
            if (ventila && bombea) soltar('sube', { mat: 'caliente', x: (Math.random() - 0.5) * 24, z: RAD.z + (Math.random() - 0.5) * 4, y: RAD.y + 1.3, vy: 4, vida: 1.2 });
            if (!bombea) soltar('sube', { mat: 'caliente', x: (Math.random() - 0.5) * 4, z: (Math.random() - 0.5) * 4, y: 4.3, vy: 0.8, vida: 0.8 });
          }
        }
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.t += dt;
          let fuera = false;
          if (p.tipo === 'sube') { p.m.position.set(p.x, p.y + p.vy * p.t, p.z); fuera = p.t > p.vida; }
          else if (p.tipo === 'curva') { const u = p.t * p.vel; if (u >= 1) fuera = true; else p.m.position.copy(p.curva.getPointAt(u)); }
          else if (p.tipo === 'aire') {
            p.m.position.set(p.x + 9 * p.t, p.y, p.z);
            if (p.m.position.x > 0.5) p.m.material = mats.caliente;
            fuera = p.m.position.x > 8;
          }
          if (fuera) { g.remove(p.m); parts.splice(i, 1); }
        }
      },
    };
  },
};
