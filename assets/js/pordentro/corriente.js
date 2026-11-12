// corriente.js — Corriente continua y alterna: qué hacen las cargas dentro del cable y qué dibuja el osciloscopio.
// Datos de la Sección 1 del Tema 4: 230 V eficaces, 325 V de pico, 50 Hz; señales continua, senoidal, cuadrada y pulsante.
import * as THREE from 'three';
import { M, METAL, caja, cil, redondo, lienzo, simboloCC, simboloCA } from '../modelos-t4.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

// Cada señal: s(t) entre −1 y 1, cómo se rotula y qué generador la da
const SENALES = {
  abierto: { s: () => 0, gen: ['PILA', '12 V', 'cc'], v: '0 V', i: '0 A', marcas: [[0, '0 V']] },
  cc: { s: () => 1, gen: ['PILA', '12 V', 'cc'], v: '12 V', i: '0,50 A', marcas: [[1, '+12 V'], [0, '0 V']] },
  ohm: { s: () => 1, gen: ['PILA', '12 V', 'cc'], v: '12 V', i: '0,25 A', marcas: [[1, '+12 V'], [0, '0 V']], k: 0.5 },
  ca: { s: t => Math.sin(TAU * 0.4 * t), gen: ['ENCHUFE', '230 V · 50 Hz', 'ca'], v: '230 V eficaces', i: 'cambia de sentido', marcas: [[1, '+325 V (pico)'], [0.707, '230 V eficaces'], [0, '0 V'], [-1, '−325 V (pico)']] },
  cuadrada: { s: t => (Math.sin(TAU * 0.6 * t) > 0 ? 1 : 0), gen: ['DATOS USB', '5 V', 'cuad'], v: '0 V o 5 V', i: 'a impulsos', marcas: [[1, '5 V = 1'], [0, '0 V = 0']] },
  pulsante: { s: t => Math.abs(Math.sin(TAU * 0.4 * t)), gen: ['RECTIFICADOR', 'sin filtrar', 'puls'], v: 'sube y baja', i: 'siempre igual sentido', marcas: [[1, 'pico'], [0, '0 V']] },
};

