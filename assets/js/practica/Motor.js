/**
 * Motor.gs — Motor general de ejercicios "montar un PC".
 * No usa servicios de Google: se puede probar fuera de Apps Script (tests/).
 * Cada tema define su ejercicio en Ejercicios.gs; este archivo no cambia al añadir temas.
 */

var Motor = (function () {

  // ---------- Aleatoriedad reproducible ----------
  function rngDesdeSemilla(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function barajar(lista, rng) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ---------- Utilidades sobre selecciones ----------
  function piezasPorCategoria(catalogo) {
    var m = {};
    catalogo.piezas.forEach(function (p) { (m[p.cat] = m[p.cat] || []).push(p); });
    return m;
  }
  function reglasAplicables(def, sel) {
    return def.reglas.filter(function (r) {
      return r.usa.every(function (c) { return sel[c]; });
    });
  }
  function precioTotal(sel) {
    var t = 0; Object.keys(sel).forEach(function (c) { if (sel[c]) t += sel[c].precio || 0; });
    return t;
  }
  function cumpleTodo(def, perfil, sel) {
    var reglasOk = def.reglas.every(function (r) { return r.check(sel); });
    var reqOk = perfil.requisitos.every(function (q) { return q.check(sel); });
    return reglasOk && reqOk && precioTotal(sel) <= perfil.presupuesto;
  }

  // ---------- Búsqueda de una solución válida (garantiza que el caso tiene solución) ----------
  function buscarSolucion(def, perfil, porCat, rng) {
    var cats = def.categorias;
    var sel = {};
    var intentos = 0;
    function paso(i) {
      if (++intentos > 200000) return false;
      if (i === cats.length) return cumpleTodo(def, perfil, sel);
      var c = cats[i];
      var candidatos = barajar(porCat[c] || [], rng);
      for (var k = 0; k < candidatos.length; k++) {
        sel[c] = candidatos[k];
        if (precioTotal(sel) > perfil.presupuesto) { continue; }
        var asignadas = cats.slice(0, i + 1);
        var ok = def.reglas.every(function (r) {
          var lista = r.usa.every(function (u) { return asignadas.indexOf(u) >= 0; });
          return !lista || r.check(sel);
        });
        if (ok && paso(i + 1)) return true;
      }
      delete sel[c];
      return false;
    }
    return paso(0) ? Object.assign({}, sel) : null;
  }

  // ---------- Generación de un caso ----------
  function crearCaso(def, catalogo, seed) {
    var rng = rngDesdeSemilla(seed);
    var porCat = piezasPorCategoria(catalogo);
    var perfiles = barajar(def.perfiles, rng);
    var perfil = null, solucion = null;
    for (var i = 0; i < perfiles.length && !solucion; i++) {
      perfil = perfiles[i];
      solucion = buscarSolucion(def, perfil, porCat, rng);
    }
    if (!solucion) throw new Error('El catálogo no permite resolver ningún perfil del ejercicio ' + def.id);

    var pool = {};
    def.categorias.forEach(function (c) {
      var buena = solucion[c];
      var fijas = (def.siempreIncluir && def.siempreIncluir[c]) || [];
      var otras = (porCat[c] || []).filter(function (p) { return p.id !== buena.id && fijas.indexOf(p.id) < 0; });
      // Distractores que rompen la solución (incompatibles o que no cumplen el encargo)
      var rompen = [], validas = [];
      barajar(otras, rng).forEach(function (p) {
        var prueba = Object.assign({}, solucion); prueba[c] = p;
        (cumpleTodo(def, perfil, prueba) ? validas : rompen).push(p);
      });
      var n = def.opcionesPorCategoria - 1;
      var elegidas = rompen.slice(0, Math.min(n, Math.max(2, n - 1)));
      var resto = validas.concat(rompen.slice(elegidas.length));
      while (elegidas.length < n && resto.length) elegidas.push(resto.shift());
      var lista = [buena].concat(elegidas);
      fijas.forEach(function (id) {
        var p = (porCat[c] || []).filter(function (x) { return x.id === id; })[0];
        if (p && lista.indexOf(p) < 0) lista.push(p);
      });
      pool[c] = barajar(lista, rng);
    });

    var acciones = []
      .concat(def.acciones.seguridad, def.acciones.peligrosas, def.acciones.montaje)
      .map(function (a) { return { id: a.id, texto: a.texto }; });

    return {
      ejercicio: def.id,
      catalogoVersion: catalogo.version,
      seed: seed,
      perfil: {
        id: perfil.id, titulo: perfil.titulo, descripcion: perfil.descripcion,
        presupuesto: perfil.presupuesto,
        requisitos: perfil.requisitos.map(function (q) { return q.texto; })
      },
      categorias: def.categorias.map(function (c) {
        var info = catalogo.categorias.filter(function (x) { return x.id === c; })[0] || { id: c, nombre: c };
        return { id: c, nombre: info.nombre };
      }),
      pool: pool,
      acciones: barajar(acciones, rng),
      solucionEjemplo: def.categorias.reduce(function (o, c) { o[c] = solucion[c].id; return o; }, {})
    };
  }

  /** Lo que se envía al alumno: sin la solución de ejemplo. */
  function casoPublico(caso) {
    var c = JSON.parse(JSON.stringify(caso));
    delete c.solucionEjemplo;
    return c;
  }

  // ---------- Corrección ----------
  function redondear(x) { return Math.round(x * 100) / 100; }

  function corregir(def, caso, respuesta) {
    var detalle = [];
    var perfil = def.perfiles.filter(function (p) { return p.id === caso.perfil.id; })[0];
    var pesos = def.pesos;

    // 1) Selección: solo cuentan piezas que estaban en el caso
    var sel = {}, faltan = [];
    def.categorias.forEach(function (c) {
      var id = respuesta && respuesta.seleccion && respuesta.seleccion[c];
      var p = (caso.pool[c] || []).filter(function (x) { return x.id === id; })[0];
      if (p) sel[c] = p; else faltan.push(c);
    });
    faltan.forEach(function (c) {
      detalle.push({ bloque: 'compatibilidad', ok: false, texto: 'No has elegido ninguna pieza válida en: ' + c + '.' });
    });

    // 2) Compatibilidad
    var okReglas = 0;
    def.reglas.forEach(function (r) {
      var aplicable = r.usa.every(function (c) { return sel[c]; });
      var ok = aplicable && r.check(sel);
      if (ok) okReglas++;
      detalle.push({ bloque: 'compatibilidad', regla: r.id, ok: ok,
        texto: ok ? r.texto : (aplicable ? r.explica(sel) : r.texto + ' (no se puede comprobar: falta una pieza)') });
    });
    var compat = pesos.compat * okReglas / def.reglas.length;

    // 3) Encargo del cliente
    var reqs = perfil.requisitos.map(function (q) {
      var ok = false; try { ok = !!q.check(sel); } catch (e) { ok = false; }
      return { texto: q.texto, ok: ok };
    });
    var total = precioTotal(sel);
    reqs.push({ texto: 'Presupuesto máximo ' + perfil.presupuesto + ' € (tu equipo: ' + total + ' €)', ok: total <= perfil.presupuesto && faltan.length === 0 });
    reqs.forEach(function (q) { detalle.push({ bloque: 'cliente', ok: q.ok, texto: q.texto }); });
    var cliente = pesos.cliente * reqs.filter(function (q) { return q.ok; }).length / reqs.length;

    // 4) Seguridad y 5) orden de montaje
    var pasos = (respuesta && respuesta.pasos) || [];
    var vistos = {}; pasos = pasos.filter(function (id) { if (vistos[id]) return false; vistos[id] = true; return true; });
    var pos = {}; pasos.forEach(function (id, i) { pos[id] = i; });
    var idsMontaje = def.acciones.montaje.map(function (a) { return a.id; });
    var primerMontaje = pasos.reduce(function (m, id, i) { return (m < 0 && idsMontaje.indexOf(id) >= 0) ? i : m; }, -1);
    if (primerMontaje < 0) primerMontaje = pasos.length;

    var faltaGrave = false;
    def.acciones.peligrosas.forEach(function (a) {
      if (a.id in pos) { faltaGrave = true; detalle.push({ bloque: 'seguridad', ok: false, grave: true, texto: '«' + a.texto + '»: ' + a.porque }); }
    });
    var okSeg = 0;
    def.acciones.seguridad.forEach(function (a) {
      var ok = (a.id in pos) && pos[a.id] < primerMontaje;
      if (ok) okSeg++;
      detalle.push({ bloque: 'seguridad', ok: ok,
        texto: ok ? a.texto : (a.id in pos ? 'Demasiado tarde: «' + a.texto + '» tiene que hacerse antes de tocar ningún componente.' : 'Falta: «' + a.texto + '».') });
    });
    var seguridad = faltaGrave ? 0 : pesos.seguridad * okSeg / def.acciones.seguridad.length;

    var faltaPieza = faltan.length > 0;
    var aplicables = def.acciones.montaje.filter(function (a) { return !faltaPieza && a.aplica(sel); });
    var idsAplic = aplicables.map(function (a) { return a.id; });
    var okOrden = 0;
    aplicables.forEach(function (a) {
      var req = typeof a.req === 'function' ? a.req(sel) : (a.req || []);
      var alFinal = req.indexOf('TODOS') >= 0;
      if (alFinal) {
        req = req.filter(function (x) { return x !== 'TODOS'; })
          .concat(idsAplic.filter(function (x) { return x !== a.id && x !== 'revisar' && x !== 'encender'; }));
      }
      if (!(a.id in pos)) { detalle.push({ bloque: 'orden', ok: false, texto: 'Falta el paso: «' + a.texto + '».' }); return; }
      var antesFalta = req.filter(function (r) { return !(r in pos) || pos[r] > pos[a.id]; });
      if (antesFalta.length === 0) { okOrden++; detalle.push({ bloque: 'orden', ok: true, texto: a.texto }); }
      else {
        if (alFinal) {
          detalle.push({ bloque: 'orden', ok: false, texto: '«' + a.texto + '» tiene que ir al final, después de todos los pasos de montaje (' +
            antesFalta.length + ' paso' + (antesFalta.length > 1 ? 's' : '') + ' faltan o van después).' });
          return;
        }
        var nombres = antesFalta.map(function (r) {
          var x = def.acciones.montaje.filter(function (m) { return m.id === r; })[0];
          return x ? '«' + x.texto + '»' : r;
        });
        detalle.push({ bloque: 'orden', ok: false, texto: '«' + a.texto + '» va después de: ' + nombres.join(', ') + '.' + (a.porque ? ' ' + a.porque : '') });
      }
    });
    var sobran = def.acciones.montaje.filter(function (a) { return (a.id in pos) && idsAplic.indexOf(a.id) < 0; });
    sobran.forEach(function (a) {
      detalle.push({ bloque: 'orden', ok: false, texto: 'Sobra el paso «' + a.texto + '»' + (a.sobra ? ': ' + a.sobra(sel) : ' con las piezas que has elegido.') });
    });
    var orden = aplicables.length ? pesos.orden * okOrden / aplicables.length : 0;
    orden = Math.max(0, orden - (def.penalizacionPasoSobrante || 0.25) * sobran.length);

    var nota = compat + cliente + seguridad + orden;
    return {
      nota: redondear(nota),
      bloques: { compatibilidad: redondear(compat), cliente: redondear(cliente), seguridad: redondear(seguridad), orden: redondear(orden) },
      maximos: pesos,
      faltaGrave: faltaGrave,
      precioTotal: total,
      detalle: detalle
    };
  }

  return { crearCaso: crearCaso, casoPublico: casoPublico, corregir: corregir, rngDesdeSemilla: rngDesdeSemilla };
})();
