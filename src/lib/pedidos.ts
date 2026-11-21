export type EstadoPedido =
  | "En lavado"
  | "En secado"
  | "En planchado"
  | "Control de calidad"
  | "Listo para entregar"
  | "En ruta"
  | "Entregado";

export type EstadoPago = "Pagado" | "Adelanto" | "Pendiente";
export type MedioPago = "Efectivo" | "Yape" | "Plin" | "Tarjeta" | "Transferencia";
export type TipoDocumento = "DNI" | "RUC";
export type UnidadPrenda = "prenda" | "kg" | "pieza";
export type TipoEntrega = "tienda" | "domicilio";
export type Urgencia = "vencido" | "hoy" | "manana" | "a_tiempo";
export type TipoComprobante = "nota_venta" | "boleta" | "factura";
export type CategoriaServicio = "planchado" | "seco" | "edredones" | "kilo";

export type Prenda = {
  nombre: string;
  cantidad: number;
  unidad: UnidadPrenda;
  marca: string;
  color: string;
  observacion: string;
  /** Vistas previas locales de las fotos de evidencia; no se suben a ningún servidor. */
  evidencias?: string[] | undefined;
};

export type PagoRegistrado = {
  medio: MedioPago;
  importe: number;
  operacion: string;
  vuelto?: number | undefined;
};

export type Pedido = {
  codigo: string;
  cliente: string;
  tipoDocumento: TipoDocumento;
  documento: string;
  telefono: string;
  estado: EstadoPedido;
  estadoPago: EstadoPago;
  medioPago?: MedioPago | undefined;
  medioPagoSaldo?: MedioPago | undefined;
  total: number;
  saldo: number;
  fechaRecepcion: string;
  fechaCompromiso: string;
  fechaEntrega: string;
  servicio: string;
  tipoEntrega: TipoEntrega;
  direccion: string;
  referencia: string;
  repartidor: string;
  prendas: Prenda[];
  notas?: string | undefined;
  incidencias?: string[] | undefined;
  recibidoPor?: string | undefined;
  parentescoRecibe?: string | undefined;
  fechaEstimadaDesde?: string | undefined;
  costoDelivery?: number | undefined;
  descuento?: number | undefined;
  comprobante?: TipoComprobante | undefined;
  pagos?: PagoRegistrado[] | undefined;
  avisoEnviado?: boolean | undefined;
};

export type ServicioCatalogo = {
  id: string;
  categoria: CategoriaServicio;
  nombre: string;
  unidad: UnidadPrenda;
  precio: number;
  prendaSugerida: string;
  minimo?: { cantidad: number; importe: number } | undefined;
};

export type Repartidor = {
  id: string;
  nombre: string;
  iniciales: string;
  vehiculo: string;
  placa: string;
  zona: string;
};

export const SIN_OBSERVACIONES = "Sin observaciones";

export type DefinicionCategoria = { id: CategoriaServicio; nombre: string };

export const categoriasServicio: DefinicionCategoria[] = [
  { id: "planchado", nombre: "Planchado" },
  { id: "seco", nombre: "Lavado al seco" },
  { id: "edredones", nombre: "Edredones y frazadas" },
  { id: "kilo", nombre: "Ropa por kilo" },
];

