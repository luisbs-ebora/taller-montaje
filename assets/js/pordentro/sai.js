// sai.js — El SAI por dentro: por dónde va la energía con red, sin red y según el tipo de SAI.
// Bloques, tipos y valores de la Sección 4 del Tema 4.
import * as THREE from 'three';
import { M, METAL, caja, cil, redondo, lienzo, sai } from '../modelos-t4.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ALTERNA = 0xffd23f, CONTINUA = 0xff6a3d;

export default {
  id: 'sai', icono: '🔋', titulo: 'El SAI', tema: 'Tema 4 · Sección 4', realista: true,
  resumen: 'Qué hace cada bloque de un SAI, qué pasa cuando se va la luz y en qué se diferencian un off-line, un interactivo y un on-line.',
  nota: 'Esto se mira aquí, no en el taller: un SAI no se abre nunca, y su salida da 230 V aunque esté desenchufado de la pared. Las medidas de 230 V solo las hace el profesor.',
  camara: { pos: [4, 42, 70], obj: [1, 5, 2] },
  alfombrilla: [80, 50], suelo: -0.3, distancia: [14, 150],

  crear(ctx) {
    const g = new THREE.Group();
    const add = (m, x, y, z) => { m.position.set(x, y, z); m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.add(m); return m; };
    const SX = -8; // centro del SAI
    const s = sai({ abierto: true }); s.grupo.position.set(SX, 0, 0); g.add(s.grupo);
    const L = (x, y, z) => V(SX + x, y, z); // de coordenadas del SAI a la escena

    /* ----- Pared con enchufe ----- */
    const PXW = -36;
    add(caja(1.2, 20, 22, M(0xece7dc, { roughness: 0.9 })), PXW - 0.6, 10, 0);
    add(redondo(0.5, 8, 8, 0.8, M(0xfafaf7, { roughness: 0.4 }), 0.1), PXW + 0.25, 4, 0);
    const hueco = cil(2.1, 0.3, M(0xdedbd2, { roughness: 0.5 }), 32); hueco.rotation.z = Math.PI / 2; add(hueco, PXW + 0.6, 8, 0);
    const pilotoRed = add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshStandardMaterial({ color: 0x35d06a, emissive: 0x35d06a, emissiveIntensity: 1.6 })), PXW + 0.6, 11.4, 0);
    // clavija y cable de entrada
    const clav = cil(1.7, 1.6, M(0x17181b, { roughness: 0.5 }), 28); clav.rotation.z = Math.PI / 2; add(clav, PXW + 1.5, 8, 0);
    const cEntrada = new THREE.CatmullRomCurve3([V(PXW + 2.3, 8, 0), V(PXW + 5, 6, 0.6), V(PXW + 8, 1.2, 1.8), L(-18.5, 2.2, 2.4), L(-15.4, 3, 2.4)]);
    add(new THREE.Mesh(new THREE.TubeGeometry(cEntrada, 40, 0.38, 8), M(0x17181b, { roughness: 0.7 })), 0, 0, 0);

    /* ----- Ordenador y monitor ----- */
    const PCX = 21;
    add(redondo(9, 20, 20, 0.6, M(0x1b1d21, { roughness: 0.45, metalness: 0.3 }), 0.15), PCX, 0, 1);
    add(caja(7.4, 17, 0.2, new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.15, metalness: 0.2 })), PCX, 10, 11.05);
    const ledPC = add(cil(0.3, 0.12, new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0x4db2ff, emissiveIntensity: 1.8 }), 16), PCX + 2.6, 20.02, 9);
    const MX = 33.5;
    add(redondo(7, 0.5, 5.5, 1, M(0x1b1d21, { roughness: 0.4 }), 0.08), MX, 0, 2);
    add(caja(1.2, 6, 0.8, M(0x1b1d21, { roughness: 0.4 })), MX, 3.2, 1.2);
    add(caja(15.6, 9.6, 0.7, M(0x15171a, { roughness: 0.4 })), MX, 10.6, 1.6);
    const P = lienzo(640, 384);
    const pant = new THREE.Mesh(new THREE.PlaneGeometry(14.8, 8.8), new THREE.MeshBasicMaterial({ map: P.t, toneMapped: false })); pant.position.set(MX, 10.6, 1.97); g.add(pant);
    function pintarMonitor(estado, texto = '') {
      const x = P.x;
      if (estado === 'off') { x.fillStyle = '#050607'; x.fillRect(0, 0, 640, 384); }
      else {
        const gr = x.createLinearGradient(0, 0, 640, 384); gr.addColorStop(0, '#2b62b8'); gr.addColorStop(1, '#55b8d6'); x.fillStyle = gr; x.fillRect(0, 0, 640, 384);
        x.fillStyle = 'rgba(255,255,255,.94)'; x.beginPath(); x.roundRect(70, 60, 500, 230, 14); x.fill();
        x.fillStyle = '#2b62b8'; x.fillRect(70, 60, 500, 44);
        x.fillStyle = '#fff'; x.font = 'bold 26px Arial, Helvetica, sans-serif'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillText('Informe de montaje.docx', 86, 83);
        x.fillStyle = '#c9d3df'; for (let i = 0; i < 5; i++) x.fillRect(96, 128 + i * 30, i === 4 ? 250 : 440, 12);
        x.fillStyle = '#1c2530'; x.fillRect(0, 340, 640, 44);
        if (texto) { x.fillStyle = estado === 'aviso' ? '#ffb020' : '#35d06a'; x.fillRect(330, 344, 300, 36); x.fillStyle = '#10151a'; x.font = 'bold 22px Arial, Helvetica, sans-serif'; x.textAlign = 'center'; x.fillText(texto, 480, 363); }
      }
      P.t.needsUpdate = true;
    }
    // cable de salida: de la toma trasera del SAI, por detrás, hasta el ordenador
    const RUTA = [L(-19, 12, -1), L(-19.5, 3, 5), L(-15, 0.5, 9.5), L(4, 0.5, 10.5), V(PCX - 8, 0.5, 9), V(PCX - 7.5, 0.5, -5), V(PCX - 4, 2, -11), V(PCX, 4, -9.2)];
    const cSalida = new THREE.CatmullRomCurve3([L(-15.6, 13.6, -2.6), ...RUTA]);
    const clavS = cil(1.6, 1.4, M(0x17181b, { roughness: 0.5 }), 28); clavS.rotation.z = Math.PI / 2; add(clavS, SX - 16.3, 13.6, -2.6);
    add(new THREE.Mesh(new THREE.TubeGeometry(cSalida, 60, 0.38, 8), M(0x17181b, { roughness: 0.7 })), 0, 0, 0);
    // impresora láser (solo en «sobrecarga»)
    const impresora = new THREE.Group(); impresora.visible = false; g.add(impresora);
    const imp = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = true; impresora.add(m); return m; };
    imp(redondo(15, 9, 13, 1.2, M(0xe7e4dc, { roughness: 0.55 }), 0.2), 6, 0, 15);
    imp(caja(11, 0.3, 4, M(0xcfccc4, { roughness: 0.6 })), 6, 9.1, 13);
    imp(caja(9, 0.08, 6, M(0xffffff, { roughness: 0.8 })), 6, 9.4, 12.6);
    imp(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-1.5, 3, 15), V(-6, 0.5, 13), L(-19, 0.6, 8), L(-19.5, 8, 4), L(-15.6, 13.6, 2.6)]), 40, 0.34, 8), M(0x6a7078, { roughness: 0.7 })), 0, 0, 0);

    /* ----- Caminos de la energía ----- */
    const ZF = 3.4; // los caminos van pegados al cristal para que se vean
    const P_FILTRO = L(-11.6, 2.6, ZF), P_RELE = L(-11.4, 12.6, ZF), P_SAL = L(-15, 13.6, -2.6), P_CARG = L(-5.4, 3.6, ZF), P_BAT = L(0.4, 10.9, ZF), P_INV = L(5, 14.4, ZF), P_AVR = L(-4.4, 12.6, ZF);
    const curva = (...p) => new THREE.CatmullRomCurve3(p, false, 'catmullrom', 0.3);
    const geo = new THREE.SphereGeometry(0.6, 12, 10);
    const mats = { [ALTERNA]: new THREE.MeshBasicMaterial({ color: ALTERNA, toneMapped: false }), [CONTINUA]: new THREE.MeshBasicMaterial({ color: CONTINUA, toneMapped: false }) };
    const flujos = {};
    const flujo = (id, c, color, vel = 0.5, ritmo = 0.16) => { flujos[id] = { c, color, vel: (vel * 36) / c.getLength(), ritmo, on: false, acum: 0, parts: [] }; };
    flujo('entrada', curva(V(PXW + 2.3, 8, 0), V(PXW + 5, 6, 0.6), V(PXW + 8, 1.2, 1.8), L(-18.5, 2.2, 2.4), L(-15.4, 3, 2.4), P_FILTRO), ALTERNA);
    flujo('directo', curva(P_FILTRO, L(-13.6, 7, ZF), P_RELE), ALTERNA);
    flujo('avr', curva(P_FILTRO, L(-9, 7, ZF), P_AVR, L(-8, 14.6, ZF), P_RELE), ALTERNA);
    flujo('carga', curva(P_FILTRO, L(-8.5, 2.2, ZF), P_CARG, L(-2.5, 6, ZF), P_BAT), CONTINUA, 0.4, 0.5);
    flujo('rect', curva(P_FILTRO, L(-8.5, 2.2, ZF), P_CARG, L(-1.6, 9.5, ZF), L(1, 13.6, ZF), P_INV), CONTINUA);
    flujo('bat', curva(P_BAT, L(1.2, 13, ZF), P_INV), CONTINUA);
    flujo('inv', curva(P_INV, L(-1, 15.4, ZF), L(-8, 15.6, ZF), P_RELE), ALTERNA);
    flujo('salida', curva(P_RELE, P_SAL, ...RUTA), ALTERNA, 0.6);
    const activar = (...ids) => { for (const k in flujos) flujos[k].on = ids.includes(k); };

    /* ----- Estado ----- */
    let tiempo = 0, bateria = 100, gasto = 0, brazoA = 0, avrBrillo = 0, pitido = 0, pitando = false;
    const lcd = { entrada: 230, salida: 230, carga: 45, bateria: 100, modo: 'RED', alarma: false };
    const pintar = () => { lcd.bateria = bateria; s.pintarLCD(lcd); };
    const avrMat = s.dentro.avr.material.clone(); s.dentro.avr.material = avrMat;
    function red(hay, v = 230) {
      pilotoRed.material.emissiveIntensity = hay ? 1.6 : 0; pilotoRed.material.color.setHex(hay ? 0x35d06a : 0x3a3d42);
      lcd.entrada = hay ? v : 0;
    }
    function equipo(on, texto = '', estado = 'ok') { ledPC.material.emissiveIntensity = on ? 1.8 : 0; pintarMonitor(on ? estado : 'off', texto); }
    async function rele(aBateria, ms = 260) { const a0 = brazoA, a1 = aBateria ? 1 : 0; await ctx.animar(ms, t => { brazoA = a0 + (a1 - a0) * t; }); }
    function base() {
      bateria = 100; gasto = 0; brazoA = 0; avrBrillo = 0; pitando = false; impresora.visible = false;
      Object.assign(lcd, { entrada: 230, salida: 230, carga: 45, modo: 'RED', alarma: false });
      red(true); equipo(true); ctx.ponerMedidor(100); pintar();
      for (const k in flujos) { const f = flujos[k]; f.on = false; f.parts.splice(0).forEach(p => g.remove(p.m)); }
    }
    const vivo = async (gen, ms) => { await ctx.esperar(ms); return ctx.vivo(gen); };
    const SOBRE_PARED = V(PXW + 3, 15, 0), SOBRE_SAI = L(0, 21, 0), SOBRE_PC = V(PCX + 5, 24, 1);
    async function apagon(gen) {
      red(false); flujos.entrada.on = false; pintar();
      ctx.burbuja('¡Apagón!', SOBRE_PARED, 'peligro', 3200);
    }

    const etiquetas = [
      { texto: 'Filtro de entrada', obj: s.dentro.filtro, off: [0, -2.2, 6.5] },
      { texto: 'Rectificador y cargador', obj: s.dentro.cargador, off: [1, -2.2, 6.5] },
      { texto: 'Batería de 12 V', obj: s.dentro.bateria, off: [2, -1.6, 6.5] },
      { texto: 'Inversor', obj: s.dentro.inversor, off: [0, 4.4, 5.6] },
      { texto: 'Regulador (AVR)', obj: s.dentro.avr, off: [0, 5.8, 5.6] },
      { texto: 'Relé', obj: s.dentro.rele, off: [-2.5, 5.8, 5.6] },
      { texto: 'Pantalla y control', obj: s.dentro.control, off: [5, 6.5, 0] },
      { texto: 'Tomas de salida', obj: s.tomas[0], off: [-3.5, 4.5, 0] },
      { texto: 'Red: 230 V', obj: pilotoRed, off: [3, 4.5, 0] },
    ];

    const modos = [
      {
        id: 'red', nombre: 'Con red', titulo: 'Con red: el off-line deja pasar y carga',
        texto: 'En un SAI off-line, mientras hay red la corriente del enchufe pasa por el filtro (que recorta picos y quita ruido) y va directa a las tomas de salida. A la vez, el rectificador convierte un poco de alterna en continua para mantener cargada la batería. El inversor está parado, esperando.',
        async aplicar(ctx, gen) {
          base(); activar('entrada', 'directo', 'carga', 'salida');
          ctx.burbuja('Amarillo: alterna (230 V)', L(-20, 7, 4), '', 4200);
          if (!(await vivo(gen, 2600))) return;
          ctx.burbuja('Naranja: continua, para cargar la batería', L(-3, 8.5, 6), '', 5200);
        },
      },
      {
        id: 'corte', nombre: 'Se va la luz', titulo: 'Apagón: el relé conmuta a la batería',
        texto: 'Cuando la red falla, el control lo detecta y el relé conmuta en unos milisegundos: ahora la batería da continua, el inversor la convierte en alterna de 230 V y los equipos siguen encendidos. El SAI pita para avisar. La batería dura solo unos minutos: los justos para guardar el trabajo y apagar bien. Cuanto más le conectas, menos dura.',
        async aplicar(ctx, gen) {
          base(); activar('entrada', 'directo', 'carga', 'salida');
          if (!(await vivo(gen, 2200))) return;
          await apagon(gen); activar('salida');
          await rele(true); if (!ctx.vivo(gen)) return;
          activar('bat', 'inv', 'salida'); lcd.modo = 'BATERÍA'; pitando = true; gasto = 5.4; pintar();
          equipo(true, 'Funcionando con batería', 'aviso');
          ctx.burbuja('El relé conmuta en milisegundos', L(-11.4, 18.5, 3), '', 3600);
          if (!(await vivo(gen, 3200))) return;
          ctx.burbuja('El equipo sigue encendido', SOBRE_PC, '', 3600);
          if (!(await vivo(gen, 3600))) return;
          ctx.burbuja('Guarda el trabajo y apaga bien', SOBRE_PC, '', 4600);
          while (bateria > 20) { if (!(await vivo(gen, 400))) return; }
          ctx.burbuja('Batería baja: apaga ya', SOBRE_SAI, 'peligro', 9000);
        },
      },
      {
        id: 'interactivo', nombre: 'Baja la tensión', titulo: 'SAI interactivo: corrige sin gastar batería',
        texto: 'A veces la red no se corta, pero baja (por ejemplo, a 190 V) o sube. Un SAI off-line no puede hacer nada con eso. El interactivo lleva un regulador de tensión (AVR), un transformador que la devuelve a unos 230 V sin tocar la batería. Es el tipo habitual en oficinas, aulas y servidores pequeños.',
        async aplicar(ctx, gen) {
          base(); activar('entrada', 'directo', 'carga', 'salida');
          if (!(await vivo(gen, 2000))) return;
          red(true, 190); lcd.salida = 190; pintar();
          ctx.burbuja('La red baja a 190 V', SOBRE_PARED, 'peligro', 3600);
          if (!(await vivo(gen, 2400))) return;
          activar('entrada', 'avr', 'carga', 'salida'); avrBrillo = 1; lcd.salida = 230; pintar();
          ctx.burbuja('El regulador (AVR) la sube a 230 V', L(-4.4, 19, 3), '', 5200);
          if (!(await vivo(gen, 3400))) return;
          ctx.burbuja('Batería: sigue al 100 %', L(6, 7, 6), '', 4600);
        },
      },
      {
        id: 'online', nombre: 'On-line', titulo: 'SAI on-line: siempre por el inversor',
        texto: 'En un SAI on-line (doble conversión) los equipos nunca van directos a la red: la alterna se convierte en continua y el inversor vuelve a fabricar una alterna limpia, todo el tiempo. La batería está enganchada en medio. Si se va la luz no hay nada que conmutar: tiempo de conmutación cero. Es más caro, hace más ruido y gasta más; se usa en servidores y equipos críticos.',
        async aplicar(ctx, gen) {
          base(); brazoA = 1; activar('entrada', 'rect', 'inv', 'salida');
          ctx.burbuja('Alterna → continua → alterna, siempre', SOBRE_SAI, '', 4600);
          if (!(await vivo(gen, 4200))) return;
          await apagon(gen); activar('bat', 'inv', 'salida'); lcd.modo = 'BATERÍA'; pitando = true; gasto = 5.4; pintar();
          if (!(await vivo(gen, 1600))) return;
          ctx.burbuja('Sin conmutar: el equipo ni se entera', SOBRE_PC, '', 5200);
          while (bateria > 20) { if (!(await vivo(gen, 400))) return; }
          ctx.burbuja('Batería baja: apaga ya', SOBRE_SAI, 'peligro', 9000);
        },
      },
      {
        id: 'sobrecarga', nombre: 'Enchufar una láser', peligro: true, titulo: 'Sobrecarga: lo que no se conecta a un SAI',
        texto: 'Una impresora láser (o una estufa) pide un pico de potencia muy alto al calentar. Si la enchufas a las tomas con batería, el SAI se pasa de su potencia máxima, pita y se protege cortando la salida: se apaga todo lo que protegía. El SAI se elige por vatios (no por VA), sumando el consumo real más un 20-30 % de margen, y solo para lo imprescindible.',
        async aplicar(ctx, gen) {
          base(); activar('entrada', 'directo', 'carga', 'salida');
          if (!(await vivo(gen, 1800))) return;
          impresora.visible = true;
          ctx.burbuja('Impresora láser enchufada al SAI', V(6, 14, 15), '', 3200);
          if (!(await vivo(gen, 2200))) return;
          await ctx.animar(1600, t => { lcd.carga = Math.round(45 + 95 * t); pintar(); });
          if (!ctx.vivo(gen)) return;
          lcd.alarma = 'SOBRECARGA'; pitando = true; pintar();
          ctx.burbuja('Carga: 140 %', SOBRE_SAI, 'peligro', 3200);
          if (!(await vivo(gen, 2600))) return;
          activar('entrada', 'carga'); lcd.salida = 0; pitando = false; pintar(); equipo(false);
          ctx.burbuja('El SAI corta la salida: todo apagado', SOBRE_PC, 'peligro', 9000);
        },
      },
    ];

    base();
    return {
      grupo: g, modos, etiquetas, inicial: 'red',
      leyenda: [[ALTERNA, 'Corriente alterna (230 V)'], [CONTINUA, 'Corriente continua (batería, 12 V)']],
      medidor: { nombre: 'Batería', unidad: '%', min: 0, max: 100, inicial: 100, zonas: [[-1, 20, 'peligro', 'Batería baja'], [20, 60, 'aviso', 'Descargándose'], [60, 999, 'ok', 'Cargada']] },
      cadaFrame(dt) {
        tiempo += dt;
        // batería
        if (gasto && bateria > 12) { bateria = Math.max(12, bateria - gasto * dt); ctx.ponerMedidor(bateria); if (Math.floor(bateria) !== Math.floor(lcd.bateria)) pintar(); }
        // relé y regulador
        s.brazo.rotation.z = -0.5 + brazoA * 1.0;
        avrMat.emissive.setHex(0xffb020); avrMat.emissiveIntensity = avrBrillo * (0.35 + 0.2 * Math.sin(tiempo * 5));
        // pitido del SAI
        if (pitando) { pitido += dt; if (pitido > 2.4) { pitido = 0; ctx.burbuja('¡Pi!', L(15, 9, 3), 'peligro', 700); } }
        // partículas de energía
        for (const k in flujos) {
          const f = flujos[k];
          if (f.on) { f.acum += dt; while (f.acum > f.ritmo) { f.acum -= f.ritmo; const m = new THREE.Mesh(geo, mats[f.color]); m.renderOrder = 5; g.add(m); f.parts.push({ m, u: 0 }); } }
          for (let i = f.parts.length - 1; i >= 0; i--) {
            const p = f.parts[i]; p.u += dt * f.vel;
            if (p.u >= 1 || !f.on) { g.remove(p.m); f.parts.splice(i, 1); continue; }
            f.c.getPointAt(p.u, p.m.position);
            // la alterna «late»; la continua va uniforme
            p.m.scale.setScalar(f.color === ALTERNA ? 0.75 + 0.35 * Math.sin(tiempo * 14 + p.u * 40) : 0.8);
          }
        }
      },
    };
  },
};
