/**
 * Ejercicios.gs — Definición de los ejercicios de cada tema (la "clave de corrección").
 * Vive solo en Apps Script: el alumnado no puede verla desde GitHub Pages.
 * Para añadir un tema: añade una entrada a EJERCICIOS con su catálogo, perfiles, reglas y acciones.
 */

function _tiene(lista, x) { return (lista || []).indexOf(x) >= 0; }
function _ramTotal(s) { return s.ram ? s.ram.modulos * s.ram.gbModulo : 0; }
function _esM2(s) { return s.almac && s.almac.formato.indexOf('M.2') === 0; }
function _hayGpu(s) { return s.gpu && !s.gpu.ninguna; }

var EJERCICIOS = {

  't1-montaje': {
    id: 't1-montaje',
    titulo: 'Tema 1 · Elige y monta un PC',
    catalogo: 'tema1/catalogo.json',
    categorias: ['caja', 'placa', 'cpu', 'refri', 'ram', 'almac', 'gpu', 'fuente'],
    opcionesPorCategoria: 4,
    siempreIncluir: { gpu: ['gpu-ninguna'], refri: ['ref-serie'] },
    pesos: { compat: 4, cliente: 1.5, seguridad: 2.5, orden: 2 },
    penalizacionPasoSobrante: 0.25,

    perfiles: [
      { id: 'edicion', titulo: 'Marta · edición de foto y vídeo',
        descripcion: 'Estudiante de bachillerato de artes. Edita fotos y vídeos en 1080p y guarda muchos proyectos. Quiere exportar rápido y tener mucho espacio.',
        presupuesto: 1200,
        requisitos: [
          { texto: 'Procesador de 8 núcleos o más (exportar vídeo rápido)', check: function (s) { return s.cpu.nucleos >= 8; } },
          { texto: 'Al menos 32 GB de RAM en total', check: function (s) { return _ramTotal(s) >= 32; } },
          { texto: 'Al menos 2 TB de almacenamiento', check: function (s) { return s.almac.gb >= 2000; } }
        ] },
      { id: 'juegos', titulo: 'Dani · juegos en 1080p',
        descripcion: 'Juega a juegos actuales en un monitor 1080p de 144 Hz y también estudia con el ordenador.',
        presupuesto: 1100,
        requisitos: [
          { texto: 'Tarjeta gráfica dedicada para juegos (no vale la básica)', check: function (s) { return _hayGpu(s) && s.gpu.nivel !== 'basica'; } },
          { texto: 'Al menos 16 GB de RAM en total', check: function (s) { return _ramTotal(s) >= 16; } },
          { texto: 'SSD NVMe de 1 TB o más (cargas rápidas)', check: function (s) { return s.almac.tipo === 'NVMe' && s.almac.gb >= 1000; } }
        ] },
      { id: 'oficina', titulo: 'Asesoría Ribera · puesto del informático',
        descripcion: 'Muchas pestañas, programas de gestión y varias máquinas virtuales a la vez. No juega: no quiere gastar en tarjeta gráfica.',
        presupuesto: 750,
        requisitos: [
          { texto: 'Al menos 32 GB de RAM en total (máquinas virtuales)', check: function (s) { return _ramTotal(s) >= 32; } },
          { texto: 'Sin tarjeta gráfica dedicada: la imagen la dan los gráficos integrados', check: function (s) { return !_hayGpu(s); } },
          { texto: 'Al menos 1 TB de almacenamiento', check: function (s) { return s.almac.gb >= 1000; } }
        ] },
      { id: 'compacto', titulo: 'Lucía · equipo pequeño para el salón',
        descripcion: 'Quiere un ordenador muy pequeño junto a la tele para ver series, navegar y ofimática.',
        presupuesto: 800,
        requisitos: [
          { texto: 'Caja Mini-ITX (equipo compacto)', check: function (s) { return s.caja.formatos.length === 1 && s.caja.formatos[0] === 'Mini-ITX'; } },
          { texto: 'Al menos 16 GB de RAM en total', check: function (s) { return _ramTotal(s) >= 16; } },
          { texto: 'Al menos 1 TB de almacenamiento', check: function (s) { return s.almac.gb >= 1000; } }
        ] }
    ],

    // Comprobaciones de compatibilidad (las de la Parte 4 del trabajo «Configura tu PC»)
    reglas: [
      { id: 'socket', usa: ['cpu', 'placa'], texto: 'Procesador y placa con el mismo socket',
        check: function (s) { return s.cpu.socket === s.placa.socket; },
        explica: function (s) { return 'Socket distinto: el procesador es ' + s.cpu.socket + ' y la placa ' + s.placa.socket + '. No encaja.'; } },
      { id: 'ram-gen', usa: ['ram', 'placa', 'cpu'], texto: 'Generación de RAM admitida por la placa y el procesador',
        check: function (s) { return s.ram.gen === s.placa.ram && _tiene(s.cpu.ram, s.ram.gen); },
        explica: function (s) { return 'La memoria es ' + s.ram.gen + ' y la placa solo admite ' + s.placa.ram + '. DDR4 y DDR5 no son compatibles (la muesca está en otro sitio).'; } },
      { id: 'ram-formato', usa: ['ram', 'placa'], texto: 'Módulos DIMM de sobremesa, con ranuras y capacidad suficientes',
        check: function (s) { return s.ram.formato === 'DIMM' && s.ram.modulos <= s.placa.ranurasRam && _ramTotal(s) <= s.placa.ramMax; },
        explica: function (s) {
          if (s.ram.formato !== 'DIMM') return 'Los módulos son ' + s.ram.formato + ' (de portátil). Una placa de sobremesa usa DIMM.';
          if (s.ram.modulos > s.placa.ranurasRam) return 'Hay ' + s.ram.modulos + ' módulos y la placa solo tiene ' + s.placa.ranurasRam + ' ranuras.';
          return 'La placa admite como máximo ' + s.placa.ramMax + ' GB.'; } },
      { id: 'almac-placa', usa: ['almac', 'placa', 'caja'], texto: 'La unidad de almacenamiento tiene dónde conectarse',
        check: function (s) {
          if (_esM2(s)) return s.placa.m2.some(function (r) { return _tiene(r.tipo, s.almac.tipo); });
          return s.placa.sata > 0 && s.caja.bahias25 > 0; },
        explica: function (s) {
          if (_esM2(s)) return 'El SSD M.2 es ' + s.almac.tipo + ' y ninguna ranura M.2 de la placa admite ' + s.almac.tipo + '. No todas las ranuras M.2 admiten NVMe y SATA.';
          return 'Para un disco de 2,5" hacen falta un puerto SATA en la placa y una bahía en la caja.'; } },
      { id: 'refri-cpu', usa: ['refri', 'cpu'], texto: 'Refrigeración compatible con el socket y capaz de evacuar el TDP',
        check: function (s) {
          if (s.refri.serie) return s.cpu.disipadorSerie;
          return _tiene(s.refri.sockets, s.cpu.socket) && s.refri.tdpMax >= s.cpu.tdp; },
        explica: function (s) {
          if (s.refri.serie) return 'El ' + s.cpu.nombre + ' no trae disipador de serie: hay que comprar uno.';
          if (!_tiene(s.refri.sockets, s.cpu.socket)) return 'El disipador no es compatible con el socket ' + s.cpu.socket + ' (admite ' + s.refri.sockets.join(', ') + ').';
          return 'El disipador evacua hasta ' + s.refri.tdpMax + ' W y el procesador tiene un TDP de ' + s.cpu.tdp + ' W.'; } },
      { id: 'placa-caja', usa: ['placa', 'caja'], texto: 'La caja admite el formato de la placa',
        check: function (s) { return _tiene(s.caja.formatos, s.placa.formato); },
        explica: function (s) { return 'La placa es ' + s.placa.formato + ' y la caja solo admite ' + s.caja.formatos.join(', ') + '.'; } },
      { id: 'medidas-caja', usa: ['caja', 'gpu', 'refri'], texto: 'La gráfica y la refrigeración caben en la caja',
        check: function (s) {
          var gpuOk = !_hayGpu(s) || s.gpu.largo <= s.caja.gpuMax;
          var refOk = s.refri.radiador ? s.caja.radiador240 : s.refri.altura <= s.caja.refriMax;
          return gpuOk && refOk; },
        explica: function (s) {
          if (_hayGpu(s) && s.gpu.largo > s.caja.gpuMax) return 'La gráfica mide ' + s.gpu.largo + ' mm y en la caja caben ' + s.caja.gpuMax + ' mm.';
          if (s.refri.radiador) return 'La caja no tiene hueco para un radiador de ' + s.refri.radiador + ' mm.';
          return 'El disipador mide ' + s.refri.altura + ' mm de alto y en la caja caben ' + s.caja.refriMax + ' mm.'; } },
      { id: 'fuente', usa: ['fuente', 'caja', 'gpu'], texto: 'Fuente del formato de la caja, con potencia y conectores suficientes',
        check: function (s) {
          if (s.fuente.formato !== s.caja.fuente) return false;
          if (!_hayGpu(s)) return true;
          return s.fuente.w >= s.gpu.fuenteRec && s.fuente.pcie8 >= s.gpu.pcie8; },
        explica: function (s) {
          if (s.fuente.formato !== s.caja.fuente) return 'La caja usa fuente ' + s.caja.fuente + ' y la fuente elegida es ' + s.fuente.formato + '.';
          if (s.fuente.w < s.gpu.fuenteRec) return 'El fabricante de la gráfica recomienda ' + s.gpu.fuenteRec + ' W y la fuente da ' + s.fuente.w + ' W.';
          return 'La gráfica necesita ' + s.gpu.pcie8 + ' conectores PCIe de 8 pines y la fuente tiene ' + s.fuente.pcie8 + '.'; } },
      { id: 'imagen', usa: ['cpu', 'placa', 'gpu'], texto: 'El equipo puede dar imagen',
        check: function (s) { return _hayGpu(s) || (s.cpu.graficos && s.placa.video.length > 0); },
        explica: function (s) {
          if (!s.cpu.graficos) return 'Sin tarjeta gráfica y el ' + s.cpu.nombre + ' no tiene gráficos integrados: el equipo no daría imagen.';
          return 'Sin tarjeta gráfica y la placa no tiene salidas de vídeo (HDMI/DisplayPort): no daría imagen.'; } }
    ],

    acciones: {
      // Obligatorias antes de tocar cualquier componente
      seguridad: [
        { id: 's-desenchufado', texto: 'Trabajar con todo desenchufado de la corriente hasta terminar el montaje' },
        { id: 's-superficie', texto: 'Trabajar sobre una superficie no conductora (mesa de madera o alfombrilla antiestática)' },
        { id: 's-pulsera', texto: 'Ponerse la pulsera antiestática conectada a una parte metálica sin pintar de la caja' },
        { id: 's-bolsa', texto: 'Sacar cada pieza de su bolsa antiestática justo antes de montarla' },
        { id: 's-bordes', texto: 'Coger las placas y los módulos por los bordes, sin tocar contactos ni chips' }
      ],
      // Si aparece cualquiera: falta grave
      peligrosas: [
        { id: 'x-enchufada', texto: 'Dejar la fuente enchufada mientras montas, para que haga de toma de tierra',
          porque: 'se trabaja siempre desenchufado; la descarga se hace con la pulsera conectada al chasis.' },
        { id: 'x-abrir-fuente', texto: 'Abrir la fuente de alimentación para comprobar los condensadores',
          porque: 'la fuente no se abre nunca: sus condensadores pueden guardar carga aunque esté desenchufada.' },
        { id: 'x-moqueta', texto: 'Montar sobre una alfombra o moqueta para que las piezas no se rayen',
          porque: 'las alfombras generan electricidad estática, que puede estropear los chips.' },
        { id: 'x-forzar', texto: 'Si un módulo de RAM no entra, apretar más fuerte hasta que entre',
          porque: 'nunca se fuerza un componente: hay que revisar la posición de la muesca.' },
        { id: 'x-pano', texto: 'Limpiar los contactos de la RAM con un paño húmedo antes de insertarla',
          porque: 'el agua y los componentes electrónicos no se mezclan; se cogen por los bordes y no se tocan los contactos.' }
      ],
      // Pasos de montaje (mismo modelo que la pestaña «Montar un PC» del laboratorio)
      montaje: [
        { id: 'io', texto: 'Colocar la chapa del panel trasero (I/O) en la caja', aplica: function () { return true; } },
        { id: 'separadores', texto: 'Colocar los separadores solo donde la placa tiene agujeros', aplica: function () { return true; } },
        { id: 'cpu', texto: 'Colocar el procesador en el socket (alinear el triángulo, sin presionar) y cerrar la palanca', aplica: function () { return true; } },
        { id: 'pasta', texto: 'Aplicar una pequeña cantidad de pasta térmica sobre el procesador', req: ['cpu'],
          aplica: function (s) { return !s.refri.pastaPuesta; },
          sobra: function () { return 'la refrigeración elegida ya trae la pasta térmica aplicada de fábrica.'; } },
        { id: 'refri', texto: 'Montar la refrigeración sobre el procesador',
          aplica: function () { return true; },
          req: function (s) {
            var r = s.refri.pastaPuesta ? ['cpu'] : ['pasta'];
            if (s.refri.radiador) r.push('placa');
            return r; },
          porque: 'Sin pasta queda aire entre el procesador y el disipador, y el aire conduce muy mal el calor.' },
        { id: 'cpufan', texto: 'Conectar el ventilador del procesador (o la bomba) a CPU_FAN', req: ['refri'], aplica: function () { return true; } },
        { id: 'ram', texto: 'Insertar los módulos de RAM en las ranuras que indica el manual', aplica: function () { return true; } },
        { id: 'm2', texto: 'Instalar el SSD M.2 en su ranura y sujetarlo con su tornillo', aplica: function (s) { return _esM2(s); },
          sobra: function () { return 'no has elegido un SSD M.2.'; } },
        { id: 'placa', texto: 'Atornillar la placa base en la caja', req: ['io', 'separadores'], aplica: function () { return true; },
          porque: 'La chapa trasera no se puede colocar con la placa ya atornillada, y sin separadores la placa toca el chasis.' },
        { id: 'fuente', texto: 'Atornillar la fuente de alimentación en su hueco, con el interruptor en O', aplica: function () { return true; } },
        { id: 'c24', texto: 'Conectar el cable de 24 pines de la fuente a la placa', req: ['placa', 'fuente'], aplica: function () { return true; } },
        { id: 'eps', texto: 'Conectar el cable EPS (4/8 pines) del procesador', req: ['placa', 'fuente'], aplica: function () { return true; } },
        { id: 'gpu', texto: 'Insertar la tarjeta gráfica en la ranura PCIe x16 y atornillarla a la caja', req: ['placa'],
          aplica: function (s) { return _hayGpu(s); },
          sobra: function () { return 'no has elegido tarjeta gráfica dedicada.'; },
          porque: 'La gráfica se sujeta al chasis; sin la placa atornillada, su peso doblaría la placa.' },
        { id: 'gpu-cable', texto: 'Conectar los cables PCIe de la fuente a la tarjeta gráfica', req: ['gpu', 'fuente'],
          aplica: function (s) { return _hayGpu(s) && s.gpu.pcie8 > 0; },
          sobra: function (s) { return _hayGpu(s) ? 'esta gráfica no lleva conector de corriente: se alimenta por la ranura.' : 'no has elegido tarjeta gráfica dedicada.'; } },
        { id: 'disco', texto: 'Instalar el disco de 2,5" en su bahía y conectar el cable SATA de datos y el de corriente', req: ['placa', 'fuente'],
          aplica: function (s) { return !_esM2(s); },
          sobra: function () { return 'tu almacenamiento es M.2: no lleva cables.'; } },
        { id: 'fpanel', texto: 'Conectar los botones y LED de la caja a F_PANEL siguiendo el manual', req: ['placa'], aplica: function () { return true; } },
        { id: 'frontal', texto: 'Conectar los USB y el audio del frontal de la caja', req: ['placa'], aplica: function () { return true; } },
        { id: 'revisar', texto: 'Revisar que no quedan tornillos sueltos y que ningún cable roza los ventiladores', req: ['TODOS'], aplica: function () { return true; } },
        { id: 'encender', texto: 'Enchufar la fuente, ponerla en I y encender para comprobar el POST', req: ['TODOS', 'revisar'], aplica: function () { return true; } }
      ]
    }
  }
};