export const catalogoServicios: ServicioCatalogo[] = [
  {
    id: "planchado_camisa",
    categoria: "planchado",
    nombre: "Planchado de camisa a vapor",
    unidad: "prenda",
    precio: 5,
    prendaSugerida: "Camisa",
  },
  {
    id: "planchado_pantalon",
    categoria: "planchado",
    nombre: "Planchado de pantalón",
    unidad: "prenda",
    precio: 6,
    prendaSugerida: "Pantalón",
  },
  {
    id: "camisa_seco",
    categoria: "seco",
    nombre: "Camisa de vestir al seco",
    unidad: "prenda",
    precio: 9,
    prendaSugerida: "Camisa de vestir",
  },
  {
    id: "terno_seco",
    categoria: "seco",
    nombre: "Terno completo al seco",
    unidad: "prenda",
    precio: 28,
    prendaSugerida: "Terno",
  },
  {
    id: "edredon_dos_plazas",
    categoria: "edredones",
    nombre: "Edredón dos plazas",
    unidad: "pieza",
    precio: 26,
    prendaSugerida: "Edredón",
  },
  {
    id: "frazada_plaza",
    categoria: "edredones",
    nombre: "Frazada de plaza y media",
    unidad: "pieza",
    precio: 18,
    prendaSugerida: "Frazada",
  },
  {
    id: "ropa_peso",
    categoria: "kilo",
    nombre: "Ropa diaria al peso (mín. 3 kg)",
    unidad: "kg",
    precio: 4.5,
    prendaSugerida: "Ropa diaria",
    minimo: { cantidad: 3, importe: 12 },
  },
  {
    id: "toallas_peso",
    categoria: "kilo",
    nombre: "Toallas y sábanas al peso",
    unidad: "kg",
    precio: 6,
    prendaSugerida: "Toallas y sábanas",
  },
];

export const mediosPago: MedioPago[] = ["Efectivo", "Yape", "Plin", "Tarjeta", "Transferencia"];

export type ZonaDelivery = { distrito: string; costo: number; zona: "cercana" | "extendida" };

/** Zona cercana sin costo; fuera de ella se cobra una tarifa fija por distrito. */
export const zonasDelivery: ZonaDelivery[] = [
  { distrito: "San Borja", costo: 0, zona: "cercana" },
  { distrito: "Surco", costo: 0, zona: "cercana" },
  { distrito: "Miraflores", costo: 6, zona: "extendida" },
  { distrito: "San Isidro", costo: 6, zona: "extendida" },
  { distrito: "San Juan de Miraflores", costo: 8, zona: "extendida" },
  { distrito: "Villa María del Triunfo", costo: 10, zona: "extendida" },
];

export const distritos = zonasDelivery.map((zona) => zona.distrito);

export function costoDeliveryDistrito(distrito: string) {
  return zonasDelivery.find((zona) => zona.distrito === distrito)?.costo ?? 0;
}

export type Descuento = { id: string; nombre: string; porcentaje: number; detalle: string };

export const descuentos: Descuento[] = [
  { id: "ninguno", nombre: "Sin descuento", porcentaje: 0, detalle: "Precio de lista" },
  { id: "nuevo", nombre: "Cliente nuevo", porcentaje: 10, detalle: "Primera orden" },
  { id: "frecuente", nombre: "Cliente frecuente", porcentaje: 15, detalle: "5 órdenes o más" },
  { id: "campana", nombre: "Promoción de temporada", porcentaje: 5, detalle: "Campaña vigente" },
];

export const tiposComprobante: { id: TipoComprobante; nombre: string; requiere: string }[] = [
  { id: "nota_venta", nombre: "Nota de venta", requiere: "Sin documento" },
  { id: "boleta", nombre: "Boleta", requiere: "Requiere DNI" },
  { id: "factura", nombre: "Factura", requiere: "Requiere RUC" },
];

export const danosFrecuentes = [
  "Manchado",
  "Roto",
  "Picado",
  "Desgastado",
  "Desteñido",
  "Sin botón",
];

/** Política de almacenamiento que se comunica al cliente en la recepción. */
export const politicaAlmacen = { diasGratis: 30, diasLimite: 90, cargoDiario: 1 };

export const repartidores: Repartidor[] = [
  {
    id: "pedro_quispe",
    nombre: "Pedro Quispe",
    iniciales: "PQ",
    vehiculo: "Moto 01",
    placa: "4821-3A",
    zona: "San Borja / Surco",
  },
  {
    id: "maria_rojas",
    nombre: "María Rojas",
    iniciales: "MR",
    vehiculo: "Moto 02",
    placa: "7310-4B",
    zona: "Miraflores / San Isidro",
  },
];

export const etapasProceso: EstadoPedido[] = [
  "En lavado",
  "En secado",
  "En planchado",
  "Control de calidad",
  "Listo para entregar",
];

