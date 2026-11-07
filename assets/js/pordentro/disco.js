// disco.js — Un disco duro abierto junto a un SSD M.2: por qué uno tiene piezas que se mueven y el otro no.
import * as THREE from 'three';

const C = { cuerpo: 0x5a5f6b, plato: 0xdfe3e8, eje: 0x9aa3b2, brazo: 0xc9ced6, iman: 0x37405a, pcb: 0x2f7d4f,
  chip: 0x2b2a33, oro: 0xe3a23b, rojo: 0xe5484d, verde: 0x3fbf6a };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export default {
  id: 'disco', icono: '💽', titulo: 'Disco duro y SSD', tema: 'Tema 2 · Sesión 2 y UD5',
  resumen: 'Un disco duro tiene platos que giran y un brazo que se mueve; un SSD solo tiene chips. Mira cómo leen un archivo, qué pasa con un golpe y cómo se aparca el cabezal.',
  nota: 'El disco duro está abierto para verlo: uno de verdad no se abre, porque el polvo lo estropea. El SSD está dibujado más grande de lo que es. Los tiempos son orientativos.',
  camara: { pos: [3, 34, 30], obj: [2, 0, 1] },
  alfombrilla: [50, 34],
  distancia: [12, 100],

  crear(ctx) {
    const { k } = ctx;
    const g = new THREE.Group();
    const add = (padre, m, x, y, z) => { m.position.set(x, y, z); padre.add(m); return m; };

    /* ----- Disco duro ----- */
    const hdd = new THREE.Group(); hdd.position.set(-6, 0, 0); g.add(hdd);
    const cuerpo = add(hdd, k.caja(14.6, 1.2, 20, C.cuerpo), 0, 0.6, 0);
    for (const [w, d, x, z] of [[14.6, 0.4, 0, -10], [14.6, 0.4, 0, 10], [0.4, 20, -7.3, 0], [0.4, 20, 7.3, 0]]) add(hdd, k.caja(w, 1.4, d, C.cuerpo, 0.04), x, 1.7, z);
    const O = { x: 0, z: -2.5 };
    const platos = new THREE.Group(); platos.position.set(O.x, 0, O.z); hdd.add(platos);
    const plato1 = add(platos, k.cil(6.2, 0.16, C.plato, 0.04, 56), 0, 1.75, 0);
    const plato2 = add(platos, k.cil(6.2, 0.16, C.plato, 0.04, 56), 0, 2.45, 0);
    add(platos, k.cil(1.2, 1.6, C.eje, 0.04, 24), 0, 2.2, 0);
    // pistas pintadas y un «sector» marcado para ver que giran
    for (const r of [2.6, 3.6, 4.6, 5.6]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.03, 4, 64), new THREE.MeshBasicMaterial({ color: 0xa9b0bb })); t.rotation.x = Math.PI / 2; t.position.y = 2.55; platos.add(t); }
    const sector = add(platos, new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.5), new THREE.MeshBasicMaterial({ color: C.verde })), 4.6, 2.56, 0);
    const aranazo = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.12, 6, 64), new THREE.MeshBasicMaterial({ color: C.rojo }));
    aranazo.rotation.x = Math.PI / 2; aranazo.position.y = 2.57; aranazo.visible = false; platos.add(aranazo);

    // Brazo con el cabezal
    const P = { x: 5.4, z: 6.4 }, L = 8.4;
    const brazo = new THREE.Group(); brazo.position.set(P.x, 0, P.z); hdd.add(brazo);
    add(brazo, k.cil(1.1, 1.8, C.eje, 0.04, 20), 0, 2.2, 0);
    const barra = add(brazo, k.caja(L, 0.22, 1.1, C.brazo, 0.04), L / 2, 2.75, 0);
    const cabezal = add(brazo, k.caja(0.7, 0.3, 0.7, C.chip, 0.03), L, 2.64, 0);
    add(brazo, k.caja(2.4, 0.3, 2.2, C.brazo, 0.04), -1.6, 2.6, 0);
    const iman = add(hdd, k.caja(3.4, 1, 3.6, C.iman), P.x + 1.2, 1.8, P.z + 2.2);
    const rampa = add(hdd, k.caja(1.6, 0.8, 1.2, 0x4a4a55, 0.03), 0, 2.7, 0);
    const conector = add(hdd, k.caja(6, 1, 0.8, C.chip, 0.04), -2.5, 1.2, 10.4);

    // Ángulo del brazo para un radio de pista dado (r = distancia del cabezal al eje de los platos)
    const a0 = Math.atan2(O.z - P.z, O.x - P.x);
    const radioDe = a => Math.hypot(P.x + L * Math.cos(a) - O.x, P.z + L * Math.sin(a) - O.z);
    function anguloPara(r) {
      let mejor = a0, err = 99;
      for (let a = a0; a < a0 + 1.4; a += 0.002) { const e = Math.abs(radioDe(a) - r); if (e < err) { err = e; mejor = a; } }
      return mejor;
    }
    const ponerBrazo = a => { brazo.rotation.y = -a; };
    const APARCADO = anguloPara(7.2);
    { const hx = P.x + L * Math.cos(APARCADO), hz = P.z + L * Math.sin(APARCADO); rampa.position.set(hx, 2.55, hz); }
    let anguloBrazo = anguloPara(4.6);
    ponerBrazo(anguloBrazo);
    async function moverBrazo(r, ms = 450) {
      const a1 = r === 'aparcar' ? APARCADO : anguloPara(r), a0b = anguloBrazo;
      await ctx.animar(ms, t => { anguloBrazo = a0b + (a1 - a0b) * t; ponerBrazo(anguloBrazo); }, ctx.ease.suave);
    }

    /* ----- SSD M.2 ----- */
    const ssd = new THREE.Group(); ssd.position.set(13, 0, 0); g.add(ssd);
    const pcb = add(ssd, k.caja(4.8, 0.3, 17, C.pcb), 0, 0.45, 0);
    const controlador = add(ssd, k.caja(3, 0.5, 3, C.chip, 0.04), 0, 0.85, -4.6);
    const dram = add(ssd, k.caja(2.4, 0.4, 1.5, C.chip, 0.04), 0, 0.8, -1.6);
    const nand = [add(ssd, k.caja(3.6, 0.5, 3.8, C.chip, 0.04), 0, 0.85, 1.8), add(ssd, k.caja(3.6, 0.5, 3.8, C.chip, 0.04), 0, 0.85, 6.2)];
    const contactos = add(ssd, k.caja(4.2, 0.12, 1.4, C.oro, 0.02), 0, 0.66, -7.9);
    const chipsSsd = [controlador, dram, ...nand].map(c => { c.material = c.material.clone(); return c; });
    function brilloChips(on) { chipsSsd.forEach(c => { c.material.emissive.setHex(on ? 0x3fbf6a : 0); c.material.emissiveIntensity = on ? 0.9 : 0; }); }

    /* ----- Estado ----- */
    let rpm = 1, rpmMeta = 1, temblor = 0, tiempo = 0;
    function base() {
      aranazo.visible = false; brilloChips(false); temblor = 0;
      hdd.position.set(-6, 0, 0); ssd.position.set(13, 0, 0); cabezal.position.y = 2.64;
      rpmMeta = 1; sector.material.color.setHex(C.verde);
    }

    const etiquetas = [
      { texto: 'Platos', obj: plato2, off: [-4.5, 0.6, -4] },
      { texto: 'Eje del motor', obj: platos, off: [-2.6, 2.8, 2.2] },
      { texto: 'Brazo', obj: barra, off: [0, 0.8, 0] },
      { texto: 'Cabezal', obj: cabezal, off: [0, 0.9, 0] },
      { texto: 'Motor del brazo (imán)', obj: iman, off: [0, 1.2, 0] },
      { texto: 'Rampa de aparcado', obj: rampa, off: [1.6, 0.9, 0] },
      { texto: 'Conector SATA', obj: conector, off: [0, 1, 1] },
      { texto: 'Controlador', obj: controlador, off: [3.6, 0.6, 0] },
      { texto: 'Caché DRAM', obj: dram, off: [3.6, 0.5, 0] },
      { texto: 'Chips NAND (los datos)', obj: nand[1], off: [4.2, 0.6, 0] },
      { texto: 'Contactos M.2', obj: contactos, off: [3.4, 0.4, 0] },
    ];

    const modos = [
      {
        id: 'partes', nombre: 'Las partes', titulo: 'Qué hay dentro',
        texto: 'El disco duro (HDD) guarda los datos en platos magnéticos que giran a 5400 o 7200 vueltas por minuto. Un brazo mueve el cabezal, que flota sobre el plato a una distancia más pequeña que una huella dactilar, sin tocarlo. El SSD no tiene nada que se mueva: los datos están en chips NAND y el controlador los gestiona.',
        async aplicar(ctx) { base(); await moverBrazo(4.6); },
      },
      {
        id: 'leer', nombre: 'Abrir un archivo', titulo: 'Abrir un archivo: brazo frente a chips',
        texto: 'El disco duro tiene que mover el brazo hasta la pista y esperar a que el plato gire hasta el trozo que busca: tarda unos 10 milisegundos cada vez. El SSD solo tiene que leer sus chips: menos de 0,1 milisegundos. Por eso un ordenador con SSD arranca y abre los programas mucho más rápido.',
        async aplicar(ctx, gen) {
          base();
          for (const r of [2.6, 5.6, 3.6]) {
            await moverBrazo(r, 420);
            if (!ctx.vivo(gen)) return;
            ctx.burbuja('Busca la pista…', cabezal.getWorldPosition(new THREE.Vector3()).add(V(0, 1.5, 0)), '', 900);
            await ctx.esperar(500);
            if (!ctx.vivo(gen)) return;
          }
          ctx.burbuja('Disco duro: unos 10 ms', V(-6, 5, -10), '', 3500);
          brilloChips(true);
          ctx.burbuja('SSD: menos de 0,1 ms', V(13, 3.5, -6), '', 3500);
          await ctx.esperar(900);
          if (ctx.vivo(gen)) brilloChips(false);
        },
      },
      {
        id: 'golpe', nombre: 'Un golpe encendido', peligro: true, titulo: 'Un golpe con el disco duro funcionando',
        texto: 'Si el ordenador recibe un golpe mientras el disco duro gira, el cabezal puede tocar el plato y rayarlo. Esa zona queda dañada: el disco empieza a dar errores y se pueden perder datos. Al SSD el golpe no le hace nada, porque no tiene piezas que se muevan.',
        async aplicar(ctx, gen) {
          base(); await moverBrazo(3.6, 300);
          if (!ctx.vivo(gen)) return;
          temblor = 1;
          await ctx.animar(220, t => { cabezal.position.y = 2.64 - 0.14 * Math.sin(t * Math.PI); });
          if (!ctx.vivo(gen)) return;
          aranazo.visible = true;
          ctx.burbuja('¡El cabezal ha tocado el plato!', V(-6, 6, -2), 'peligro', 3200);
          await ctx.esperar(900); temblor = 0;
          if (!ctx.vivo(gen)) return;
          await ctx.esperar(800);
          if (!ctx.vivo(gen)) return;
          ctx.burbuja('Zona rayada: errores y datos perdidos', V(-6, 4, -9), 'peligro', 3600);
          ctx.burbuja('SSD: sin piezas que se muevan', V(13, 3.5, 2), '', 3600);
        },
      },
      {
        id: 'apagar', nombre: 'Apagar y aparcar', titulo: 'Al apagar, el cabezal se aparca',
        texto: 'Al apagar, el brazo lleva el cabezal a la rampa, fuera de los platos, y los platos se paran. Así un golpe con el equipo apagado no raya nada. Por eso un ordenador con disco duro se mueve siempre apagado.',
        async aplicar(ctx, gen) {
          base();
          await moverBrazo('aparcar', 700);
          if (!ctx.vivo(gen)) return;
          ctx.burbuja('Cabezal aparcado en la rampa', rampa.getWorldPosition(new THREE.Vector3()).add(V(0, 1.5, 0)), '', 3000);
          rpmMeta = 0;
        },
      },
    ];

    return {
      grupo: g, modos, etiquetas, inicial: 'partes',
      cadaFrame(dt) {
        tiempo += dt;
        rpm += (rpmMeta - rpm) * Math.min(1, dt * (rpmMeta ? 3 : 0.6));
        platos.rotation.y += rpm * 14 * dt;
        if (temblor) {
          hdd.position.set(-6 + (Math.random() - 0.5) * 0.5, (Math.random()) * 0.25, (Math.random() - 0.5) * 0.5);
          ssd.position.set(13 + (Math.random() - 0.5) * 0.5, (Math.random()) * 0.25, (Math.random() - 0.5) * 0.5);
        }
      },
    };
  },
};