export default {
  id: 'corriente', icono: '〰️', titulo: 'Continua y alterna', tema: 'Tema 4 · Sección 1', realista: true,
  resumen: 'Mira dentro del cable: cómo se mueven las cargas con una pila, con el enchufe y con una señal digital, y qué forma dibuja cada una en el osciloscopio.',
  nota: 'El dibujo va a cámara lenta: la corriente del enchufe cambia de sentido 50 veces por segundo. Y recuerda: los 230 V del enchufe pueden matar; en el aula solo los mide el profesor.',
  camara: { pos: [0, 27, 36], obj: [0, 3, -3] },
  alfombrilla: [60, 46], suelo: -0.3, distancia: [10, 120],

  crear(ctx) {
    const g = new THREE.Group();
    const add = (m, x, y, z) => { m.position.set(x, y, z); m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.add(m); return m; };
    const Y = 1.1, AX = 15, AZ = 7.5, R = 3;

    /* ----- El circuito: un lazo de cable transparente ----- */
    const pts = [];
    const esquina = (cx, cz, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * Math.PI / 2; pts.push(V(cx + Math.cos(a) * R, Y, cz + Math.sin(a) * R)); } };
    esquina(AX - R, AZ - R, 0); esquina(-AX + R, AZ - R, Math.PI / 2); esquina(-AX + R, -AZ + R, Math.PI); esquina(AX - R, -AZ + R, Math.PI * 1.5);
    const lazo = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
    const funda = new THREE.Mesh(new THREE.TubeGeometry(lazo, 220, 0.85, 16, true), new THREE.MeshStandardMaterial({ color: 0xd9e8f2, transparent: true, opacity: 0.3, roughness: 0.15, depthWrite: false }));
    funda.renderOrder = 2; g.add(funda);
    const cobre = new THREE.Mesh(new THREE.TubeGeometry(lazo, 220, 0.14, 8, true), M(0xc77b45, { metalness: 0.8, roughness: 0.35 })); cobre.castShadow = true; g.add(cobre);
    // las cargas
    const N = 64;
    const cargas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 12, 10), new THREE.MeshStandardMaterial({ color: 0x3aa0ff, emissive: 0x1e78e6, emissiveIntensity: 0.9, roughness: 0.3 }), N);
    g.add(cargas);
    const fases = Array.from({ length: N }, (_, i) => ({ u: i / N, a: Math.random() * TAU, r: 0.2 + Math.random() * 0.26 }));
    const tmp = new THREE.Object3D(), tan = V(0, 0, 0), nor = V(0, 0, 0), bin = V(0, 0, 0);
    let avance = 0;
    function ponerCargas() {
      fases.forEach((f, i) => {
        const u = ((f.u + avance) % 1 + 1) % 1;
        lazo.getPointAt(u, tmp.position); lazo.getTangentAt(u, tan);
        nor.set(-tan.z, 0, tan.x); bin.set(0, 1, 0);
        tmp.position.addScaledVector(nor, Math.cos(f.a) * f.r).addScaledVector(bin, Math.sin(f.a) * f.r);
        tmp.updateMatrix(); cargas.setMatrixAt(i, tmp.matrix);
      });
      cargas.instanceMatrix.needsUpdate = true;
    }

    /* ----- Generador (a la izquierda) ----- */
    add(redondo(6, 4.4, 10, 0.8, M(0x2a2d33, { roughness: 0.5 }), 0.15), -AX, 0, 0);
    const G = lienzo(512, 320);
    const caraGen = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.25), new THREE.MeshStandardMaterial({ map: G.t, roughness: 0.5, emissive: 0xffffff, emissiveMap: G.t, emissiveIntensity: 0.25 }));
    caraGen.rotation.x = -Math.PI / 2; add(caraGen, -AX, 4.42, 0);
    function pintarGen([nombre, dato, tipo]) {
      const x = G.x; x.fillStyle = '#f2ead8'; x.fillRect(0, 0, 512, 320);
      x.fillStyle = '#1c1e22'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `bold ${nombre.length > 8 ? 64 : 92}px Arial, Helvetica, sans-serif`; x.fillText(nombre, 256, 74);
      x.font = `bold ${dato.length > 8 ? 54 : 84}px Arial, Helvetica, sans-serif`; x.fillText(dato, 256, 164);
      if (tipo === 'cc') simboloCC(x, 256, 262, 120, '#c2410c');
      if (tipo === 'ca') simboloCA(x, 256, 262, 140, '#c2410c');
      if (tipo === 'cuad' || tipo === 'puls') {
        x.strokeStyle = '#c2410c'; x.lineWidth = 12; x.lineJoin = 'round'; x.beginPath();
        if (tipo === 'cuad') [[160, 275], [160, 215], [224, 215], [224, 275], [288, 275], [288, 215], [352, 215], [352, 275]].forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
        else for (let i = 0; i <= 60; i++) { const u = i / 60, px = 150 + u * 212, py = 275 - Math.abs(Math.sin(u * Math.PI * 3)) * 62; i ? x.lineTo(px, py) : x.moveTo(px, py); }
        x.stroke();
      }
      G.t.needsUpdate = true;
    }
    // bornes + y −
    const bornePos = add(cil(0.7, 0.5, M(0xd8342c, { roughness: 0.5 }), 24), -AX, 4.6, 4), borneNeg = add(cil(0.7, 0.5, M(0x17181b, { roughness: 0.5 }), 24), -AX, 4.6, -4);

    /* ----- Bombilla (a la derecha) ----- */
    add(cil(1.9, 1.2, M(0x2a2d33, { roughness: 0.5 }), 32), AX, 0.6, 0);
    add(cil(1.15, 1.7, M(0xc9ced6, METAL), 28), AX, 2.0, 0);
    for (let i = 0; i < 4; i++) { const a = new THREE.Mesh(new THREE.TorusGeometry(1.17, 0.07, 8, 28), M(0xaeb4bc, METAL)); a.rotation.x = Math.PI / 2; add(a, AX, 1.45 + i * 0.36, 0); }
    const vidrio = new THREE.Mesh(new THREE.SphereGeometry(2.7, 36, 24), new THREE.MeshStandardMaterial({ color: 0xfff6d8, transparent: true, opacity: 0.28, roughness: 0.05, emissive: 0xffc24a, emissiveIntensity: 0, depthWrite: false }));
    vidrio.renderOrder = 3; vidrio.position.set(AX, 5.2, 0); g.add(vidrio);
    const filamento = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.09, 8, 24, Math.PI * 1.4), new THREE.MeshStandardMaterial({ color: 0x5a4a3a, emissive: 0xffa53a, emissiveIntensity: 0 }));
    filamento.position.set(AX, 5.0, 0); filamento.rotation.z = -Math.PI * 0.2; g.add(filamento);
    [-0.6, 0.6].forEach(dx => add(cil(0.05, 2.3, M(0x8f979f, METAL), 8), AX + dx, 3.9, 0));
    const luz = new THREE.PointLight(0xffc870, 0, 60, 1.6); luz.position.set(AX, 5.4, 0); g.add(luz);

    /* ----- Interruptor (delante) ----- */
    add(redondo(7, 0.8, 3.4, 0.5, M(0x2a2d33, { roughness: 0.5 }), 0.1), 0, 0.3, AZ);
    [-2.4, 2.4].forEach(dx => add(cil(0.45, 1.0, M(0xc9ced6, METAL), 20), dx, 1.4, AZ));
    const palanca = new THREE.Group(); palanca.position.set(-2.4, 1.9, AZ); g.add(palanca);
    const hoja = caja(5.2, 0.22, 0.9, M(0xd0a23a, { metalness: 0.9, roughness: 0.3 })); hoja.position.x = 2.5; hoja.castShadow = true; palanca.add(hoja);
    const pomo = cil(0.5, 1.4, M(0xd8342c, { roughness: 0.5 }), 20); pomo.position.set(4.6, 0.7, 0); pomo.castShadow = true; palanca.add(pomo);
    // hueco en el cable cuando el interruptor está abierto: se tapa con el propio interruptor

    /* ----- Resistencia (detrás), solo en «más resistencia» ----- */
    const resis = new THREE.Group(); resis.position.set(0, Y, -AZ); g.add(resis);
    const cuerpoR = cil(1.0, 5.4, M(0xd9c7a0, { roughness: 0.6 }), 28); cuerpoR.rotation.z = Math.PI / 2; cuerpoR.castShadow = true; resis.add(cuerpoR);
    [[-1.6, 0xd8342c], [-0.7, 0xd8342c], [0.2, 0x17181b], [1.5, 0xd0a23a]].forEach(([dx, c]) => { const b = cil(1.03, 0.45, M(c, { roughness: 0.5 }), 28); b.rotation.z = Math.PI / 2; b.position.x = dx; resis.add(b); });

    /* ----- Osciloscopio (al fondo) ----- */
    const OZ = -17;
    add(redondo(26, 13, 9, 1, M(0xdcdad3, { roughness: 0.6 }), 0.2), 0, 0, OZ);
    add(caja(16.6, 10.6, 0.3, M(0x101214, { roughness: 0.3 })), -3.6, 6.6, OZ + 4.45);
    const P = lienzo(800, 500);
    const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), new THREE.MeshBasicMaterial({ map: P.t, toneMapped: false }));
    pantalla.position.set(-3.6, 6.6, OZ + 4.62); g.add(pantalla);
    [[8.4, 9.6, 1.1], [8.4, 6.2, 1.1], [11, 9.6, 0.8], [11, 6.2, 0.8]].forEach(([x, y, r]) => { const k = cil(r, 0.9, M(0x33373e, { roughness: 0.4 }), 28); k.rotation.x = Math.PI / 2; add(k, x, y, OZ + 4.8); });
    [8.4, 11].forEach(x => { const c = cil(0.55, 0.8, M(0xc9ced6, METAL), 20); c.rotation.x = Math.PI / 2; add(c, x, 2.6, OZ + 4.8); });
    // sonda del osciloscopio hasta el cable
    const sonda = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(8.4, 2.6, OZ + 5.2), V(8.6, 1.2, OZ + 7.5), V(11, 0.4, -9.5), V(AX - 3.6, 1.6, -AZ + 0.2)]), 30, 0.14, 7), M(0x17181b, { roughness: 0.7 })); sonda.castShadow = true; g.add(sonda);
    add(cil(0.3, 1.6, M(0xd8342c, { roughness: 0.5 }), 16), AX - 3.6, 1.9, -AZ + 0.1);

    /* ----- Estado ----- */
    let id = 'abierto', tiempo = 0, cerrado = false, brillo = 0;
    const N_M = 400, muestras = new Float32Array(N_M); let cursor = 0, acum = 0;
    function trazar() {
      const x = P.x, W = 800, H = 500, sen = SENALES[id];
      x.fillStyle = '#06140f'; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(120,220,170,.16)'; x.lineWidth = 1;
      for (let i = 1; i < 10; i++) { x.beginPath(); x.moveTo(i * 80, 0); x.lineTo(i * 80, H); x.stroke(); }
      for (let j = 1; j < 6; j++) { x.beginPath(); x.moveTo(0, j * H / 6); x.lineTo(W, j * H / 6); x.stroke(); }
      const y0 = 225, amp = 150, yDe = v => y0 - v * amp;
      // líneas de referencia rotuladas
      x.font = 'bold 34px Arial, Helvetica, sans-serif'; x.textBaseline = 'bottom'; x.textAlign = 'left';
      for (const [v, txt] of sen.marcas) {
        x.setLineDash(v === 0 ? [] : [10, 8]); x.strokeStyle = v === 0 ? 'rgba(255,255,255,.45)' : 'rgba(255,210,90,.75)'; x.lineWidth = 2;
        x.beginPath(); x.moveTo(0, yDe(v)); x.lineTo(W, yDe(v)); x.stroke();
        x.fillStyle = v === 0 ? 'rgba(255,255,255,.8)' : '#ffd25a'; x.fillText(txt, 12, yDe(v) - 4);
      }
      x.setLineDash([]);
      // la traza (lo más nuevo, a la derecha)
      x.strokeStyle = '#5dffa8'; x.lineWidth = 5; x.lineJoin = 'round'; x.shadowColor = '#5dffa8'; x.shadowBlur = 14; x.beginPath();
      for (let i = 0; i < N_M; i++) { const v = muestras[(cursor + i) % N_M], px = (i / (N_M - 1)) * W, py = yDe(v); i ? x.lineTo(px, py) : x.moveTo(px, py); }
      x.stroke(); x.shadowBlur = 0;
      // lectura
      x.fillStyle = 'rgba(6,20,15,.85)'; x.fillRect(0, H - 60, W, 60);
      x.fillStyle = '#dfffee'; x.font = 'bold 32px Arial, Helvetica, sans-serif'; x.textBaseline = 'middle';
      x.textAlign = 'left'; x.fillText('V: ' + sen.v, 14, H - 29); x.textAlign = 'right'; x.fillText('I: ' + sen.i, W - 14, H - 29);
      P.t.needsUpdate = true;
    }
    function poner(nuevo, { conResistencia = false, interruptor = true } = {}) {
      if (SENALES[nuevo].gen[2] !== SENALES[id].gen[2]) muestras.fill(0); // otra señal: pantalla limpia
      id = nuevo; cerrado = interruptor;
      pintarGen(SENALES[id].gen);
      resis.visible = conResistencia;
      palanca.rotation.z = cerrado ? 0 : 0.75;
      // + y − solo tienen sentido en continua
      const polos = SENALES[id].gen[2] !== 'ca';
      bornePos.material = polos ? M(0xd8342c, { roughness: 0.5 }) : M(0x8f979f, METAL); borneNeg.material = polos ? M(0x17181b, { roughness: 0.5 }) : M(0x8f979f, METAL);
    }
    async function interruptor(on, ms = 500) {
      const a0 = palanca.rotation.z, a1 = on ? 0 : 0.75;
      await ctx.animar(ms, t => { palanca.rotation.z = a0 + (a1 - a0) * t; });
      cerrado = on;
    }
    const sobreCable = V(0, 5, AZ), sobreBombilla = V(AX, 10.5, 0), sobreOsc = V(-3.6, 15.5, OZ + 4);

    const modo = (mid, nombre, titulo, texto, fn, extra = {}) => ({ id: mid, nombre, titulo, texto, ...extra, async aplicar(ctx, gen) { await fn(gen); } });
    const modos = [
      modo('abierto', 'Circuito abierto', 'Sin camino cerrado no hay corriente',
        'Para que haya corriente hacen falta tres cosas: un generador que empuje las cargas (la pila), un camino cerrado de ida y vuelta, y un receptor que aproveche la energía (la bombilla). Con el interruptor abierto las cargas siguen ahí, dentro del cable, pero no se mueven: hay tensión, pero la intensidad es cero.',
        async gen => { poner('abierto', { interruptor: false }); ctx.burbuja('Interruptor abierto: las cargas no se mueven', sobreCable, '', 5000); }),
      modo('cc', 'Continua (pila)', 'Corriente continua: siempre en el mismo sentido',
        'Al cerrar el interruptor, la pila empuja las cargas siempre en el mismo sentido y con la misma fuerza. La tensión no cambia: en el osciloscopio es una línea recta. Tiene polo positivo y negativo. Es la corriente de las pilas, las baterías y todo lo que hay dentro del ordenador (12 V, 5 V y 3,3 V).',
        async gen => {
          poner('abierto', { interruptor: false });
          await ctx.esperar(500); if (!ctx.vivo(gen)) return;
          await interruptor(true); if (!ctx.vivo(gen)) return;
          poner('cc'); ctx.burbuja('Siempre en el mismo sentido', sobreCable, '', 4200);
          await ctx.esperar(2200); if (!ctx.vivo(gen)) return;
          ctx.burbuja('Una línea recta: no cambia', sobreOsc, '', 4200);
        }),
      modo('ca', 'Alterna (enchufe)', 'Corriente alterna: va y viene',
        'En el enchufe las cargas no avanzan: van y vienen. Cambian de sentido 50 veces por segundo (50 Hz); aquí lo ves a cámara lenta. La tensión sube hasta +325 V, baja a cero, llega a −325 V y vuelve: una onda senoidal. Los 230 V que decimos siempre son el valor eficaz, la «nota media» de la onda, y es lo que marca el polímetro. No tiene un + y un − fijos. Ojo: una bombilla de verdad no parpadea así; a 50 Hz va tan deprisa que el ojo no lo nota.',
        async gen => {
          poner('ca'); ctx.burbuja('Van y vienen (a cámara lenta)', sobreCable, '', 4200);
          await ctx.esperar(2600); if (!ctx.vivo(gen)) return;
          ctx.burbuja('Onda senoidal: 230 V eficaces, 325 V de pico', sobreOsc, '', 5200);
          await ctx.esperar(3000); if (!ctx.vivo(gen)) return;
          ctx.burbuja('En la realidad no parpadea: 50 veces por segundo no se ven', sobreBombilla, '', 5200);
          await ctx.esperar(3200); if (!ctx.vivo(gen)) return;
          ctx.burbuja('230 V: solo los mide el profesor', V(-AX, 9, 0), 'peligro', 5200);
        }),
      modo('cuadrada', 'Cuadrada (datos)', 'Señal cuadrada o digital: solo dos valores',
        'Los datos viajan así por un cable USB o de red, y así es el reloj del procesador: solo hay dos valores, alto (1) y bajo (0), y se salta de uno a otro de golpe. Las cargas avanzan a impulsos. Aquí la bombilla hace de testigo: encendida es un 1; apagada, un 0.',
        async gen => { poner('cuadrada'); ctx.burbuja('1 · 0 · 1 · 0…', sobreBombilla, '', 4200); await ctx.esperar(2400); if (!ctx.vivo(gen)) return; ctx.burbuja('Solo dos valores: 0 V y 5 V', sobreOsc, '', 4600); }),
      modo('pulsante', 'Pulsante', 'Señal pulsante: mismo sentido, pero a golpes',
        'Es lo que sale de un rectificador antes de filtrarlo, dentro de la fuente de alimentación: la alterna ya no cambia de sentido (las dos mitades de la onda quedan hacia arriba), pero la tensión sigue subiendo y bajando. Todavía no vale para un chip: después, los condensadores la alisan hasta dejarla continua.',
        async gen => { poner('pulsante'); ctx.burbuja('Mismo sentido, pero a golpes', sobreCable, '', 4200); await ctx.esperar(2400); if (!ctx.vivo(gen)) return; ctx.burbuja('Nunca baja de cero', sobreOsc, '', 4600); }),
      modo('ohm', 'Más resistencia', 'Ley de Ohm: más resistencia, menos corriente',
        'Misma pila de 12 V, pero ahora la corriente tiene que pasar también por una resistencia: es como estrechar la tubería. Con el doble de resistencia pasa la mitad de intensidad (I = V ÷ R): de 0,50 A a 0,25 A. Las cargas van más despacio y la bombilla luce menos, porque la potencia es P = V × I.',
        async gen => {
          poner('cc'); ctx.burbuja('Sin resistencia añadida: 0,50 A', sobreCable, '', 2600);
          await ctx.esperar(2800); if (!ctx.vivo(gen)) return;
          poner('ohm', { conResistencia: true }); ctx.burbuja('Con el doble de resistencia: 0,25 A', V(0, 5, -AZ), '', 5200);
          await ctx.esperar(2600); if (!ctx.vivo(gen)) return;
          ctx.burbuja('Menos corriente: luce menos', sobreBombilla, '', 4600);
        }),
    ];

    const etiquetas = [
      { texto: 'Generador', obj: caraGen, off: [-2, 4, 0] },
      { texto: 'Interruptor', obj: palanca, off: [2.4, -3.2, 3] },
      { texto: 'Receptor (bombilla)', obj: vidrio, off: [3.5, -5.5, 3] },
      { texto: 'Resistencia', obj: resis, off: [0, 2.6, 0], cuando: () => resis.visible },
      { texto: 'Osciloscopio: dibuja la tensión', obj: pantalla, off: [0, 7.4, 0] },
      { texto: 'Cargas dentro del cable', obj: funda, off: [-8, 2.2, AZ], cuando: () => id === 'abierto' },
    ];

    poner('abierto', { interruptor: false }); ponerCargas(); trazar();
    return {
      grupo: g, modos, etiquetas, inicial: 'abierto',
      cadaFrame(dt) {
        tiempo += dt;
        const sen = SENALES[id], k = sen.k ?? 1;
        const s = cerrado ? sen.s(tiempo) : 0;
        // las cargas: en continua avanzan; en alterna, van y vienen
        avance += s * k * 0.055 * dt * (id === 'ca' ? 1.6 : 1);
        ponerCargas();
        // la bombilla responde un poco más despacio que la señal
        const meta = Math.abs(s) * k;
        brillo += (meta - brillo) * Math.min(1, dt * 9);
        filamento.material.emissiveIntensity = brillo * 5; vidrio.material.emissiveIntensity = brillo * 0.9; luz.intensity = brillo * 260;
        // osciloscopio
        acum += dt;
        while (acum > 0.0125) { acum -= 0.0125; muestras[cursor] = s; cursor = (cursor + 1) % N_M; }
        trazar();
      },
    };
  },
};