export const pedidosDemo: Pedido[] = [
  {
    codigo: "LF-0418",
    cliente: "Valeria Flores",
    tipoDocumento: "DNI",
    documento: "71823456",
    telefono: "987 654 321",
    estado: "Control de calidad",
    estadoPago: "Pagado",
    medioPago: "Efectivo",
    total: 48,
    saldo: 0,
    fechaRecepcion: "2026-11-13",
    fechaCompromiso: "2026-11-15",
    fechaEntrega: "",
    servicio: "Lavado y planchado",
    tipoEntrega: "tienda",
    direccion: "Av. San Borja Norte 642, San Borja",
    referencia: "Portería, edificio Los Olivos",
    repartidor: "Por asignar",
    prendas: [
      {
        nombre: "Camisa",
        cantidad: 2,
        unidad: "prenda",
        marca: "Zara",
        color: "Celeste",
        observacion: SIN_OBSERVACIONES,
      },
      {
        nombre: "Pantalón de vestir",
        cantidad: 1,
        unidad: "prenda",
        marca: "Mango",
        color: "Negro",
        observacion: "Revisar bastilla",
      },
    ],
  },
  {
    codigo: "LF-0417",
    cliente: "Renato Paredes",
    tipoDocumento: "DNI",
    documento: "46278135",
    telefono: "965 221 480",
    estado: "En secado",
    estadoPago: "Adelanto",
    medioPago: "Transferencia",
    total: 72,
    saldo: 32,
    fechaRecepcion: "2026-11-13",
    fechaCompromiso: "2026-11-15",
    fechaEntrega: "",
    servicio: "Ropa al peso",
    tipoEntrega: "domicilio",
    direccion: "Calle Las Gardenias 218, Surco",
    referencia: "Casa de reja blanca",
    repartidor: "María Rojas",
    prendas: [
      {
        nombre: "Ropa diaria",
        cantidad: 6,
        unidad: "kg",
        marca: "—",
        color: "Mixto",
        observacion: "Separar prendas oscuras",
      },
    ],
  },
  {
    codigo: "LF-0416",
    cliente: "Camila Núñez",
    tipoDocumento: "DNI",
    documento: "70491826",
    telefono: "944 307 118",
    estado: "Listo para entregar",
    estadoPago: "Adelanto",
    medioPago: "Yape",
    total: 95,
    saldo: 45,
    fechaRecepcion: "2026-11-12",
    fechaCompromiso: "2026-11-14",
    fechaEntrega: "",
    servicio: "Ropa al seco",
    tipoEntrega: "domicilio",
    direccion: "Jr. Los Cedros 390, Miraflores",
    referencia: "Timbre 302",
    repartidor: "Pedro Quispe",
    prendas: [
      {
        nombre: "Saco",
        cantidad: 1,
        unidad: "prenda",
        marca: "Mango",
        color: "Azul marino",
        observacion: "Mancha en manga derecha",
      },
    ],
  },
  {
    codigo: "LF-0415",
    cliente: "Andrea Salas",
    tipoDocumento: "DNI",
    documento: "41950382",
    telefono: "976 140 552",
    estado: "En ruta",
    estadoPago: "Pagado",
    medioPago: "Efectivo",
    total: 64,
    saldo: 0,
    fechaRecepcion: "2026-11-12",
    fechaCompromiso: "2026-11-14",
    fechaEntrega: "",
    servicio: "Edredón matrimonial",
    tipoEntrega: "domicilio",
    direccion: "Av. Primavera 1840, Surco",
    referencia: "Torre B, dpto. 504",
    repartidor: "Pedro Quispe",
    prendas: [
      {
        nombre: "Edredón",
        cantidad: 1,
        unidad: "pieza",
        marca: "Rosen",
        color: "Gris",
        observacion: "Empaque completo",
      },
    ],
  },
  {
    codigo: "LF-0414",
    cliente: "Lucía Herrera",
    tipoDocumento: "DNI",
    documento: "72918340",
    telefono: "933 416 702",
    estado: "Entregado",
    estadoPago: "Pagado",
    medioPago: "Yape",
    total: 36,
    saldo: 0,
    fechaRecepcion: "2026-11-12",
    fechaCompromiso: "2026-11-13",
    fechaEntrega: "2026-11-13",
    servicio: "Planchado",
    tipoEntrega: "tienda",
    direccion: "Av. Aviación 2861, San Borja",
    referencia: "Recepción del edificio",
    repartidor: "—",
    prendas: [
      {
        nombre: "Vestido",
        cantidad: 1,
        unidad: "prenda",
        marca: "Zara",
        color: "Verde",
        observacion: "Entregado en funda",
      },
    ],
  },
  {
    codigo: "LF-0413",
    cliente: "Grupo Nítido SAC",
    tipoDocumento: "RUC",
    documento: "20604578123",
    telefono: "981 504 229",
    estado: "Entregado",
    estadoPago: "Adelanto",
    medioPago: "Transferencia",
    medioPagoSaldo: "Plin",
    total: 128,
    saldo: 28,
    fechaRecepcion: "2026-11-11",
    fechaCompromiso: "2026-11-13",
    fechaEntrega: "2026-11-12",
    servicio: "Lavado de uniformes",
    tipoEntrega: "domicilio",
    direccion: "Av. República de Panamá 3550, San Isidro",
    referencia: "Recepción de oficinas",
    repartidor: "María Rojas",
    prendas: [
      {
        nombre: "Uniforme",
        cantidad: 8,
        unidad: "prenda",
        marca: "—",
        color: "Blanco",
        observacion: "Lote revisado",
      },
    ],
  },
  {
    codigo: "LF-0412",
    cliente: "Mateo Cabrera",
    tipoDocumento: "DNI",
    documento: "73562014",
    telefono: "910 723 661",
    estado: "En lavado",
    estadoPago: "Adelanto",
    medioPago: "Plin",
    total: 53,
    saldo: 23,
    fechaRecepcion: "2026-11-14",
    fechaCompromiso: "2026-11-16",
    fechaEntrega: "",
    servicio: "Lavado y planchado",
    tipoEntrega: "domicilio",
    direccion: "Calle Las Dalias 112, San Borja",
    referencia: "Casa 4",
    repartidor: "María Rojas",
    prendas: [
      {
        nombre: "Camisa",
        cantidad: 3,
        unidad: "prenda",
        marca: "Uniqlo",
        color: "Blanco",
        observacion: "Cuello con manchas",
      },
    ],
  },
  {
    codigo: "LF-0411",
    cliente: "Jorge Medina",
    tipoDocumento: "DNI",
    documento: "45120987",
    telefono: "955 680 214",
    estado: "Listo para entregar",
    estadoPago: "Adelanto",
    medioPago: "Efectivo",
    total: 40,
    saldo: 15,
    fechaRecepcion: "2026-11-11",
    fechaCompromiso: "2026-11-14",
    fechaEntrega: "",
    servicio: "Lavado de cortinas",
    tipoEntrega: "tienda",
    direccion: "Recojo en tienda",
    referencia: "",
    repartidor: "—",
    prendas: [
      {
        nombre: "Cortinas",
        cantidad: 2,
        unidad: "pieza",
        marca: "—",
        color: "Beige",
        observacion: SIN_OBSERVACIONES,
      },
    ],
  },
];

