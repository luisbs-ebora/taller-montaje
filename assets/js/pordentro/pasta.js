// pasta.js — La pasta térmica vista en corte: el procesador, el disipador y lo que hay entre los dos.
// Los huecos están exagerados (en la realidad son microscópicos) para que se vea el aire y la pasta.
import * as THREE from 'three';

const C = { placa: 0x2f7d4f, zocalo: 0x37405a, sustrato: 0x3c9a5f, chapa: 0xc9ced6, cobre: 0xd98c4a, aleta: 0xdfe3e8,
  pasta: 0x8f96a0, aire: 0x7cc8ff, plastico: 0x7cc7ff, negro: 0x2b2a33, calor: 0xff8a3d };

const N = 28, ANCHO = 13.4, X0 = -ANCHO / 2, PASO = ANCHO / N;
const Y_CHAPA = 3.6, Y_BASE = 5.4;     // arriba de la chapa del procesador / abajo de la base del disipador

function azar(semilla) { let s = semilla; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

export default {
  id: 'pasta', icono: '🧈', titulo: 'La pasta térmica', tema: 'Tema 3 · Sesión 2',
  resumen: 'El procesador y el disipador parecen lisos, pero entre los dos queda aire. Mira en corte qué pasa sin pasta, con poca, con un guisante y con demasiada.',
  nota: 'Los huecos se ven enormes para que se entiendan: en la realidad son microscópicos. Las temperaturas son orientativas, con el procesador trabajando a tope.',
  camara: { pos: [5, 9, 24], obj: [0, 5.2, 0] },
  alfombrilla: [40, 22],

  crear(ctx) {
    const { k } = ctx;
    const g = new THREE.Group();
    const poner = (m, x, y, z = 0) => { m.position.set(x, y, z); g.add(m); return m; };
    const rnd = azar(7);

    const placa = poner(k.caja(32, 1, 12, C.placa), 0, 0);
    const zocalo = poner(k.caja(18, 1.2, 10, C.zocalo), 0, 1.1);
    const sustrato = poner(k.caja(14.6, 0.7, 8.6, C.sustrato), 0, 2.05);
    const nucleo = poner(new THREE.Mesh(new THREE.BoxGeometry(5, 0.35, 0.2), new THREE.MeshBasicMaterial({ color: 0xffb347 })), 0, 2.55, 4.35);
    const chapa = poner(k.caja(14, 1.0, 8, C.chapa), 0, Y_CHAPA - 0.5);

    // Rugosidad de la chapa (arriba) y de la base del disipador (abajo)
    const altoChapa = [], altoBase = [];
    for (let i = 0; i < N; i++) { altoChapa.push(0.1 + rnd() * 0.55); altoBase.push(0.1 + rnd() * 0.55); }
    const matChapa = new THREE.MeshToonMaterial({ color: C.chapa }), matCobre = new THREE.MeshToonMaterial({ color: C.cobre });
    for (let i = 0; i < N; i++) {
      const x = X0 + PASO * (i + 0.5);
      const a = new THREE.Mesh(new THREE.BoxGeometry(PASO, altoChapa[i], 8), matChapa);
      a.position.set(x, Y_CHAPA + altoChapa[i] / 2, 0); g.add(a);
    }

    // El disipador (base de cobre, aletas y ventilador) va en un grupo para poder subirlo y bajarlo
    const disip = new THREE.Group(); g.add(disip);
    const base = k.caja(16, 1.4, 9, C.cobre); base.position.set(0, Y_BASE + 0.7, 0); disip.add(base);
    for (let i = 0; i < N; i++) {
      const x = X0 + PASO * (i + 0.5);
      const b = new THREE.Mesh(new THREE.BoxGeometry(PASO, altoBase[i], 9), matCobre);
      b.position.set(x, Y_BASE - altoBase[i] / 2, 0); disip.add(b);
    }
    const aletas = [];
    for (let i = 0; i < 9; i++) { const a = k.caja(0.45, 6, 9, C.aleta, 0.04); a.position.set(-7 + i * 1.75, Y_BASE + 1.4 + 3, 0); disip.add(a); aletas.push(a); }
    const marco = k.caja(16.4, 1.2, 9.4, C.negro); marco.position.set(0, Y_BASE + 8.0, 0); disip.add(marco);
    const rotor = new THREE.Group(); rotor.position.set(0, Y_BASE + 8.8, 0); disip.add(rotor);
    for (let i = 0; i < 5; i++) { const p = k.caja(3.6, 0.2, 1.4, 0x4a4a55, 0.04); p.position.x = 2.2; const s = new THREE.Group(); s.rotation.y = i * Math.PI * 2 / 5; p.rotation.x = 0.35; s.add(p); rotor.add(s); }
    rotor.add(k.cil(1.1, 0.5, 0x2b2a33, 0.04));
    // El plástico protector de la base (el error de olvidarse de quitarlo)
    const plastico = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.14, 9.6), new THREE.MeshToonMaterial({ color: C.plastico, transparent: true, opacity: 0.75 }));
    plastico.position.set(0, Y_BASE - 0.5, 0); disip.add(plastico);

    // Lo que hay en cada hueco: aire o pasta
    const matAire = new THREE.MeshBasicMaterial({ color: C.aire, transparent: true, opacity: 0.8 });
    const matPasta = new THREE.MeshToonMaterial({ color: C.pasta });
    const huecos = [];
    for (let i = 0; i < N; i++) {
      const x = X0 + PASO * (i + 0.5);
      const y0 = Y_CHAPA + altoChapa[i], y1 = Y_BASE - altoBase[i];
      const geo = new THREE.BoxGeometry(PASO * 0.98, Math.max(0.05, y1 - y0), 7.9);
      const aire = new THREE.Mesh(geo, matAire); aire.position.set(x, (y0 + y1) / 2, 0); g.add(aire);
      const pas = new THREE.Mesh(geo, matPasta); pas.position.copy(aire.position); pas.scale.y = 0; pas.visible = false; g.add(pas);
      huecos.push({ x, aire, pasta: pas, lleno: false });
    }
    // La gota de pasta y lo que rebosa
    const gota = k.esfera(1, C.pasta, 0.05); gota.visible = false; g.add(gota);
    const rebose = [[-7.4, 2.9, 0], [7.4, 2.9, 1], [-6.4, 1.9, -3], [6.9, 1.9, 3], [-8.6, 1.8, 0]].map(([x, y, z]) => {
      const m = k.esfera(0.9, C.pasta, 0.04); m.position.set(x, y, z); m.scale.set(1, 0.6, 1); m.visible = false; g.add(m); return m;
    });

    /* ----- Calor: puntos naranjas que suben desde el procesador ----- */
    const geoCalor = new THREE.SphereGeometry(0.18, 8, 6);
    const matCalor = new THREE.MeshBasicMaterial({ color: C.calor });
    const matFrio = new THREE.MeshBasicMaterial({ color: 0x9aa3b2 });
    const calor = [];
    let ritmo = 0, acumulado = 0, girando = 1, bajado = true;
    function soltarCalor() {
      const i = Math.floor(Math.random() * N);
      const m = new THREE.Mesh(geoCalor, matCalor);
      m.position.set(huecos[i].x + (Math.random() - 0.5) * PASO, Y_CHAPA + 0.1, (Math.random() - 0.5) * 6);
      g.add(m);
      calor.push({ m, i, v: 3 + Math.random() * 2, vida: 4, parado: 0 });
    }

    // Estado según el modo
    const estado = { film: false };
    function pasaPor(i) { return bajado && huecos[i].lleno && !estado.film; }

    function vaciar() {
      for (const hh of huecos) { hh.lleno = false; hh.pasta.visible = false; hh.pasta.scale.y = 0; hh.aire.visible = true; }
      rebose.forEach(m => { m.visible = false; m.scale.set(1, 0.6, 1); });
      gota.visible = false;
    }
    function ponerDisip(subido) { disip.position.y = subido ? 6 : 0; bajado = !subido; }

    // La pasta se reparte desde el centro hacia fuera hasta cubrir una parte (0..1)
    async function repartir(parte, ms, gen) {
      const orden = huecos.map((hh, i) => ({ hh, d: Math.abs(i - (N - 1) / 2) })).sort((a, b) => a.d - b.d);
      const cuantos = Math.round(N * parte);
      await ctx.animar(ms, t => {
        const n = Math.round(cuantos * t);
        orden.forEach((o, j) => {
          const si = j < n;
          o.hh.lleno = si; o.hh.pasta.visible = si; o.hh.aire.visible = !si;
          if (si) o.hh.pasta.scale.y = 1;
        });
      }, ctx.ease.salida);
    }
    async function ponerPasta(tam, gen) {
      girando = 1;
      vaciar(); ponerDisip(true); estado.film = false; plastico.visible = false;
      gota.visible = true; gota.scale.setScalar(tam); gota.position.set(0, Y_CHAPA + 8, 0);
      await ctx.animar(500, t => { gota.position.y = Y_CHAPA + 8 - (8 - 0.4 * tam) * t; }, ctx.ease.rebote);
      if (!ctx.vivo(gen)) return false;
      if (!ctx.rapido) ctx.burbuja(tam < 0.5 ? 'Muy poca' : tam > 1.3 ? '¡Demasiada!' : 'Un guisante', new THREE.Vector3(0, Y_CHAPA + 2, 0), tam > 1.3 ? 'peligro' : '');
      await ctx.esperar(700);
      if (!ctx.vivo(gen)) return false;
      // baja el disipador y aplasta la gota
      await ctx.animar(900, t => { disip.position.y = 6 * (1 - t); gota.scale.set(tam * (1 + t * 2.5), tam * Math.max(0.05, 1 - t), tam * (1 + t)); gota.position.y = Y_CHAPA + 0.4 * tam * (1 - t); }, ctx.ease.suave);
      bajado = true; gota.visible = false;
      return true;
    }

    const modos = [
      {
        id: 'sin', nombre: 'Sin pasta', titulo: 'Sin pasta: aire entre las dos piezas',
        texto: 'La chapa del procesador y la base del disipador tienen pequeñas imperfecciones. Entre ellas queda aire, y el aire casi no deja pasar el calor: los puntos naranjas se quedan atascados. El procesador se calienta tanto que baja su velocidad para no quemarse.',
        async aplicar(ctx, gen) {
          vaciar(); estado.film = false; plastico.visible = false; ponerDisip(true);
          ritmo = 26; girando = 1;
          await ctx.animar(800, t => { disip.position.y = 6 * (1 - t); }, ctx.ease.suave); bajado = true;
          if (!ctx.vivo(gen)) return;
          ctx.burbuja('Aire: el calor no pasa', new THREE.Vector3(0, Y_BASE - 0.3, 4), 'peligro');
          await ctx.medir(96, 3500);
        },
      },
      {
        id: 'poca', nombre: 'Muy poca',
        titulo: 'Muy poca pasta: solo se cubre el centro',
        texto: 'Con una gota muy pequeña la pasta solo llena los huecos del centro. Por los bordes sigue habiendo aire, así que enfría algo mejor que sin pasta, pero no lo suficiente.',
        async aplicar(ctx, gen) {
          ritmo = 26;
          if (!(await ponerPasta(0.4, gen))) return;
          await repartir(0.35, 700, gen);
          if (!ctx.vivo(gen)) return;
          await ctx.medir(84, 2800);
        },
      },
      {
        id: 'bien', nombre: 'Un guisante ✓', titulo: 'Un guisante en el centro: así se hace',
        texto: 'Un punto del tamaño de un guisante en el centro del procesador. Al apretar el disipador, la pasta se reparte sola y rellena los huecos: el calor pasa al disipador y el ventilador se lo lleva.',
        async aplicar(ctx, gen) {
          ritmo = 26;
          if (!(await ponerPasta(1, gen))) return;
          await repartir(1, 1000, gen);
          if (!ctx.vivo(gen)) return;
          ctx.burbuja('Rellena los huecos', new THREE.Vector3(0, Y_BASE - 0.3, 4));
          await ctx.medir(62, 2800);
        },
      },
      {
        id: 'mucha', nombre: 'Demasiada', peligro: true, titulo: 'Demasiada pasta: no enfría más y ensucia',
        texto: 'Más pasta no enfría mejor: los huecos ya estaban llenos con un guisante. Lo que sobra rebosa por los bordes y cae sobre el zócalo y la placa. Hay que limpiarlo con alcohol isopropílico y un paño sin pelusa.',
        async aplicar(ctx, gen) {
          ritmo = 26;
          if (!(await ponerPasta(1.75, gen))) return;
          await repartir(1, 700, gen);
          if (!ctx.vivo(gen)) return;
          rebose.forEach(m => { m.visible = true; m.scale.set(0.01, 0.01, 0.01); });
          await ctx.animar(1200, t => rebose.forEach((m, i) => { const s = Math.min(1, t * 1.4 - i * 0.08); const v = Math.max(0.01, s); m.scale.set(v, v * 0.6, v); }), ctx.ease.salida);
          if (!ctx.vivo(gen)) return;
          ctx.burbuja('Rebosa sobre el zócalo', rebose[0].position.clone().add(new THREE.Vector3(0, 1.5, 0)), 'peligro');
          await ctx.medir(63, 2200);
        },
      },
      {
        id: 'plastico', nombre: 'Con el plástico puesto', peligro: true, titulo: 'Te has olvidado el plástico de la base',
        texto: 'Muchos disipadores traen un plástico protector en la base. Si no se quita, la pasta queda por debajo, pero el plástico tapa el paso del calor. Es un error muy frecuente: el procesador se calienta enseguida y el equipo se apaga solo para protegerse.',
        async aplicar(ctx, gen) {
          ritmo = 26; girando = 1;
          plastico.visible = true; estado.film = true;
          vaciar(); ponerDisip(true);
          await ctx.animar(700, t => { disip.position.y = 6 * (1 - t); }, ctx.ease.suave); bajado = true;
          if (!ctx.vivo(gen)) return;
          await repartir(1, 600, gen);
          if (!ctx.vivo(gen)) return;
          ctx.burbuja('¡El plástico tapa el calor!', new THREE.Vector3(0, Y_BASE, 4.6), 'peligro');
          await ctx.medir(100, 3200);
          if (!ctx.vivo(gen)) return;
          ritmo = 0; girando = 0;
          ctx.burbuja('Se apaga para protegerse', new THREE.Vector3(0, Y_BASE + 10, 0), 'peligro', 3500);
        },
      },
    ];

    const etiquetas = [
      { texto: 'Placa base', obj: placa, off: [-9, 0.4, 5] },
      { texto: 'Zócalo', obj: zocalo, off: [-10, 0, 4] },
      { texto: 'Procesador', obj: sustrato, off: [8.2, -0.2, 4] },
      { texto: 'Chapa del procesador', obj: chapa, off: [9.6, 0.3, 4] },
      { texto: 'Base de cobre', obj: base, off: [9.6, 0.2, 4] },
      { texto: 'Aletas', obj: aletas[8], off: [1.8, 2, 4] },
      { texto: 'Ventilador', obj: rotor, off: [7, 0.5, 4] },
      { texto: 'Aquí: aire o pasta', obj: huecos[N - 1].aire, off: [2.6, 0.2, 4] },
    ];

    return {
      grupo: g, modos, etiquetas, inicial: 'sin',
      medidor: { nombre: 'Temperatura del procesador', unidad: '°C', min: 20, max: 105, inicial: 35,
        zonas: [[-99, 72, 'ok', 'Bien'], [72, 88, 'aviso', 'Caliente'], [88, 99, 'peligro', 'Baja la velocidad'], [99, 999, 'peligro', 'Se apaga']] },
      cadaFrame(dt) {
        rotor.rotation.y += girando * 9 * dt;
        // el núcleo brilla más cuanto más caliente
        const t = Math.max(0, Math.min(1, (ctx.medidor - 40) / 60));
        nucleo.material.color.setRGB(1, 0.75 - 0.6 * t, 0.3 - 0.25 * t);
        acumulado += ritmo * dt;
        while (acumulado > 1) { acumulado -= 1; if (calor.length < 160) soltarCalor(); }
        for (let j = calor.length - 1; j >= 0; j--) {
          const p = calor[j];
          p.vida -= dt;
          const yHueco = Y_BASE - 0.5;
          if (p.m.position.y < yHueco && !pasaPor(p.i)) {
            // atascado en el aire: tiembla y se apaga
            p.m.position.y = Math.min(p.m.position.y + p.v * dt * 0.5, yHueco - 0.2);
            p.parado += dt;
            if (p.parado > 0.6) p.m.material = matFrio;
            if (p.parado > 1.2) p.vida = 0;
          } else {
            p.m.position.y += p.v * dt * (p.m.position.y > Y_BASE + 1.4 ? 1.6 : 1);
            if (p.m.position.y > Y_BASE + 9 && girando) p.m.position.x += (p.m.position.x > 0 ? 1 : -1) * 6 * dt;
          }
          if (p.vida <= 0 || p.m.position.y > Y_BASE + 13) { g.remove(p.m); calor.splice(j, 1); }
        }
      },
    };
  },
};
