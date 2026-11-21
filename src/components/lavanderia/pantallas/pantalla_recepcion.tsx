import { useState, type ChangeEvent } from "react";
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarClock,
  Camera,
  Check,
  ClipboardList,
  FileText,
  House,
  Inbox,
  Minus,
  Plus,
  Printer,
  Store,
  Tag,
  Timer,
  Trash2,
  Truck,
  UserRound,
  UserRoundCheck,
  Wallet,
  Warehouse,
  X,
  type LucideIcon,
} from "lucide-react";

import { AsistentePasos, type PasoAsistente } from "../asistente_pasos";
import { VistaCompletado } from "../componentes_pedido";
import {
  Aviso,
  CampoFormulario,
  ControlSegmentado,
  EncabezadoSeccion,
  EstadoVacio,
  EtiquetaEstado,
  FilaMetricas,
  IndicadorUrgencia,
  ListaDatos,
  MiniaturaPrenda,
  Selector,
  type DatoMetrica,
} from "../elementos";
import { CodigoQr, SimuladorPago } from "../simulador_pago";
import {
  filtrarCantidad,
  filtrarDireccion,
  filtrarMonto,
  filtrarRazonSocial,
  filtrarSoloDigitos,
  filtrarSoloLetras,
  filtrarTextoLibre,
  formatearCelular,
} from "@/lib/filtros_entrada";
import {
  formatearFecha,
  formatearFechaLarga,
  formatearMoneda,
  relleno,
  sumarDias,
} from "@/lib/formato";
import {
  SIN_OBSERVACIONES,
  agruparPor,
  buscarClientePorContacto,
  buscarServicio,
  calcularDescuento,
  calcularEstadoPago,
  calcularTotalServicio,
  catalogoServicios,
  categoriasServicio,
  costoDeliveryDistrito,
  danosFrecuentes,
  descuentos,
  esCelularValido,
  esDocumentoValido,
  esRucValido,
  generarCodigoPedido,
  politicaAlmacen,
  resumirPrendas,
  tiposComprobante,
  zonasDelivery,
  type CategoriaServicio,
  type PagoRegistrado,
  type Pedido,
  type Prenda,
  type TipoComprobante,
  type TipoEntrega,
} from "@/lib/pedidos";

type TipoCliente = "persona" | "empresa";
type ModoAdelanto = "ninguno" | "parcial" | "total";

type LineaPrenda = {
  id: number;
  servicioId: string;
  nombre: string;
  cantidad: string;
  color: string;
  marca: string;
  danos: string[];
  observacion: string;
  evidencias: string[];
};

type BorradorRecepcion = {
  tipoCliente: TipoCliente;
  nombres: string;
  apellidos: string;
  razonSocial: string;
  documento: string;
  telefono: string;
  direccionCliente: string;
  prendas: LineaPrenda[];
  fechaDesde: string;
  fechaHasta: string;
  tipoEntrega: TipoEntrega;
  direccion: string;
  distrito: string;
  referencia: string;
  descuentoId: string;
  comprobante: TipoComprobante;
  modoAdelanto: ModoAdelanto;
  adelanto: string;
  pago: PagoRegistrado | null;
  notas: string;
};

type MetaPaso = { id: string; titulo: string; descripcion: string; icono: LucideIcon };

const pasosRecepcion: MetaPaso[] = [
  {
    id: "cliente",
    titulo: "Cliente",
    descripcion: "Nombre y celular de contacto",
    icono: UserRound,
  },
  {
    id: "prendas",
    titulo: "Prendas",
    descripcion: "Servicio, detalle y evidencia",
    icono: ClipboardList,
  },
  {
    id: "entrega",
    titulo: "Entrega y pago",
    descripcion: "Modalidad, descuento y cobro",
    icono: Wallet,
  },
  {
    id: "confirmacion",
    titulo: "Confirmación",
    descripcion: "Revisa la orden antes de registrar",
    icono: FileText,
  },
];

const MAXIMO_FOTOS = 3;
const primeraCategoria = categoriasServicio[0]?.id ?? "planchado";

function primerServicioDe(categoria: CategoriaServicio) {
  return catalogoServicios.find((servicio) => servicio.categoria === categoria)?.id ?? "";
}

function crearLinea(id: number, servicioId = primerServicioDe(primeraCategoria)): LineaPrenda {
  return {
    id,
    servicioId,
    nombre: buscarServicio(servicioId)?.prendaSugerida ?? "",
    cantidad: "1",
    color: "",
    marca: "",
    danos: [],
    observacion: "",
    evidencias: [],
  };
}

function crearBorrador(hoy: string): BorradorRecepcion {
  return {
    tipoCliente: "persona",
    nombres: "",
    apellidos: "",
    razonSocial: "",
    documento: "",
    telefono: "",
    direccionCliente: "",
    prendas: [],
    fechaDesde: sumarDias(hoy, 1),
    fechaHasta: sumarDias(hoy, 2),
    tipoEntrega: "tienda",
    direccion: "",
    distrito: zonasDelivery[0]?.distrito ?? "",
    referencia: "",
    descuentoId: "ninguno",
    comprobante: "nota_venta",
    modoAdelanto: "ninguno",
    adelanto: "",
    pago: null,
    notas: "",
  };
}

function importeLinea(linea: LineaPrenda) {
  return calcularTotalServicio(linea.servicioId, Number(linea.cantidad));
}

function textoObservacion(linea: LineaPrenda) {
  return [...linea.danos, linea.observacion.trim()].filter(Boolean).join(", ");
}

function nombreCliente(borrador: BorradorRecepcion) {
  if (borrador.tipoCliente === "empresa") return borrador.razonSocial.trim();
  return `${borrador.nombres.trim()} ${borrador.apellidos.trim()}`.trim();
}

function etiquetaDia(fecha: string, hoy: string) {
  if (fecha === hoy) return "Hoy";
  if (fecha === sumarDias(hoy, -1)) return "Ayer";
  return formatearFechaLarga(fecha);
}