export function normalizarTexto(valor: string) {
  return valor.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function filtrarPorTexto<T>(filas: T[], consulta: string, campos: (fila: T) => string[]) {
  const buscado = normalizarTexto(consulta);
  if (!buscado) return filas;
  return filas.filter((fila) =>
    campos(fila).some((campo) => normalizarTexto(campo).includes(buscado)),
  );
}

export function esDocumentoValido(tipo: TipoDocumento, valor: string) {
  return /^\d+$/.test(valor) && valor.length === (tipo === "DNI" ? 8 : 11);
}

export function esCelularValido(valor: string) {
  return /^[0-9 ]+$/.test(valor) && /^9\d{8}$/.test(valor.replace(/\D/g, ""));
}

export function esRucValido(valor: string) {
  return /^(10|15|17|20)\d{9}$/.test(valor);
}

export function enmascararDocumento(documento: string) {
  if (!documento || documento === "—") return "Sin documento";
  return `${"•".repeat(Math.max(0, documento.length - 3))}${documento.slice(-3)}`;
}

export function calcularDescuento(subtotal: number, idDescuento: string) {
  const porcentaje = descuentos.find((item) => item.id === idDescuento)?.porcentaje ?? 0;
  return Number(((subtotal * porcentaje) / 100).toFixed(2));
}

/** Evita registrar dos veces al mismo cliente: lo reconoce por celular o documento. */
export function buscarClientePorContacto(pedidos: Pedido[], telefono: string, documento: string) {
  const digitos = telefono.replace(/\D/g, "");
  return (
    pedidos.find(
      (pedido) =>
        (digitos.length === 9 && pedido.telefono.replace(/\D/g, "") === digitos) ||
        (documento.length >= 8 && pedido.documento === documento),
    ) ?? null
  );
}

export function rankingClientes(pedidos: Pedido[]) {
  const mapa = new Map<string, { cliente: string; ordenes: number; importe: number }>();
  for (const pedido of pedidos) {
    const clave = pedido.telefono.replace(/\D/g, "");
    const actual = mapa.get(clave) ?? { cliente: pedido.cliente, ordenes: 0, importe: 0 };
    mapa.set(clave, {
      ...actual,
      ordenes: actual.ordenes + 1,
      importe: actual.importe + pedido.total,
    });
  }
  return Array.from(mapa.values()).sort((a, b) => b.ordenes - a.ordenes || b.importe - a.importe);
}

function moverFecha(fecha: string, dias: number) {
  if (!fecha) return fecha;
  const resultado = new Date(`${fecha}T12:00:00Z`);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado.toISOString().slice(0, 10);
}

/** Mueve las fechas de los pedidos de ejemplo para que la prueba siempre ocurra "hoy". */
export function desplazarFechasPedidos(pedidos: Pedido[], dias: number): Pedido[] {
  if (!dias) return pedidos;
  return pedidos.map((pedido) => ({
    ...pedido,
    fechaRecepcion: moverFecha(pedido.fechaRecepcion, dias),
    fechaCompromiso: moverFecha(pedido.fechaCompromiso, dias),
    fechaEntrega: moverFecha(pedido.fechaEntrega, dias),
  }));
}

export function buscarServicio(idServicio: string) {
  return catalogoServicios.find((servicio) => servicio.id === idServicio);
}

export function calcularTotalServicio(idServicio: string, cantidad: number) {
  const servicio = buscarServicio(idServicio);
  if (!servicio || !Number.isFinite(cantidad) || cantidad <= 0) return 0;
  if (servicio.minimo && cantidad < servicio.minimo.cantidad) return servicio.minimo.importe;
  return Number((cantidad * servicio.precio).toFixed(2));
}

export function calcularEstadoPago(total: number, adelanto: number): EstadoPago {
  if (adelanto <= 0) return "Pendiente";
  return adelanto >= total ? "Pagado" : "Adelanto";
}

export function generarCodigoPedido(pedidos: Pedido[]) {
  const mayor = Math.max(
    0,
    ...pedidos.map((pedido) => Number(pedido.codigo.split("-").at(-1)) || 0),
  );
  return `LF-${String(mayor + 1).padStart(4, "0")}`;
}

export function describirPrenda(prenda: Prenda) {
  return prenda.unidad === "kg"
    ? `${prenda.cantidad} kg · ${prenda.nombre}`
    : `${prenda.cantidad} × ${prenda.nombre}`;
}

export function resumirPrendas(prendas: Prenda[]) {
  return prendas.map(describirPrenda).join(" · ");
}

export function contarObservaciones(prendas: Prenda[]) {
  return prendas.filter((prenda) => prenda.observacion && prenda.observacion !== SIN_OBSERVACIONES)
    .length;
}

export function anteriorEtapa(estado: EstadoPedido): EstadoPedido | null {
  const indice = etapasProceso.indexOf(estado);
  if (indice <= 0) return null;
  return etapasProceso[indice - 1] ?? null;
}

/** Edredones, frazadas y ropa por kilo no se planchan: pasan de secado directo a control. */
export function siguienteEtapaPedido(pedido: Pedido): EstadoPedido | null {
  const siguiente = siguienteEtapa(pedido.estado);
  const requierePlanchado = pedido.prendas.some((prenda) => prenda.unidad === "prenda");
  if (siguiente === "En planchado" && !requierePlanchado) return "Control de calidad";
  return siguiente;
}

export function crearMensajeAviso(pedido: Pedido) {
  const nombre = pedido.cliente.split(" ")[0] ?? pedido.cliente;
  const destino =
    pedido.tipoEntrega === "tienda"
      ? "ya puedes recogerlo en tienda"
      : "saldrá a reparto a tu dirección registrada";
  const saldo = pedido.saldo > 0 ? ` Saldo por pagar: S/ ${pedido.saldo.toFixed(2)}.` : "";
  return `Hola ${nombre}, tu pedido ${pedido.codigo} está listo y ${destino}.${saldo} Gracias por confiar en nosotros.`;
}

export function diasEnTienda(pedido: Pedido, hoy: string) {
  return Math.max(0, diferenciaDias(pedido.fechaCompromiso, hoy));
}

export function siguienteEtapa(estado: EstadoPedido): EstadoPedido | null {
  const indice = etapasProceso.indexOf(estado);
  if (indice < 0 || indice >= etapasProceso.length - 1) return null;
  return etapasProceso[indice + 1] ?? null;
}

export function diferenciaDias(desde: string, hasta: string) {
  const inicio = Date.parse(`${desde}T12:00:00Z`);
  const fin = Date.parse(`${hasta}T12:00:00Z`);
  return Math.round((fin - inicio) / 86_400_000);
}

export function calcularUrgencia(fechaCompromiso: string, hoy: string): Urgencia {
  const dias = diferenciaDias(hoy, fechaCompromiso);
  if (dias < 0) return "vencido";
  if (dias === 0) return "hoy";
  if (dias === 1) return "manana";
  return "a_tiempo";
}

const pesoUrgencia: Record<Urgencia, number> = { vencido: 0, hoy: 1, manana: 2, a_tiempo: 3 };

export function ordenarPorUrgencia(pedidos: Pedido[], hoy: string) {
  return [...pedidos].sort(
    (a, b) =>
      pesoUrgencia[calcularUrgencia(a.fechaCompromiso, hoy)] -
        pesoUrgencia[calcularUrgencia(b.fechaCompromiso, hoy)] ||
      a.fechaCompromiso.localeCompare(b.fechaCompromiso),
  );
}

export type Grupo<T> = { clave: string; elementos: T[] };

export function agruparPor<T>(elementos: T[], obtenerClave: (elemento: T) => string): Grupo<T>[] {
  const grupos = new Map<string, T[]>();
  for (const elemento of elementos) {
    const clave = obtenerClave(elemento);
    grupos.set(clave, [...(grupos.get(clave) ?? []), elemento]);
  }
  return Array.from(grupos, ([clave, lista]) => ({ clave, elementos: lista }));
}

export type FiltrosEntregados = {
  texto: string;
  estadoPago: EstadoPago | "Todos";
  medioPago: MedioPago | "Todos";
  desde: string;
  hasta: string;
};

export function filtrarPedidosEntregados(pedidos: Pedido[], filtros: FiltrosEntregados) {
  return pedidos.filter((pedido) => {
    if (pedido.estado !== "Entregado") return false;
    if (filtros.estadoPago !== "Todos" && pedido.estadoPago !== filtros.estadoPago) return false;
    if (
      filtros.medioPago !== "Todos" &&
      pedido.medioPago !== filtros.medioPago &&
      pedido.medioPagoSaldo !== filtros.medioPago
    ) {
      return false;
    }
    if (filtros.desde && pedido.fechaEntrega < filtros.desde) return false;
    if (filtros.hasta && pedido.fechaEntrega > filtros.hasta) return false;
    return (
      filtrarPorTexto([pedido], filtros.texto, (fila) => [
        fila.codigo,
        fila.cliente,
        fila.documento,
        fila.telefono,
        fila.medioPago ?? "",
        fila.medioPagoSaldo ?? "",
        ...fila.prendas.map((prenda) => prenda.nombre),
      ]).length > 0
    );
  });
}
