// polimetro.js — Medir con el polímetro en el conector de 24 pines, «por detrás» y con el equipo encendido.
// Valores, colores y márgenes: los de las Secciones 2 y 3 del Tema 4 (tolerancia ATX ±5 %).
// Se puede elegir polímetro de rango manual o autorango.
import * as THREE from 'three';
import { bancoMedida, SENALES } from '../modelos-t4.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const es = (n, d = 2) => n.toFixed(d).replace('.', ',');
let tipoGuardado = 'manual';
try { tipoGuardado = localStorage.getItem('polimetro:tipo') === 'auto' ? 'auto' : 'manual'; } catch (e) {}

export default {
  id: 'polimetro', icono: '🔧', titulo: 'Medir con el polímetro', tema: 'Tema 4 · Secciones 2 y 3', realista: true,
  resumen: 'Dónde van las puntas, qué posición del selector se elige y qué tiene que marcar cada color del conector de 24 pines. Y qué pasa si te equivocas.',
  nota: 'En el aula: pulsera puesta, puntas sujetas por la zona aislada y sin tocar dos pines a la vez. Solo se miden las tensiones bajas de la fuente; las de 230 V las mide el profesor. La fuente no se abre nunca.',
  camara: { pos: [6, 30, 34], obj: [-1, 2, 1] },
  alfombrilla: [62, 50], suelo: -0.3, distancia: [8, 120],

  crear(ctx) {
    const b = bancoMedida();
    const { roja, negra, hiloGnd, hilo, sonda, brillo, borne, PX, FZ } = b;
    let tipo = tipoGuardado;
    b.usar(tipo);
    const auto = () => tipo === 'auto';

    /* ----- Lectura ----- */
    let lectura = null, tic = 0; // lectura: { v, dec, fuera, quieto }
    function pintar() {
      const lcd = b.poli.lcd, aviso = auto() ? 'AUTO' : '';
      if (!lectura) { lcd.pintar({ apagada: true }); return; }
      if (lectura.fuera) { lcd.pintar({ texto: '1   .', unidad: 'V', cc: true }); return; }
      const v = lectura.v + (lectura.quieto ? 0 : (Math.random() - 0.5) * 0.02);
      lcd.pintar({ texto: v.toFixed(lectura.dec ?? 2), unidad: 'V', cc: true, aviso });
    }
    const leer = l => { lectura = l; pintar(); };
    async function girar(pos, ms = 700) {
      const s = b.poli.selector, a0 = s.rotation.y, a1 = -(b.poli.pos[pos] ?? 0) * Math.PI / 180;
      await ctx.animar(ms, t => { s.rotation.y = a0 + (a1 - a0) * t; });
    }
    async function mover(p, tip, dir, ms = 1100) {
      const t0 = p.tip.clone(), d0 = p.dir.clone();
      await ctx.animar(ms, t => { p.tip.lerpVectors(t0, tip, t); p.tip.y += Math.sin(Math.PI * t) * 5; p.dir.lerpVectors(d0, dir, t).normalize(); });
    }
    const tocarRoja = (h, ms) => mover(roja, sonda(h), b.DIR_ROJA, ms);
    const tocarNegra = (h, ms) => mover(negra, sonda(h), b.DIR_NEGRA, ms);

    function reposo() { b.reposo(); leer(null); }
    // Ya midiendo: selector en tensión continua, negra en masa
    function midiendo(pos = 'v20') { reposo(); b.poli.girarA(pos); b.tocar(negra, hiloGnd); leer({ v: 0, quieto: true }); }
    const paso = async (gen, ms) => { await ctx.esperar(ms); return ctx.vivo(gen); };
    const bien = (id, v) => `${SENALES[id].nombre.split(':')[0]}: ${es(v)} V (de ${es(SENALES[id].min)} a ${es(SENALES[id].max)}) ✓`;
    const sobre = h => sonda(h).add(V(0, 5.5, 0));
    const sobreSelector = () => b.poli.selector.getWorldPosition(V(0, 0, 0)).add(V(0, 4.5, 0));

    const etiquetas = [
      { texto: 'Pantalla', obj: b.polis.manual.grupo, off: [-5.5, 4.5, -6.5] },
      { texto: 'Selector', obj: b.polis.manual.selector, off: [-5.4, 1.5, 0] },
      { texto: 'Bornes: 10 A · mA · COM · VΩ', obj: b.polis.manual.grupo, off: [0, 4, 9.8] },
      { texto: 'Punta roja', obj: roja.punta, off: [3, 2.2, 0] },
      { texto: 'Punta negra', obj: negra.punta, off: [3, 2.2, 0] },
      { texto: 'Conector de 24 pines', obj: b.con.grupo, off: [7, 2, 0] },
      { texto: 'Fuente', obj: b.rejilla, off: [0, 2.5, 0] },
    ];

    const CERCA = { pos: [14, 20, 22], obj: [10, 2, 2] }, MEDIA = { pos: [8, 26, 30], obj: [0, 2, 2] };
    const modos = [
      {
        id: 'partes', nombre: 'El polímetro', titulo: 'Las partes del polímetro',
        get texto() {
          return 'La pantalla muestra el valor. El selector elige qué se mide: V con raya recta, tensión continua; V con onda, tensión alterna; Ω, resistencia; el altavoz, continuidad; A, intensidad. '
            + (auto() ? 'Este es autorango: solo eliges la magnitud y él busca el rango (en la pantalla pone AUTO). ' : 'Este es de rango manual: además de la magnitud eliges el rango (2, 20 o 200 V). ')
            + 'La punta negra va siempre a COM. La roja, a VΩ para casi todo; solo va a mA o 10 A para medir intensidad.';
        },
        async aplicar() { reposo(); },
      },
      {
        id: 'v12', nombre: 'Medir +12 V', titulo: 'Medir el cable amarillo paso a paso',
        get texto() {
          return 'Con el equipo encendido, se mide por detrás del conector, sin desenchufarlo. Negra en COM y roja en VΩ. Selector en tensión continua'
            + (auto() ? ' (el rango lo pone él solo). ' : ', rango 20 (el siguiente por encima de 12). ')
            + 'La punta negra, a un cable negro (masa); la roja, al amarillo. Tiene que marcar entre 11,40 y 12,60 V.';
        },
        camara: MEDIA,
        async aplicar(ctx, gen) {
          reposo();
          ctx.burbuja('Negra en COM · roja en VΩ', borne('com').add(V(1, 4, 0)), '', 2400);
          if (!(await paso(gen, 1700))) return;
          await girar('v20'); if (!ctx.vivo(gen)) return;
          leer({ v: 0, quieto: true });
          ctx.burbuja(auto() ? 'Tensión continua (rango automático)' : 'Tensión continua, rango 20', sobreSelector(), '', 2400);
          if (!(await paso(gen, 1700))) return;
          await tocarNegra(hiloGnd); if (!ctx.vivo(gen)) return;
          ctx.burbuja('Negra: a un cable negro (masa)', sobre(hiloGnd), '', 2400);
          if (!(await paso(gen, 1500))) return;
          const h = hilo('12');
          await tocarRoja(h); if (!ctx.vivo(gen)) return;
          brillo(h); leer({ v: 12.08 });
          ctx.burbuja(bien('12', 12.08), sobre(h), '', 6000);
        },
      },
      {
        id: 'colores', nombre: 'Los demás colores', titulo: 'Un color, una tensión',
        texto: 'Sin mover la punta negra de masa, la roja va tocando cada color. Rojo: 5 V. Naranja: 3,3 V. Morado: 5 V de reposo (está aunque el equipo esté apagado). Gris: PWR_OK, unos 5 V cuando la fuente ya es estable. Guíate por el color del cable, no por la posición del pin.',
        camara: CERCA,
        async aplicar(ctx, gen) {
          midiendo();
          for (const [id, v] of [['5', 5.02], ['33', 3.33], ['sb', 5.04], ['pg', 5.01]]) {
            const h = hilo(id, id === '5' ? 1 : 0);
            leer({ v: 0, quieto: true }); brillo(null);
            await tocarRoja(h, 900); if (!ctx.vivo(gen)) return;
            brillo(h); leer({ v });
            ctx.burbuja(bien(id, v), sobre(h), '', 2600);
            if (!(await paso(gen, 2700))) return;
          }
        },
      },
      {
        id: 'reves', nombre: 'Puntas al revés', titulo: 'Sale un signo menos',
        texto: 'Si pones la roja en masa y la negra en el amarillo, el polímetro marca lo mismo con un signo menos delante. No se estropea nada: solo te dice que las puntas están al revés (o que esa tensión es negativa respecto a masa, como la del cable azul).',
        camara: CERCA,
        async aplicar(ctx, gen) {
          reposo(); b.poli.girarA('v20'); leer({ v: 0, quieto: true });
          const h = hilo('12');
          await mover(negra, sonda(h), b.DIR_NEGRA, 900); if (!ctx.vivo(gen)) return;
          await mover(roja, sonda(hiloGnd), b.DIR_ROJA, 900); if (!ctx.vivo(gen)) return;
          brillo(h); leer({ v: -12.08 });
          ctx.burbuja('−12,08 V: las puntas están al revés', sobre(h), '', 6000);
        },
      },
      {
        id: 'rango', nombre: 'Elegir el rango', get titulo() { return auto() ? 'Autorango: el rango lo elige él' : 'El rango: el siguiente por encima'; },
        get texto() {
          return auto()
            ? 'En un polímetro autorango no hay posiciones de 2, 20 o 200: pones tensión continua y él prueba rangos hasta encontrar el bueno (tarda un instante y en la pantalla pone AUTO). Es más cómodo, pero las reglas son las mismas: magnitud correcta, negra en COM y roja en VΩ.'
            : 'Con el rango de 2 V no caben 12 V: la pantalla enseña un «1» a la izquierda (en otros modelos, «OL»). Hay que subir. Con 20 se ve 12,08. Con 200 también mide, pero pierde un decimal. Si no sabes qué valor esperar, empieza por el rango más alto y ve bajando.';
        },
        camara: { pos: [-8, 26, 26], obj: [-8, 2, 3] },
        async aplicar(ctx, gen) {
          const h = hilo('12');
          if (auto()) {
            midiendo('v20'); b.tocar(roja, h); brillo(h);
            // busca el rango: pasa por dos lecturas antes de fijarse
            leer({ v: 12, dec: 0, quieto: true }); ctx.burbuja('Buscando el rango…', sobreSelector(), '', 1500);
            if (!(await paso(gen, 700))) return;
            leer({ v: 12.1, dec: 1, quieto: true });
            if (!(await paso(gen, 700))) return;
            leer({ v: 12.08 }); ctx.burbuja('AUTO: 12,08 V sin tocar nada más', sobreSelector(), '', 5000);
            return;
          }
          midiendo('v2'); b.tocar(roja, h); brillo(h);
          leer({ fuera: true });
          ctx.burbuja('Rango 2: «1» = no cabe', sobreSelector(), 'peligro', 2600);
          if (!(await paso(gen, 2600))) return;
          await girar('v20'); if (!ctx.vivo(gen)) return;
          leer({ v: 12.08 }); ctx.burbuja('Rango 20: 12,08 V', sobreSelector(), '', 2600);
          if (!(await paso(gen, 2600))) return;
          await girar('v200'); if (!ctx.vivo(gen)) return;
          leer({ v: 12.1, dec: 1, quieto: true }); ctx.burbuja('Rango 200: 12,1 V (menos precisión)', sobreSelector(), '', 2600);
          if (!(await paso(gen, 2600))) return;
          await girar('v20'); if (!ctx.vivo(gen)) return;
          leer({ v: 12.08 });
        },
      },
      {
        id: 'carga', nombre: 'Con carga', titulo: 'En reposo va bien; jugando, no',
        texto: 'Una fuente débil puede dar 12 V con el equipo en reposo y caerse cuando la gráfica pide potencia. Por eso se mide también con el equipo trabajando. Aquí el amarillo baja a 11,21 V: está por debajo de 11,40 V, fuera del margen. La fuente (450 W) no aguanta y hay que cambiarla por una de más potencia.',
        camara: MEDIA,
        async aplicar(ctx, gen) {
          midiendo();
          const h = hilo('12');
          b.tocar(roja, h); brillo(h);
          leer({ v: 12.08 });
          ctx.burbuja('En reposo: 12,08 V ✓', sobre(h), '', 2400);
          if (!(await paso(gen, 2600))) return;
          ctx.burbuja('Abre un juego…', V(PX, 11, FZ), '', 2600);
          await ctx.animar(3600, t => { lectura.v = 12.08 - 0.87 * t; }, ctx.ease.salida);
          if (!ctx.vivo(gen)) return;
          ctx.burbuja('11,21 V: por debajo de 11,40. La fuente no aguanta', sobre(h), 'peligro', 9000);
        },
      },
      {
        id: 'error', nombre: 'Roja en 10 A', peligro: true, titulo: 'El error más peligroso',
        texto: 'Has medido intensidad y la punta roja se ha quedado en el borne de 10 A. En esa posición el polímetro es casi un cable: al tocar el amarillo unes 12 V con masa. Cortocircuito: chispa, salta el fusible del polímetro y la fuente se protege y se apaga. Da igual que sea manual o autorango. Después de medir intensidad, la roja vuelve siempre a VΩ.',
        camara: MEDIA,
        async aplicar(ctx, gen) {
          midiendo();
          const a = borne('v'), c = borne('a10');
          ctx.burbuja('La roja se ha quedado en 10 A', c.clone().add(V(0, 4.5, 0)), 'peligro', 3200);
          await ctx.animar(1200, t => { roja.clavija.position.lerpVectors(a, c, t); roja.clavija.position.y += Math.sin(Math.PI * t) * 3; });
          if (!(await paso(gen, 1200))) return;
          const h = hilo('12');
          await tocarRoja(h, 1300); if (!ctx.vivo(gen)) return;
          b.chispa.position.copy(sonda(h)).add(V(0, 0.2, 0));
          leer({ v: 0, quieto: true });
          b.led.material.emissiveIntensity = 0;
          ctx.burbuja('¡Cortocircuito! Salta el fusible', sobre(h), 'peligro', 9000);
          await ctx.animar(900, t => { const f = Math.sin(Math.PI * t) * (0.6 + 0.4 * Math.sin(t * 60)); b.chispa.material.opacity = f; b.chispa.scale.setScalar(0.6 + 2.2 * f); b.luzChispa.intensity = 220 * f; }, ctx.ease.lineal);
          b.chispa.material.opacity = 0; b.luzChispa.intensity = 0;
          if (!(await paso(gen, 1600))) return;
          ctx.burbuja('La fuente se protege: equipo apagado', V(PX, 11, FZ), '', 6000);
        },
      },
    ];

    reposo();
    return {
      grupo: b.grupo, modos, etiquetas, inicial: 'partes',
      variantes: {
        nombre: 'Polímetro', lista: [['manual', 'Rango manual'], ['auto', 'Autorango']], actual: () => tipo,
        elegir(id) { tipo = id; tipoGuardado = id; try { localStorage.setItem('polimetro:tipo', id); } catch (e) {} b.usar(id); },
      },
      leyenda: ['12', '5', '33', 'gnd', 'sb', 'pg', 'on', 'm12'].map(id => [SENALES[id].color, SENALES[id].nombre]),
      cadaFrame(dt) {
        tic += dt;
        b.colocar(roja); b.colocar(negra);
        if (tic > 0.4) { tic = 0; if (lectura && !lectura.fuera) pintar(); }
      },
    };
  },
};