export function PantallaRecepcion({
  pedidos,
  hoy,
  alRegistrar,
}: {
  pedidos: Pedido[];
  hoy: string;
  alRegistrar: (pedido: Pedido) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [sesion, setSesion] = useState(0);
  const [borrador, setBorrador] = useState<BorradorRecepcion>(() => crearBorrador(hoy));
  const [categoria, setCategoria] = useState<CategoriaServicio>(primeraCategoria);
  const [linea, setLinea] = useState<LineaPrenda>(() => crearLinea(1));
  const [errorLinea, setErrorLinea] = useState("");
  const [registrado, setRegistrado] = useState<Pedido | null>(null);

  const actualizar = (cambios: Partial<BorradorRecepcion>) =>
    setBorrador((actual) => ({ ...actual, ...cambios }));

  const subtotal = borrador.prendas.reduce((suma, item) => suma + importeLinea(item), 0);
  const montoDescuento = calcularDescuento(subtotal, borrador.descuentoId);
  const costoDelivery =
    borrador.tipoEntrega === "domicilio" ? costoDeliveryDistrito(borrador.distrito) : 0;
  const total = Number((subtotal - montoDescuento + costoDelivery).toFixed(2));
  const adelanto =
    borrador.modoAdelanto === "total"
      ? total
      : borrador.modoAdelanto === "parcial"
        ? Math.min(total, Number(borrador.adelanto) || 0)
        : 0;
  const saldo = Number(Math.max(0, total - adelanto).toFixed(2));
  const servicioLinea = buscarServicio(linea.servicioId);
  const esPorPeso = servicioLinea?.unidad === "kg";
  const serviciosCategoria = catalogoServicios.filter(
    (servicio) => servicio.categoria === categoria,
  );
  const clienteExistente = buscarClientePorContacto(pedidos, borrador.telefono, borrador.documento);
  const yaUsaDatos = clienteExistente?.cliente === nombreCliente(borrador);

  /** Cualquier cambio en el importe anula el cobro ya registrado para no descuadrar caja. */
  const actualizarImporte = (cambios: Partial<BorradorRecepcion>) =>
    actualizar({ ...cambios, pago: null });

  const abrirRecorrido = () => {
    setBorrador(crearBorrador(hoy));
    setCategoria(primeraCategoria);
    setLinea(crearLinea(1));
    setErrorLinea("");
    setRegistrado(null);
    setSesion((actual) => actual + 1);
    setAbierto(true);
  };

  const usarClienteExistente = () => {
    if (!clienteExistente) return;
    const esEmpresa = clienteExistente.tipoDocumento === "RUC";
    const [nombres = "", ...resto] = clienteExistente.cliente.split(" ");
    actualizar({
      tipoCliente: esEmpresa ? "empresa" : "persona",
      razonSocial: esEmpresa ? clienteExistente.cliente : "",
      nombres: esEmpresa ? "" : nombres,
      apellidos: esEmpresa ? "" : resto.join(" "),
      documento: clienteExistente.documento === "—" ? "" : clienteExistente.documento,
      telefono: formatearCelular(clienteExistente.telefono),
      direccionCliente:
        clienteExistente.direccion === "Recojo en tienda"
          ? ""
          : (clienteExistente.direccion.split(",")[0] ?? ""),
    });
  };

  const validarLinea = () => {
    if (!linea.nombre.trim()) return "Indica el nombre de la prenda o artículo.";
    if (!(Number(linea.cantidad) > 0)) return "La cantidad debe ser mayor a cero.";
    return "";
  };

  const agregarLinea = () => {
    const mensaje = validarLinea();
    setErrorLinea(mensaje);
    if (mensaje) return false;
    actualizarImporte({ prendas: [...borrador.prendas, linea] });
    setLinea(crearLinea(linea.id + 1, linea.servicioId));
    return true;
  };

  const elegirServicio = (servicioId: string) => {
    const anterior = buscarServicio(linea.servicioId);
    const nombreEsSugerido = !linea.nombre.trim() || linea.nombre === anterior?.prendaSugerida;
    const servicio = buscarServicio(servicioId);
    setLinea({
      ...linea,
      servicioId,
      cantidad: servicio?.unidad === "kg" ? String(servicio.minimo?.cantidad ?? 1) : "1",
      nombre: nombreEsSugerido ? (servicio?.prendaSugerida ?? "") : linea.nombre,
    });
  };

  const cambiarCantidad = (delta: number) => {
    const paso = esPorPeso ? 0.5 : 1;
    const nueva = Math.max(paso, (Number(linea.cantidad) || 0) + delta * paso);
    setLinea({ ...linea, cantidad: String(nueva) });
  };

  const alternarDano = (dano: string) =>
    setLinea({
      ...linea,
      danos: linea.danos.includes(dano)
        ? linea.danos.filter((item) => item !== dano)
        : [...linea.danos, dano],
    });

  const agregarFotos = (evento: ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(evento.target.files ?? [])
      .filter((archivo) => archivo.type.startsWith("image/"))
      .slice(0, MAXIMO_FOTOS - linea.evidencias.length);
    const vistas = archivos.map((archivo) => URL.createObjectURL(archivo));
    setLinea({ ...linea, evidencias: [...linea.evidencias, ...vistas] });
    evento.target.value = "";
  };

  const registrar = () => {
    const codigo = generarCodigoPedido(pedidos);
    const prendas: Prenda[] = borrador.prendas.map((item) => ({
      nombre: item.nombre.trim(),
      cantidad: Number(item.cantidad),
      unidad: buscarServicio(item.servicioId)?.unidad ?? "prenda",
      marca: item.marca.trim() || "—",
      color: item.color.trim() || "No indicado",
      observacion: textoObservacion(item) || SIN_OBSERVACIONES,
      evidencias: item.evidencias.length ? item.evidencias : undefined,
    }));
    const servicios = Array.from(
      new Set(
        borrador.prendas.map((item) => buscarServicio(item.servicioId)?.nombre ?? "Servicio"),
      ),
    );
    const esDomicilio = borrador.tipoEntrega === "domicilio";
    const pedido: Pedido = {
      codigo,
      cliente: nombreCliente(borrador),
      tipoDocumento: borrador.tipoCliente === "empresa" ? "RUC" : "DNI",
      documento: borrador.documento || "—",
      telefono: borrador.telefono,
      estado: "En lavado",
      estadoPago: calcularEstadoPago(total, adelanto),
      medioPago: borrador.pago?.medio,
      total,
      saldo,
      fechaRecepcion: hoy,
      fechaEstimadaDesde: borrador.fechaDesde || undefined,
      fechaCompromiso: borrador.fechaHasta || borrador.fechaDesde,
      fechaEntrega: "",
      servicio: servicios.join(" + "),
      tipoEntrega: borrador.tipoEntrega,
      direccion: esDomicilio
        ? `${borrador.direccion.trim()}, ${borrador.distrito}`
        : "Recojo en tienda",
      referencia: esDomicilio ? borrador.referencia.trim() : "",
      repartidor: esDomicilio ? "Por asignar" : "—",
      prendas,
      notas: borrador.notas.trim() || undefined,
      costoDelivery: costoDelivery || undefined,
      descuento: montoDescuento || undefined,
      comprobante: borrador.comprobante,
      pagos: borrador.pago ? [borrador.pago] : undefined,
    };
    alRegistrar(pedido);
    setRegistrado(pedido);
  };

  const pasoCliente: PasoAsistente = {
    ...(pasosRecepcion[0] as MetaPaso),
    validar: () => {
      if (borrador.tipoCliente === "persona") {
        if (borrador.nombres.trim().length < 2) return "Ingresa los nombres del cliente.";
        if (borrador.apellidos.trim().length < 2)
          return "Ingresa al menos un apellido para evitar homónimos.";
        if (borrador.documento && !esDocumentoValido("DNI", borrador.documento))
          return "El DNI debe tener 8 dígitos o quedar vacío.";
      } else {
        if (borrador.razonSocial.trim().length < 3) return "Ingresa la razón social.";
        if (!esRucValido(borrador.documento))
          return "El RUC debe tener 11 dígitos y empezar en 10, 15, 17 o 20.";
      }
      if (!esCelularValido(borrador.telefono))
        return "El celular debe tener 9 dígitos y empezar en 9.";
      return null;
    },
    contenido: (
      <div className="pila_contenido">
        <fieldset className="grupo_campos">
          <legend>Tipo de cliente</legend>
          <ControlSegmentado
            etiqueta="Tipo de cliente"
            valor={borrador.tipoCliente}
            alCambiar={(valor) =>
              actualizar({
                tipoCliente: valor as TipoCliente,
                documento: "",
                comprobante: valor === "empresa" ? "factura" : "nota_venta",
              })
            }
            opciones={[
              { valor: "persona", etiqueta: "Persona", icono: UserRound },
              { valor: "empresa", etiqueta: "Empresa", icono: Building2 },
            ]}
          />
        </fieldset>
        <div className="rejilla_campos">
          {borrador.tipoCliente === "persona" ? (
            <>
              <CampoFormulario etiqueta="Nombres" obligatorio ayuda="Solo letras">
                <input
                  data-autofoco
                  className="entrada"
                  value={borrador.nombres}
                  onChange={(evento) =>
                    actualizar({ nombres: filtrarSoloLetras(evento.target.value, 40) })
                  }
                  placeholder="Ej. Valeria"
                  autoComplete="off"
                />
              </CampoFormulario>
              <CampoFormulario etiqueta="Apellidos" obligatorio ayuda="Solo letras">
                <input
                  className="entrada"
                  value={borrador.apellidos}
                  onChange={(evento) =>
                    actualizar({ apellidos: filtrarSoloLetras(evento.target.value, 40) })
                  }
                  placeholder="Ej. Flores Ramos"
                  autoComplete="off"
                />
              </CampoFormulario>
              <CampoFormulario
                etiqueta="DNI"
                ayuda="Opcional · 8 dígitos · solo para boleta o entrega a terceros"
              >
                <input
                  className="entrada"
                  inputMode="numeric"
                  value={borrador.documento}
                  onChange={(evento) =>
                    actualizar({ documento: filtrarSoloDigitos(evento.target.value, 8) })
                  }
                  placeholder="12345678"
                />
              </CampoFormulario>
            </>
          ) : (
            <>
              <CampoFormulario etiqueta="Razón social" obligatorio ancho="completo">
                <input
                  data-autofoco
                  className="entrada"
                  value={borrador.razonSocial}
                  onChange={(evento) =>
                    actualizar({ razonSocial: filtrarRazonSocial(evento.target.value) })
                  }
                  placeholder="Ej. Grupo Nítido SAC"
                />
              </CampoFormulario>
              <CampoFormulario etiqueta="RUC" obligatorio ayuda="11 dígitos">
                <input
                  className="entrada"
                  inputMode="numeric"
                  value={borrador.documento}
                  onChange={(evento) =>
                    actualizar({ documento: filtrarSoloDigitos(evento.target.value, 11) })
                  }
                  placeholder="20123456789"
                />
              </CampoFormulario>
            </>
          )}
          <CampoFormulario
            etiqueta="Celular"
            obligatorio
            ayuda="Para avisar cuando el pedido esté listo"
          >
            <input
              className="entrada"
              type="tel"
              inputMode="numeric"
              value={borrador.telefono}
              onChange={(evento) => actualizar({ telefono: formatearCelular(evento.target.value) })}
              placeholder="999 999 999"
            />
          </CampoFormulario>
          <CampoFormulario
            etiqueta="Dirección"
            ayuda="Opcional · se usa si pide delivery"
            ancho="completo"
          >
            <input
              className="entrada"
              value={borrador.direccionCliente}
              onChange={(evento) =>
                actualizar({ direccionCliente: filtrarDireccion(evento.target.value) })
              }
              placeholder="Calle, número y distrito"
            />
          </CampoFormulario>
        </div>
        {clienteExistente && !yaUsaDatos && (
          <Aviso tono="info" icono={UserRoundCheck}>
            <div className="aviso_con_accion">
              <span>
                <strong>Este celular ya está registrado.</strong> Usa sus datos para no duplicar al
                cliente.
              </span>
              <button
                type="button"
                className="boton boton_secundario boton_pequeno"
                onClick={usarClienteExistente}
              >
                Usar datos de {clienteExistente.cliente.split(" ")[0]}
              </button>
            </div>
          </Aviso>
        )}
      </div>
    ),
  };

  const pasoPrendas: PasoAsistente = {
    ...(pasosRecepcion[1] as MetaPaso),
    validar: () => {
      if (borrador.prendas.length > 0) return null;
      if (!validarLinea() && agregarLinea()) return null;
      return "Agrega al menos una prenda a la lista.";
    },
    contenido: (
      <div className="pila_contenido">
        <div className="tarjeta_formulario">
          <p className="tarjeta_formulario_titulo">
            <Plus aria-hidden="true" />
            Agregar prenda
          </p>
          <fieldset className="grupo_campos">
            <legend>Categoría de servicio</legend>
            <ControlSegmentado
              etiqueta="Categoría de servicio"
              variante="fichas"
              valor={categoria}
              alCambiar={(valor) => {
                setCategoria(valor as CategoriaServicio);
                elegirServicio(primerServicioDe(valor as CategoriaServicio));
              }}
              opciones={categoriasServicio.map((item) => ({
                valor: item.id,
                etiqueta: item.nombre,
                cantidad: catalogoServicios.filter((servicio) => servicio.categoria === item.id)
                  .length,
              }))}
            />
          </fieldset>
          <ul className="rejilla_servicios" role="radiogroup" aria-label="Servicio">
            {serviciosCategoria.map((servicio) => {
              const activo = servicio.id === linea.servicioId;
              return (
                <li key={servicio.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={activo}
                    className={`tarjeta_servicio ${activo ? "tarjeta_servicio_activa" : ""}`}
                    onClick={() => elegirServicio(servicio.id)}
                  >
                    <MiniaturaPrenda nombre={servicio.prendaSugerida} />
                    <span>
                      <strong>{servicio.nombre}</strong>
                      <small>
                        {formatearMoneda(servicio.precio)} / {servicio.unidad}
                      </small>
                    </span>
                    {activo && <Check className="tarjeta_servicio_marca" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="rejilla_campos">
            <CampoFormulario etiqueta="Prenda o artículo" obligatorio>
              <input
                className="entrada"
                value={linea.nombre}
                onChange={(evento) =>
                  setLinea({ ...linea, nombre: filtrarSoloLetras(evento.target.value, 40) })
                }
                placeholder="Ej. Camisa"
              />
            </CampoFormulario>
            <CampoFormulario
              etiqueta={esPorPeso ? "Peso (kg)" : "Cantidad"}
              obligatorio
              agrupaControles
              ayuda={
                servicioLinea?.minimo ? `Mínimo ${servicioLinea.minimo.cantidad} kg` : undefined
              }
            >
              <div className="selector_cantidad">
                <button
                  type="button"
                  className="boton_icono"
                  onClick={() => cambiarCantidad(-1)}
                  aria-label="Restar"
                >
                  <Minus />
                </button>
                <input
                  className="entrada"
                  inputMode={esPorPeso ? "decimal" : "numeric"}
                  aria-label={esPorPeso ? "Peso en kilos" : "Cantidad"}
                  value={linea.cantidad}
                  onChange={(evento) =>
                    setLinea({
                      ...linea,
                      cantidad: filtrarCantidad(evento.target.value, esPorPeso),
                    })
                  }
                />
                <button
                  type="button"
                  className="boton_icono"
                  onClick={() => cambiarCantidad(1)}
                  aria-label="Sumar"
                >
                  <Plus />
                </button>
              </div>
            </CampoFormulario>
            <CampoFormulario etiqueta="Color">
              <input
                className="entrada"
                value={linea.color}
                onChange={(evento) =>
                  setLinea({ ...linea, color: filtrarSoloLetras(evento.target.value, 30) })
                }
                placeholder="Ej. Azul marino"
              />
            </CampoFormulario>
            <CampoFormulario etiqueta="Marca">
              <input
                className="entrada"
                value={linea.marca}
                onChange={(evento) =>
                  setLinea({ ...linea, marca: filtrarRazonSocial(evento.target.value, 30) })
                }
                placeholder="Ej. H&M"
              />
            </CampoFormulario>
          </div>
          <fieldset className="grupo_campos">
            <legend>Estado previo de la prenda</legend>
            <div className="lista_fichas">
              {danosFrecuentes.map((dano) => {
                const activo = linea.danos.includes(dano);
                return (
                  <button
                    key={dano}
                    type="button"
                    aria-pressed={activo}
                    className={`ficha_accion ${activo ? "ficha_accion_activa" : ""}`}
                    onClick={() => alternarDano(dano)}
                  >
                    {activo && <Check aria-hidden="true" />}
                    {dano}
                  </button>
                );
              })}
            </div>
            <input
              className="entrada"
              aria-label="Detalle del daño u observación"
              value={linea.observacion}
              onChange={(evento) =>
                setLinea({ ...linea, observacion: filtrarTextoLibre(evento.target.value, 100) })
              }
              placeholder="Detalle adicional: ej. mancha en manga derecha"
            />
          </fieldset>
          <fieldset className="grupo_campos">
            <legend>Fotos de evidencia</legend>
            <div className="galeria_evidencias">
              {linea.evidencias.map((url, indice) => (
                <figure key={url} className="evidencia">
                  <img
                    src={url}
                    alt={`Evidencia ${indice + 1} de ${linea.nombre || "la prenda"}`}
                  />
                  <button
                    type="button"
                    className="evidencia_quitar"
                    aria-label={`Quitar foto ${indice + 1}`}
                    onClick={() =>
                      setLinea({
                        ...linea,
                        evidencias: linea.evidencias.filter((item) => item !== url),
                      })
                    }
                  >
                    <X />
                  </button>
                </figure>
              ))}
              {linea.evidencias.length < MAXIMO_FOTOS && (
                <label className="evidencia_agregar">
                  <Camera aria-hidden="true" />
                  <span>Tomar o subir foto</span>
                  <small>
                    {linea.evidencias.length}/{MAXIMO_FOTOS}
                  </small>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="solo_lector"
                    onChange={agregarFotos}
                  />
                </label>
              )}
            </div>
            <small className="campo_ayuda">
              Respalda daños previos ante reclamos. En esta prueba las fotos solo se ven en tu
              navegador.
            </small>
          </fieldset>
          <div className="tarjeta_formulario_pie">
            <span className="importe_previo">
              Importe estimado <strong>{formatearMoneda(importeLinea(linea))}</strong>
            </span>
            <button type="button" className="boton boton_secundario" onClick={agregarLinea}>
              <Plus />
              Agregar a la lista
            </button>
          </div>
          {errorLinea && (
            <p className="campo_error" role="alert">
              {errorLinea}
            </p>
          )}
        </div>

        <section className="bloque_lista" aria-label="Prendas agregadas">
          <header className="bloque_lista_encabezado">
            <h4>Prendas de la orden</h4>
            <span className="contador_pildora">{borrador.prendas.length}</span>
          </header>
          {borrador.prendas.length === 0 ? (
            <EstadoVacio
              titulo="Aún no hay prendas"
              descripcion="Elige un servicio, completa el detalle y pulsa «Agregar a la lista»."
              icono={ClipboardList}
            />
          ) : (
            <ul className="lista_lineas">
              {borrador.prendas.map((item, indice) => {
                const servicio = buscarServicio(item.servicioId);
                return (
                  <li key={item.id} className="linea_prenda">
                    <span className="linea_prenda_numero">{relleno(indice + 1)}</span>
                    <MiniaturaPrenda nombre={item.nombre} />
                    <div className="linea_prenda_texto">
                      <strong>
                        {item.cantidad} {servicio?.unidad === "kg" ? "kg" : "×"} {item.nombre}
                      </strong>
                      <span>{servicio?.nombre}</span>
                      <small>
                        {[item.color, item.marca, textoObservacion(item)]
                          .filter(Boolean)
                          .join(" · ") || "Sin detalles adicionales"}
                        {item.evidencias.length > 0 && (
                          <span className="nota_fotos">
                            <Camera aria-hidden="true" />
                            {item.evidencias.length}
                          </span>
                        )}
                      </small>
                    </div>
                    <strong className="linea_prenda_importe">
                      {formatearMoneda(importeLinea(item))}
                    </strong>
                    <button
                      type="button"
                      className="boton_icono"
                      aria-label={`Quitar ${item.nombre}`}
                      onClick={() =>
                        actualizarImporte({
                          prendas: borrador.prendas.filter((elemento) => elemento.id !== item.id),
                        })
                      }
                    >
                      <Trash2 />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <footer className="bloque_lista_total">
            <span>Subtotal</span>
            <strong>{formatearMoneda(subtotal)}</strong>
          </footer>
        </section>
      </div>
    ),
  };

  const pasoEntrega: PasoAsistente = {
    ...(pasosRecepcion[2] as MetaPaso),
    validar: () => {
      if (borrador.fechaDesde && borrador.fechaDesde < hoy)
        return "La entrega estimada no puede ser anterior a hoy.";
      if (borrador.fechaDesde && borrador.fechaHasta && borrador.fechaHasta < borrador.fechaDesde)
        return "La fecha «hasta» debe ser igual o posterior a «desde».";
      if (borrador.tipoEntrega === "domicilio" && borrador.direccion.trim().length < 5)
        return "Ingresa la dirección de entrega (calle y número).";
      if (borrador.comprobante === "boleta" && !esDocumentoValido("DNI", borrador.documento))
        return "La boleta requiere el DNI del cliente. Agrégalo en el paso Cliente o elige nota de venta.";
      if (borrador.comprobante === "factura" && !esRucValido(borrador.documento))
        return "La factura requiere un cliente empresa con RUC válido.";
      if (borrador.modoAdelanto === "parcial" && !(adelanto > 0))
        return "Ingresa el monto del adelanto.";
      if (borrador.modoAdelanto === "parcial" && adelanto >= total)
        return "Si el adelanto cubre el total, elige «Pago total».";
      if (adelanto > 0 && !borrador.pago)
        return "Registra el cobro del adelanto antes de continuar.";
      return null;
    },
    contenido: (
      <div className="pila_contenido">
        <fieldset className="grupo_campos">
          <legend>Modalidad de entrega</legend>
          <ControlSegmentado
            etiqueta="Modalidad de entrega"
            valor={borrador.tipoEntrega}
            alCambiar={(valor) =>
              actualizarImporte({
                tipoEntrega: valor as TipoEntrega,
                direccion: borrador.direccion || borrador.direccionCliente,
              })
            }
            opciones={[
              { valor: "tienda", etiqueta: "Recojo en tienda", icono: Store },
              { valor: "domicilio", etiqueta: "Delivery a domicilio", icono: Truck },
            ]}
          />
        </fieldset>
        <div className="rejilla_campos">
          <CampoFormulario etiqueta="Entrega estimada desde" ayuda="Opcional">
            <input
              className="entrada"
              type="date"
              min={hoy}
              value={borrador.fechaDesde}
              onChange={(evento) => actualizar({ fechaDesde: evento.target.value })}
            />
          </CampoFormulario>
          <CampoFormulario etiqueta="Hasta" ayuda="Rango orientativo para el cliente">
            <input
              className="entrada"
              type="date"
              min={borrador.fechaDesde || hoy}
              value={borrador.fechaHasta}
              onChange={(evento) => actualizar({ fechaHasta: evento.target.value })}
            />
          </CampoFormulario>
          {borrador.tipoEntrega === "domicilio" && (
            <>
              <CampoFormulario
                etiqueta="Distrito"
                ayuda={
                  costoDelivery
                    ? `Delivery ${formatearMoneda(costoDelivery)}`
                    : "Zona cercana · delivery gratis"
                }
              >
                <Selector
                  etiqueta="Distrito"
                  valor={borrador.distrito}
                  alCambiar={(valor) => actualizarImporte({ distrito: valor })}
                  opciones={zonasDelivery.map((zona) => ({
                    valor: zona.distrito,
                    etiqueta: `${zona.distrito} · ${zona.costo ? formatearMoneda(zona.costo) : "Gratis"}`,
                  }))}
                />
              </CampoFormulario>
              <CampoFormulario etiqueta="Dirección de entrega" obligatorio>
                <input
                  className="entrada"
                  value={borrador.direccion}
                  onChange={(evento) =>
                    actualizar({ direccion: filtrarDireccion(evento.target.value) })
                  }
                  placeholder="Calle y número"
                />
              </CampoFormulario>
              <CampoFormulario etiqueta="Referencia de llegada" ancho="completo">
                <input
                  className="entrada"
                  value={borrador.referencia}
                  onChange={(evento) =>
                    actualizar({ referencia: filtrarTextoLibre(evento.target.value, 80) })
                  }
                  placeholder="Departamento, portería o punto de referencia"
                />
              </CampoFormulario>
            </>
          )}
        </div>
        <Aviso tono="info" icono={Warehouse}>
          <strong>Política de almacenamiento:</strong> las prendas se guardan gratis{" "}
          {politicaAlmacen.diasGratis} días después de la fecha estimada; luego se cobra{" "}
          {formatearMoneda(politicaAlmacen.cargoDiario)} por día y a los{" "}
          {politicaAlmacen.diasLimite} días se donan. Infórmalo al cliente.
        </Aviso>

        <div className="bloque_pago">
          <div className="rejilla_campos">
            <CampoFormulario etiqueta="Descuento o promoción">
              <Selector
                etiqueta="Descuento o promoción"
                valor={borrador.descuentoId}
                alCambiar={(valor) => actualizarImporte({ descuentoId: valor })}
                opciones={descuentos.map((item) => ({
                  valor: item.id,
                  etiqueta: item.porcentaje ? `${item.nombre} · ${item.porcentaje} %` : item.nombre,
                }))}
              />
            </CampoFormulario>
            <CampoFormulario etiqueta="Comprobante" agrupaControles>
              <ControlSegmentado
                etiqueta="Comprobante"
                valor={borrador.comprobante}
                alCambiar={(valor) => actualizar({ comprobante: valor as TipoComprobante })}
                opciones={tiposComprobante.map((item) => ({
                  valor: item.id,
                  etiqueta: item.nombre,
                }))}
              />
            </CampoFormulario>
          </div>
          <dl className="desglose_total">
            {[
              { etiqueta: "Subtotal", valor: formatearMoneda(subtotal), visible: true },
              {
                etiqueta: "Descuento",
                valor: `− ${formatearMoneda(montoDescuento)}`,
                visible: montoDescuento > 0,
              },
              {
                etiqueta: "Delivery",
                valor: formatearMoneda(costoDelivery),
                visible: borrador.tipoEntrega === "domicilio",
              },
              {
                etiqueta: "Total de la orden",
                valor: formatearMoneda(total),
                visible: true,
                destacado: true,
              },
            ]
              .filter((fila) => fila.visible)
              .map((fila) => (
                <div
                  key={fila.etiqueta}
                  className={fila.destacado ? "desglose_total_destacado" : ""}
                >
                  <dt>{fila.etiqueta}</dt>
                  <dd>{fila.valor}</dd>
                </div>
              ))}
          </dl>
          <fieldset className="grupo_campos">
            <legend>¿Cuánto paga ahora?</legend>
            <ControlSegmentado
              etiqueta="Pago ahora"
              valor={borrador.modoAdelanto}
              alCambiar={(valor) =>
                actualizarImporte({ modoAdelanto: valor as ModoAdelanto, adelanto: "" })
              }
              opciones={[
                { valor: "ninguno", etiqueta: "Paga al recoger" },
                { valor: "parcial", etiqueta: "Adelanto" },
                { valor: "total", etiqueta: "Pago total" },
              ]}
            />
          </fieldset>
          {borrador.modoAdelanto === "parcial" && (
            <div className="rejilla_campos">
              <CampoFormulario
                etiqueta="Monto del adelanto (S/)"
                ayuda={`Menor a ${formatearMoneda(total)}`}
              >
                <input
                  className="entrada"
                  inputMode="decimal"
                  value={borrador.adelanto}
                  onChange={(evento) =>
                    actualizarImporte({ adelanto: filtrarMonto(evento.target.value, total) })
                  }
                  placeholder="0.00"
                />
              </CampoFormulario>
              <CampoFormulario etiqueta="Atajo" agrupaControles>
                <button
                  type="button"
                  className="ficha_accion"
                  onClick={() => actualizarImporte({ adelanto: (total / 2).toFixed(2) })}
                >
                  50 % · {formatearMoneda(total / 2)}
                </button>
              </CampoFormulario>
            </div>
          )}
          {adelanto > 0 && (
            <SimuladorPago
              key={`${borrador.modoAdelanto}-${adelanto}`}
              importe={adelanto}
              referencia={`${generarCodigoPedido(pedidos)}-${nombreCliente(borrador)}`}
              pago={borrador.pago}
              alRegistrar={(pago) => actualizar({ pago })}
              titulo="Medio de pago del adelanto"
            />
          )}
          <div className="bloque_pago_totales">
            <div>
              <span>Paga ahora</span>
              <strong>{formatearMoneda(adelanto)}</strong>
            </div>
            <div>
              <span>Saldo al entregar</span>
              <strong className={saldo > 0 ? "texto_alerta" : "texto_exito"}>
                {formatearMoneda(saldo)}
              </strong>
            </div>
          </div>
        </div>

        <CampoFormulario etiqueta="Indicaciones para el equipo" ancho="completo">
          <textarea
            className="entrada area_texto"
            rows={2}
            value={borrador.notas}
            onChange={(evento) =>
              actualizar({ notas: filtrarTextoLibre(evento.target.value, 200) })
            }
            placeholder="Ej. Entregar en funda, llamar antes de llegar"
          />
        </CampoFormulario>
      </div>
    ),
  };

  const pasoConfirmacion: PasoAsistente = {
    ...(pasosRecepcion[3] as MetaPaso),
    contenido: (
      <div className="comprobante">
        <section className="comprobante_bloque">
          <h4>
            <UserRound aria-hidden="true" />
            Cliente
          </h4>
          <ListaDatos
            columnas={3}
            datos={[
              {
                etiqueta: borrador.tipoCliente === "empresa" ? "Razón social" : "Nombre",
                valor: nombreCliente(borrador) || "—",
              },
              {
                etiqueta: "Documento",
                valor: borrador.documento
                  ? `${borrador.tipoCliente === "empresa" ? "RUC" : "DNI"} ${borrador.documento}`
                  : "No registrado",
              },
              { etiqueta: "Celular", valor: borrador.telefono || "—" },
            ]}
          />
        </section>
        <section className="comprobante_bloque">
          <h4>
            <ClipboardList aria-hidden="true" />
            Prendas ({borrador.prendas.length})
          </h4>
          <table className="tabla_simple">
            <thead>
              <tr>
                <th scope="col">Artículo</th>
                <th scope="col">Servicio</th>
                <th scope="col" className="celda_numero">
                  Importe
                </th>
              </tr>
            </thead>
            <tbody>
              {borrador.prendas.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>
                      {item.cantidad}{" "}
                      {buscarServicio(item.servicioId)?.unidad === "kg" ? "kg" : "×"} {item.nombre}
                    </strong>
                    {textoObservacion(item) && <small>{textoObservacion(item)}</small>}
                    {item.evidencias.length > 0 && (
                      <small>{item.evidencias.length} foto(s) de evidencia</small>
                    )}
                  </td>
                  <td>{buscarServicio(item.servicioId)?.nombre}</td>
                  <td className="celda_numero">{formatearMoneda(importeLinea(item))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="comprobante_bloque">
          <h4>
            <CalendarClock aria-hidden="true" />
            Entrega
          </h4>
          <ListaDatos
            columnas={3}
            datos={[
              {
                etiqueta: "Modalidad",
                valor:
                  borrador.tipoEntrega === "tienda" ? "Recojo en tienda" : "Delivery a domicilio",
              },
              {
                etiqueta: "Entrega estimada",
                valor: borrador.fechaDesde
                  ? `${formatearFecha(borrador.fechaDesde)} – ${formatearFecha(borrador.fechaHasta || borrador.fechaDesde)}`
                  : "Por confirmar",
              },
              ...(borrador.tipoEntrega === "domicilio"
                ? [
                    {
                      etiqueta: "Dirección",
                      valor: `${borrador.direccion}, ${borrador.distrito}`,
                      detalle: borrador.referencia || undefined,
                    },
                  ]
                : [
                    {
                      etiqueta: "Comprobante",
                      valor:
                        tiposComprobante.find((item) => item.id === borrador.comprobante)?.nombre ??
                        "—",
                    },
                  ]),
            ]}
          />
        </section>
        <section className="comprobante_totales">
          <div>
            <span>
              Total{montoDescuento > 0 ? ` (desc. ${formatearMoneda(montoDescuento)})` : ""}
            </span>
            <strong>{formatearMoneda(total)}</strong>
          </div>
          <div>
            <span>
              Pagado {borrador.pago ? `· ${borrador.pago.medio} · ${borrador.pago.operacion}` : ""}
            </span>
            <strong>{formatearMoneda(adelanto)}</strong>
          </div>
          <div className="comprobante_totales_destacado">
            <span>Saldo por cobrar</span>
            <strong>{formatearMoneda(saldo)}</strong>
          </div>
        </section>
      </div>
    ),
  };

  const pasos = [pasoCliente, pasoPrendas, pasoEntrega, pasoConfirmacion];

  const recientes = [...pedidos].sort(
    (a, b) => b.fechaRecepcion.localeCompare(a.fechaRecepcion) || b.codigo.localeCompare(a.codigo),
  );
  const gruposRecientes = agruparPor(recientes, (pedido) => pedido.fechaRecepcion);
  const activos = pedidos.filter((pedido) => pedido.estado !== "Entregado");

  const metricas: DatoMetrica[] = [
    {
      id: "recibidos",
      icono: Inbox,
      valor: relleno(pedidos.filter((pedido) => pedido.fechaRecepcion === hoy).length),
      etiqueta: "Recibidos hoy",
      detalle: `${activos.length} órdenes activas en total`,
    },
    {
      id: "por_cobrar",
      icono: Banknote,
      valor: formatearMoneda(activos.reduce((suma, pedido) => suma + pedido.saldo, 0)),
      etiqueta: "Saldo por cobrar",
      detalle: "En órdenes no entregadas",
      tono: "alerta",
    },
    {
      id: "compromisos",
      icono: Timer,
      valor: relleno(
        activos.filter((pedido) => pedido.fechaCompromiso <= sumarDias(hoy, 1)).length,
      ),
      etiqueta: "Vencen hoy o mañana",
      detalle: "Incluye órdenes vencidas",
      tono: "ruta",
    },
  ];

  return (
    <div className="contenido_pantalla">
      <section className="banda_destacada">
        <div className="banda_destacada_texto">
          <p className="texto_etiqueta">Mostrador · Nuevo pedido</p>
          <h2>Registra una recepción en 4 pasos</h2>
          <p>Cliente, prendas con evidencia, entrega y cobro con QR, y confirmación.</p>
        </div>
        <ol className="banda_pasos" aria-label="Pasos de la recepción">
          {pasosRecepcion.map((paso, indice) => {
            const Icono = paso.icono;
            return (
              <li key={paso.id}>
                <span className="banda_pasos_icono" aria-hidden="true">
                  <Icono />
                </span>
                <span>
                  <small>{relleno(indice + 1)}</small>
                  {paso.titulo}
                </span>
              </li>
            );
          })}
        </ol>
        <button type="button" className="boton boton_acento boton_grande" onClick={abrirRecorrido}>
          <Plus />
          Iniciar recepción
          <ArrowRight />
        </button>
      </section>

      <FilaMetricas metricas={metricas} />

      <section className="panel">
        <EncabezadoSeccion
          etiqueta="Actividad"
          titulo="Recepciones recientes"
          descripcion="Ordenadas por fecha de ingreso, de la más reciente a la más antigua."
        >
          <span className="contador_pildora">{pedidos.length} órdenes</span>
        </EncabezadoSeccion>
        <div className="tabla_lista" role="table" aria-label="Recepciones recientes">
          <div className="tabla_lista_cabecera fila_recepcion" role="row">
            <span role="columnheader">Orden</span>
            <span role="columnheader">Prendas</span>
            <span role="columnheader">Entrega</span>
            <span role="columnheader">Estado</span>
            <span role="columnheader" className="celda_numero">
              Importe
            </span>
          </div>
          {gruposRecientes.map((grupo) => (
            <div key={grupo.clave} role="rowgroup" className="grupo_lista">
              <div className="grupo_lista_titulo" role="row">
                <span role="cell">
                  <strong>{etiquetaDia(grupo.clave, hoy)}</strong>
                  <small>
                    {grupo.elementos.length} {grupo.elementos.length === 1 ? "orden" : "órdenes"}
                  </small>
                </span>
              </div>
              {grupo.elementos.map((pedido) => (
                <div key={pedido.codigo} className="tabla_lista_fila fila_recepcion" role="row">
                  <span role="cell" className="celda_principal">
                    <span className="codigo_pedido">{pedido.codigo}</span>
                    <strong>{pedido.cliente}</strong>
                  </span>
                  <span role="cell" className="celda_prendas">
                    <MiniaturaPrenda nombre={pedido.prendas[0]?.nombre ?? ""} />
                    <span>
                      <strong>{resumirPrendas(pedido.prendas)}</strong>
                      <small>{pedido.servicio}</small>
                    </span>
                  </span>
                  <span role="cell" className="celda_entrega">
                    <span className="modalidad">
                      {pedido.tipoEntrega === "tienda" ? (
                        <Store aria-hidden="true" />
                      ) : (
                        <House aria-hidden="true" />
                      )}
                      {pedido.tipoEntrega === "tienda" ? "Tienda" : "Domicilio"}
                    </span>
                    {pedido.estado !== "Entregado" && (
                      <IndicadorUrgencia fecha={pedido.fechaCompromiso} hoy={hoy} />
                    )}
                  </span>
                  <span role="cell">
                    <EtiquetaEstado estado={pedido.estado} />
                  </span>
                  <span role="cell" className="celda_numero celda_importe">
                    <strong>{formatearMoneda(pedido.total)}</strong>
                    <small className={pedido.saldo > 0 ? "texto_alerta" : ""}>
                      {pedido.saldo > 0 ? `Saldo ${formatearMoneda(pedido.saldo)}` : "Pagado"}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <AsistentePasos
        key={sesion}
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        titulo="Nueva recepción"
        etiquetaSuperior="Mostrador · Recorrido de recepción"
        icono={Plus}
        pasos={pasos}
        accionFinal={{
          etiqueta: "Registrar recepción",
          icono: Check,
          alConfirmar: registrar,
          tono: "exito",
        }}
        resumenLateral={
          <div className="resumen_lateral">
            <p className="texto_etiqueta">Resumen en vivo</p>
            <strong className="resumen_lateral_codigo">
              {nombreCliente(borrador) || "Cliente sin nombre"}
            </strong>
            <span>
              {borrador.prendas.length} {borrador.prendas.length === 1 ? "prenda" : "prendas"} en la
              orden
            </span>
            <div className="resumen_lateral_importe">
              <span>Total</span>
              <strong>{formatearMoneda(total)}</strong>
            </div>
          </div>
        }
        completado={
          registrado ? (
            <VistaCompletado
              titulo={`Orden ${registrado.codigo} registrada`}
              descripcion={`${registrado.cliente} · ${resumirPrendas(registrado.prendas)}`}
              datos={[
                { etiqueta: "Total", valor: formatearMoneda(registrado.total) },
                {
                  etiqueta: "Saldo",
                  valor: formatearMoneda(registrado.saldo),
                  detalle: registrado.pagos?.[0]
                    ? `Operación ${registrado.pagos[0].operacion}`
                    : registrado.estadoPago,
                },
                {
                  etiqueta: "Entrega estimada",
                  valor: formatearFecha(registrado.fechaCompromiso),
                  detalle: registrado.tipoEntrega === "tienda" ? "Recojo en tienda" : "Delivery",
                },
              ]}
              acciones={
                <>
                  <div className="etiqueta_orden" aria-label="Etiqueta para las prendas">
                    <CodigoQr texto={registrado.codigo} tono="orden" />
                    <span>
                      <Tag aria-hidden="true" />
                      <strong>{registrado.codigo}</strong>
                      <small>Pega esta etiqueta en cada prenda</small>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="boton boton_secundario"
                    onClick={() => window.print()}
                  >
                    <Printer />
                    Imprimir ticket
                  </button>
                  <button type="button" className="boton boton_primario" onClick={abrirRecorrido}>
                    <Plus />
                    Registrar otra recepción
                  </button>
                </>
              }
            />
          ) : undefined
        }
      />
    </div>
  );
}
