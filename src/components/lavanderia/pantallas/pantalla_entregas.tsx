import { useState } from "react";
import {
  BadgeCheck,
  Bike,
  CircleCheck,
  CircleDollarSign,
  CircleX,
  ClipboardList,
  HandCoins,
  IdCard,
  MapPin,
  Navigation,
  PackageCheck,
  PackageOpen,
  ReceiptText,
  Send,
  Store,
  Truck,
  UserCheck,
  Users,
  Warehouse,
} from "lucide-react";

import { AsistentePasos, type PasoAsistente } from "../asistente_pasos";
import {
  CabeceraPedido,
  ListaPrendasPedido,
  ResumenLateralPedido,
  VistaCompletado,
} from "../componentes_pedido";
import {
  Aviso,
  Buscador,
  CampoFormulario,
  ControlSegmentado,
  EncabezadoSeccion,
  EstadoVacio,
  EtiquetaPago,
  FilaMetricas,
  IndicadorUrgencia,
  ListaDatos,
  MiniaturaPrenda,
  Selector,
  type DatoMetrica,
} from "../elementos";
import { SimuladorPago } from "../simulador_pago";
import { filtrarSoloDigitos, filtrarSoloLetras, filtrarTextoLibre } from "@/lib/filtros_entrada";
import { formatearFecha, formatearMoneda, relleno } from "@/lib/formato";
import {
  diasEnTienda,
  distritos,
  esDocumentoValido,
  filtrarPorTexto,
  ordenarPorUrgencia,
  politicaAlmacen,
  repartidores,
  resumirPrendas,
  type PagoRegistrado,
  type Pedido,
} from "@/lib/pedidos";
import { type SesionUsuario } from "@/lib/usuarios";

type Pestana = "por_entregar" | "en_ruta";
type Modalidad = "todas" | "tienda" | "domicilio";
type QuienRecibe = "titular" | "tercero";

type DatosEntrega = {
  quienRecibe: QuienRecibe;
  verificacion: string;
  nombreTercero: string;
  parentesco: string;
  documentoTercero: string;
  conforme: boolean;
  nota: string;
};

const parentescos = [
  "Familiar",
  "Portería",
  "Trabajador del hogar",
  "Compañero de trabajo",
  "Otro",
];
const TODOS_LOS_DISTRITOS = "todos";

const entregaInicial: DatosEntrega = {
  quienRecibe: "titular",
  verificacion: "",
  nombreTercero: "",
  parentesco: parentescos[0] ?? "Familiar",
  documentoTercero: "",
  conforme: false,
  nota: "",
};

function repartidorPorDefecto(pedido: Pedido) {
  return (
    repartidores.find((item) => item.nombre === pedido.repartidor)?.nombre ??
    repartidores[0]?.nombre ??
    ""
  );
}

/** Cargo por almacenaje cuando el cliente recoge después del plazo gratuito. */
function cargoAlmacen(pedido: Pedido, hoy: string) {
  if (pedido.tipoEntrega !== "tienda") return 0;
  const exceso = diasEnTienda(pedido, hoy) - politicaAlmacen.diasGratis;
  return exceso > 0 ? exceso * politicaAlmacen.cargoDiario : 0;
}

/** Conserva el adelanto de pedidos registrados antes de que existiera el detalle de pagos. */
function pagosPrevios(pedido: Pedido): PagoRegistrado[] {
  if (pedido.pagos?.length) return pedido.pagos;
  const adelanto = Number((pedido.total - pedido.saldo).toFixed(2));
  if (!pedido.medioPago || adelanto <= 0) return [];
  return [{ medio: pedido.medioPago, importe: adelanto, operacion: "Adelanto en recepción" }];
}

function verificacionCoincide(pedido: Pedido, valor: string) {
  const limpio = valor.trim().toUpperCase();
  if (!limpio) return false;
  const numeroOrden = pedido.codigo.split("-").at(-1) ?? "";
  return (
    limpio === pedido.codigo ||
    limpio === numeroOrden ||
    (pedido.documento !== "—" && limpio === pedido.documento)
  );
}

export function PantallaEntregas({
  pedidos,
  hoy,
  sesion,
  alActualizar,
}: {
  pedidos: Pedido[];
  hoy: string;
  sesion: SesionUsuario;
  alActualizar: (codigo: string, cambios: Partial<Pedido>) => void;
}) {
  const esRepartidor = sesion.rol === "repartidor";
  const [pestana, setPestana] = useState<Pestana>(esRepartidor ? "en_ruta" : "por_entregar");
  const [modalidad, setModalidad] = useState<Modalidad>(esRepartidor ? "domicilio" : "todas");
  const [consulta, setConsulta] = useState("");
  const [distrito, setDistrito] = useState(TODOS_LOS_DISTRITOS);
  const [asignaciones, setAsignaciones] = useState<Record<string, string>>({});
  const [codigoEntrega, setCodigoEntrega] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [sesionAsistente, setSesionAsistente] = useState(0);
  const [entrega, setEntrega] = useState<DatosEntrega>(entregaInicial);
  const [pago, setPago] = useState<PagoRegistrado | null>(null);
  const [finalizado, setFinalizado] = useState<Pedido | null>(null);

  const actualizarEntrega = (cambios: Partial<DatosEntrega>) =>
    setEntrega((actual) => ({ ...actual, ...cambios }));

  const coincideBusqueda = (lista: Pedido[]) =>
    filtrarPorTexto(
      lista.filter(
        (pedido) => distrito === TODOS_LOS_DISTRITOS || pedido.direccion.includes(distrito),
      ),
      consulta,
      (pedido) => [
        pedido.codigo,
        pedido.cliente,
        pedido.telefono,
        pedido.direccion,
        pedido.referencia,
        pedido.repartidor,
      ],
    );

  const listos = pedidos.filter((pedido) => pedido.estado === "Listo para entregar");
  const enTienda = ordenarPorUrgencia(
    coincideBusqueda(listos.filter((pedido) => pedido.tipoEntrega === "tienda")),
    hoy,
  );
  const porSalir = ordenarPorUrgencia(
    coincideBusqueda(listos.filter((pedido) => pedido.tipoEntrega === "domicilio")),
    hoy,
  );
  const enRuta = ordenarPorUrgencia(
    coincideBusqueda(pedidos.filter((pedido) => pedido.estado === "En ruta")),
    hoy,
  ).filter((pedido) => !esRepartidor || pedido.repartidor === sesion.nombre);
  const entregados = pedidos.filter((pedido) => pedido.estado === "Entregado");

  const pedidoEntrega = pedidos.find((pedido) => pedido.codigo === codigoEntrega) ?? null;
  const esDomicilio = pedidoEntrega?.tipoEntrega === "domicilio";
  const cargo = pedidoEntrega ? cargoAlmacen(pedidoEntrega, hoy) : 0;
  const importeCobrar = pedidoEntrega ? Number((pedidoEntrega.saldo + cargo).toFixed(2)) : 0;
  const titularVerificado = pedidoEntrega
    ? verificacionCoincide(pedidoEntrega, entrega.verificacion)
    : false;

  const abrirEntrega = (pedido: Pedido) => {
    setCodigoEntrega(pedido.codigo);
    setEntrega(entregaInicial);
    setPago(null);
    setFinalizado(null);
    setSesionAsistente((actual) => actual + 1);
    setAbierto(true);
  };

  const salirARuta = (pedido: Pedido) =>
    alActualizar(pedido.codigo, {
      estado: "En ruta",
      repartidor: asignaciones[pedido.codigo] ?? repartidorPorDefecto(pedido),
    });

  const confirmarEntrega = () => {
    if (!pedidoEntrega) return;
    const recibe =
      entrega.quienRecibe === "titular" ? pedidoEntrega.cliente : entrega.nombreTercero.trim();
    const cambios: Partial<Pedido> = {
      estado: "Entregado",
      fechaEntrega: hoy,
      recibidoPor: recibe,
      parentescoRecibe: entrega.quienRecibe === "titular" ? "Titular" : entrega.parentesco,
      notas: entrega.nota.trim()
        ? [pedidoEntrega.notas, `Entrega: ${entrega.nota.trim()}`].filter(Boolean).join(" · ")
        : pedidoEntrega.notas,
      ...(pago
        ? {
            estadoPago: "Pagado" as const,
            medioPagoSaldo: pago.medio,
            saldo: 0,
            total: Number((pedidoEntrega.total + cargo).toFixed(2)),
            pagos: [...pagosPrevios(pedidoEntrega), pago],
          }
        : {}),
    };
    alActualizar(pedidoEntrega.codigo, cambios);
    setFinalizado({ ...pedidoEntrega, ...cambios });
  };

  const pestanas = [
    {
      valor: "por_entregar",
      etiqueta: "Por entregar",
      icono: PackageCheck,
      cantidad: enTienda.length + porSalir.length,
    },
    { valor: "en_ruta", etiqueta: "En ruta", icono: Navigation, cantidad: enRuta.length },
  ];

  const metricas: DatoMetrica[] = [
    {
      id: "tienda",
      icono: Store,
      valor: relleno(listos.filter((pedido) => pedido.tipoEntrega === "tienda").length),
      etiqueta: "Esperan en tienda",
      detalle: "Para recoger en mostrador",
      tono: "exito",
    },
    {
      id: "delivery",
      icono: Truck,
      valor: relleno(
        listos.filter((pedido) => pedido.tipoEntrega === "domicilio").length + enRuta.length,
      ),
      etiqueta: "Delivery activo",
      detalle: `${enRuta.length} en ruta ahora`,
      tono: "ruta",
    },
    {
      id: "cobrar",
      icono: CircleDollarSign,
      valor: formatearMoneda(
        [...listos, ...enRuta].reduce((suma, pedido) => suma + pedido.saldo, 0),
      ),
      etiqueta: "Saldo por cobrar",
      detalle: "Al entregar",
      tono: "alerta",
    },
    {
      id: "hoy",
      icono: CircleCheck,
      valor: relleno(entregados.filter((pedido) => pedido.fechaEntrega === hoy).length),
      etiqueta: "Entregados hoy",
      detalle: `${entregados.length} en el historial`,
    },
  ];

  const pasos: PasoAsistente[] = pedidoEntrega
    ? [
        {
          id: "identificar",
          titulo: esDomicilio ? "Llegada" : "Identificar",
          descripcion: "Quién recibe el pedido",
          icono: IdCard,
          validar: () => {
            if (entrega.quienRecibe === "titular") {
              return titularVerificado || esDomicilio
                ? null
                : "Verifica el código de la orden o el documento del titular.";
            }
            if (entrega.nombreTercero.trim().length < 3) return "Indica el nombre de quien recibe.";
            if (!esDocumentoValido("DNI", entrega.documentoTercero))
              return "El DNI de quien recibe debe tener 8 dígitos.";
            return null;
          },
          contenido: (
            <div className="pila_contenido">
              <CabeceraPedido pedido={pedidoEntrega}>
                <IndicadorUrgencia fecha={pedidoEntrega.fechaCompromiso} hoy={hoy} />
              </CabeceraPedido>
              {esDomicilio && (
                <ListaDatos
                  datos={[
                    {
                      etiqueta: "Dirección",
                      valor: pedidoEntrega.direccion,
                      detalle: pedidoEntrega.referencia || undefined,
                    },
                    { etiqueta: "Repartidor", valor: pedidoEntrega.repartidor },
                  ]}
                />
              )}
              <fieldset className="grupo_campos">
                <legend>¿Quién recibe?</legend>
                <ControlSegmentado
                  etiqueta="Quién recibe"
                  valor={entrega.quienRecibe}
                  alCambiar={(valor) => actualizarEntrega({ quienRecibe: valor as QuienRecibe })}
                  opciones={[
                    { valor: "titular", etiqueta: "El titular", icono: UserCheck },
                    { valor: "tercero", etiqueta: "Otra persona", icono: Users },
                  ]}
                />
              </fieldset>
              {entrega.quienRecibe === "titular" ? (
                <>
                  <CampoFormulario
                    etiqueta={
                      esDomicilio
                        ? "Código de la orden o documento (opcional en domicilio)"
                        : "Código de la orden o documento del titular"
                    }
                    ayuda={`Ej. ${pedidoEntrega.codigo} o solo ${pedidoEntrega.codigo.split("-").at(-1)}`}
                    ancho="completo"
                  >
                    <input
                      data-autofoco
                      className="entrada"
                      value={entrega.verificacion}
                      onChange={(evento) =>
                        actualizarEntrega({
                          verificacion: evento.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9-]/g, "")
                            .slice(0, 11),
                        })
                      }
                      placeholder="Escribe para verificar"
                    />
                  </CampoFormulario>
                  {entrega.verificacion && (
                    <Aviso
                      tono={titularVerificado ? "exito" : "error"}
                      icono={titularVerificado ? BadgeCheck : CircleX}
                    >
                      {titularVerificado
                        ? "Coincide con la orden."
                        : "No coincide con el código ni con el documento registrado."}
                    </Aviso>
                  )}
                </>
              ) : (
                <div className="rejilla_campos">
                  <CampoFormulario etiqueta="Nombre de quien recibe" obligatorio>
                    <input
                      className="entrada"
                      value={entrega.nombreTercero}
                      onChange={(evento) =>
                        actualizarEntrega({ nombreTercero: filtrarSoloLetras(evento.target.value) })
                      }
                      placeholder="Nombres y apellidos"
                    />
                  </CampoFormulario>
                  <CampoFormulario etiqueta="Relación con el titular">
                    <Selector
                      etiqueta="Relación con el titular"
                      valor={entrega.parentesco}
                      alCambiar={(valor) => actualizarEntrega({ parentesco: valor })}
                      opciones={parentescos.map((item) => ({ valor: item, etiqueta: item }))}
                    />
                  </CampoFormulario>
                  <CampoFormulario etiqueta="DNI de quien recibe" obligatorio ayuda="8 dígitos">
                    <input
                      className="entrada"
                      inputMode="numeric"
                      value={entrega.documentoTercero}
                      onChange={(evento) =>
                        actualizarEntrega({
                          documentoTercero: filtrarSoloDigitos(evento.target.value, 8),
                        })
                      }
                      placeholder="12345678"
                    />
                  </CampoFormulario>
                </div>
              )}
            </div>
          ),
        },
        {
          id: "cobro",
          titulo: "Cobro",
          descripcion: "Saldo pendiente con QR, tarjeta o efectivo",
          icono: HandCoins,
          validar: () =>
            importeCobrar > 0 && !pago ? "Registra el cobro antes de continuar." : null,
          contenido:
            importeCobrar > 0 ? (
              <div className="pila_contenido">
                <dl className="desglose_total">
                  {[
                    {
                      etiqueta: "Total del pedido",
                      valor: formatearMoneda(pedidoEntrega.total),
                      visible: true,
                    },
                    {
                      etiqueta: "Pagado al recibir",
                      valor: formatearMoneda(pedidoEntrega.total - pedidoEntrega.saldo),
                      visible: true,
                    },
                    {
                      etiqueta: `Almacenaje (${diasEnTienda(pedidoEntrega, hoy) - politicaAlmacen.diasGratis} días extra)`,
                      valor: formatearMoneda(cargo),
                      visible: cargo > 0,
                    },
                    {
                      etiqueta: "Por cobrar ahora",
                      valor: formatearMoneda(importeCobrar),
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
                <SimuladorPago
                  importe={importeCobrar}
                  referencia={pedidoEntrega.codigo}
                  pago={pago}
                  alRegistrar={setPago}
                  titulo="Medio de pago del saldo"
                />
              </div>
            ) : (
              <Aviso tono="exito" icono={BadgeCheck}>
                <strong>Pedido pagado por completo.</strong> No hay saldo que cobrar en la entrega.
              </Aviso>
            ),
        },
        {
          id: "confirmar",
          titulo: "Confirmación",
          descripcion: "Revisión conjunta y cierre",
          icono: ClipboardList,
          validar: () =>
            entrega.conforme ? null : "Confirma que las prendas se entregaron conforme.",
          contenido: (
            <div className="pila_contenido">
              <section className="bloque_lista">
                <header className="bloque_lista_encabezado">
                  <h4>Prendas a entregar</h4>
                  <span className="contador_pildora">{pedidoEntrega.prendas.length}</span>
                </header>
                <ListaPrendasPedido prendas={pedidoEntrega.prendas} />
              </section>
              {pedidoEntrega.incidencias && (
                <Aviso tono="alerta" icono={ReceiptText}>
                  <strong>Comenta al cliente las incidencias del control:</strong>
                  <ul className="lista_vinetas">
                    {pedidoEntrega.incidencias.map((incidencia) => (
                      <li key={incidencia}>{incidencia}</li>
                    ))}
                  </ul>
                </Aviso>
              )}
              <ListaDatos
                columnas={3}
                datos={[
                  {
                    etiqueta: "Recibe",
                    valor:
                      entrega.quienRecibe === "titular"
                        ? pedidoEntrega.cliente
                        : entrega.nombreTercero || "—",
                    detalle:
                      entrega.quienRecibe === "titular"
                        ? "Titular"
                        : `${entrega.parentesco} · DNI ${entrega.documentoTercero}`,
                  },
                  {
                    etiqueta: "Cobro",
                    valor: pago ? formatearMoneda(pago.importe) : "Sin saldo",
                    detalle: pago ? `${pago.medio} · ${pago.operacion}` : undefined,
                  },
                  { etiqueta: "Modalidad", valor: esDomicilio ? "Delivery" : "Recojo en tienda" },
                ]}
              />
              <CampoFormulario etiqueta="Nota de la entrega" ayuda="Opcional" ancho="completo">
                <input
                  className="entrada"
                  value={entrega.nota}
                  onChange={(evento) =>
                    actualizarEntrega({ nota: filtrarTextoLibre(evento.target.value, 100) })
                  }
                  placeholder="Ej. Se dejó en portería"
                />
              </CampoFormulario>
              <label className="casilla_confirmacion">
                <input
                  type="checkbox"
                  checked={entrega.conforme}
                  onChange={(evento) => actualizarEntrega({ conforme: evento.target.checked })}
                />
                <span>
                  <strong>Se revisaron y entregaron las prendas conforme</strong>
                  <small>
                    El pedido pasa a Entregado y queda en el historial con fecha de hoy.
                  </small>
                </span>
              </label>
            </div>
          ),
        },
      ]
    : [];

  return (
    <div className="contenido_pantalla">
      <FilaMetricas metricas={metricas} />

      <nav className="pestanas_panel" aria-label="Secciones de entregas">
        <ControlSegmentado
          etiqueta="Secciones de entregas"
          valor={pestana}
          alCambiar={(valor) => setPestana(valor as Pestana)}
          opciones={pestanas}
        />
      </nav>

      <div className="barra_filtros barra_filtros_panel">
        <Buscador
          valor={consulta}
          alCambiar={setConsulta}
          marcador="Cliente, pedido o dirección"
          etiqueta="Buscar pedidos por entregar"
        />
        <Selector
          etiqueta="Filtrar por distrito"
          valor={distrito}
          alCambiar={setDistrito}
          opciones={[
            { valor: TODOS_LOS_DISTRITOS, etiqueta: "Todos los distritos" },
            ...distritos.map((item) => ({ valor: item, etiqueta: item })),
          ]}
        />
        {pestana === "por_entregar" && !esRepartidor && (
          <ControlSegmentado
            etiqueta="Modalidad"
            variante="fichas"
            valor={modalidad}
            alCambiar={(valor) => setModalidad(valor as Modalidad)}
            opciones={[
              { valor: "todas", etiqueta: "Todas" },
              { valor: "tienda", etiqueta: "Tienda", icono: Store, cantidad: enTienda.length },
              {
                valor: "domicilio",
                etiqueta: "Delivery",
                icono: Truck,
                cantidad: porSalir.length,
              },
            ]}
          />
        )}
      </div>

      {pestana === "por_entregar" && (
        <>
          {modalidad !== "domicilio" && (
            <section className="panel">
              <EncabezadoSeccion
                etiqueta="Mostrador"
                titulo="Para recoger en tienda"
                descripcion="Identifica a quien recoge, cobra el saldo y entrega. Los más antiguos primero."
              >
                <span className="contador_pildora">
                  {enTienda.length} {enTienda.length === 1 ? "orden" : "órdenes"}
                </span>
              </EncabezadoSeccion>
              {enTienda.length === 0 ? (
                <EstadoVacio
                  titulo="No hay órdenes esperando en tienda"
                  descripcion="Las órdenes aprobadas en control aparecerán aquí."
                  icono={PackageOpen}
                />
              ) : (
                <ul className="rejilla_tarjetas">
                  {enTienda.map((pedido) => {
                    const dias = diasEnTienda(pedido, hoy);
                    const cargoPedido = cargoAlmacen(pedido, hoy);
                    return (
                      <li key={pedido.codigo} className="tarjeta_despacho">
                        <header className="tarjeta_despacho_cabecera">
                          <span className="codigo_pedido">{pedido.codigo}</span>
                          <IndicadorUrgencia fecha={pedido.fechaCompromiso} hoy={hoy} />
                        </header>
                        <div className="tarjeta_despacho_cuerpo">
                          <MiniaturaPrenda nombre={pedido.prendas[0]?.nombre ?? ""} grande />
                          <div>
                            <strong>{pedido.cliente}</strong>
                            <span>{resumirPrendas(pedido.prendas)}</span>
                          </div>
                        </div>
                        {dias > 0 && (
                          <p
                            className={`nota_almacen ${cargoPedido > 0 ? "nota_almacen_cargo" : ""}`}
                          >
                            <Warehouse aria-hidden="true" />
                            {dias} {dias === 1 ? "día" : "días"} en tienda
                            {cargoPedido > 0
                              ? ` · cargo ${formatearMoneda(cargoPedido)}`
                              : ` · gratis hasta ${politicaAlmacen.diasGratis}`}
                          </p>
                        )}
                        <footer className="tarjeta_despacho_pie">
                          <div className="tarjeta_despacho_importe">
                            <small>{pedido.saldo > 0 ? "Saldo por cobrar" : "Total pagado"}</small>
                            <strong className={pedido.saldo > 0 ? "texto_alerta" : "texto_exito"}>
                              {formatearMoneda(pedido.saldo > 0 ? pedido.saldo : pedido.total)}
                            </strong>
                          </div>
                          <button
                            type="button"
                            className="boton boton_primario"
                            onClick={() => abrirEntrega(pedido)}
                          >
                            <UserCheck />
                            Entregar
                          </button>
                        </footer>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {modalidad !== "tienda" && (
            <section className="panel">
              <EncabezadoSeccion
                etiqueta="Delivery"
                titulo="Por salir a reparto"
                descripcion="Asigna un repartidor y marca la salida. La dirección viene de la recepción."
              >
                <span className="contador_pildora">
                  {porSalir.length} {porSalir.length === 1 ? "orden" : "órdenes"}
                </span>
              </EncabezadoSeccion>
              {porSalir.length === 0 ? (
                <EstadoVacio titulo="No hay pedidos esperando salida" icono={Bike} />
              ) : (
                <ul className="lista_pedidos">
                  {porSalir.map((pedido) => (
                    <li key={pedido.codigo} className="fila_pedido fila_por_salir">
                      <div className="fila_pedido_principal">
                        <div className="fila_pedido_titulo">
                          <span className="codigo_pedido">{pedido.codigo}</span>
                          <strong>{pedido.cliente}</strong>
                        </div>
                        <p className="parada_direccion">
                          <MapPin aria-hidden="true" />
                          <span>
                            {pedido.direccion}
                            {pedido.referencia && <small>{pedido.referencia}</small>}
                          </span>
                        </p>
                        <div className="fila_pedido_meta">
                          <span>{resumirPrendas(pedido.prendas)}</span>
                          <EtiquetaPago pedido={pedido} />
                        </div>
                      </div>
                      <IndicadorUrgencia fecha={pedido.fechaCompromiso} hoy={hoy} />
                      <div className="fila_pedido_accion fila_asignacion">
                        <Selector
                          etiqueta={`Repartidor para ${pedido.codigo}`}
                          valor={asignaciones[pedido.codigo] ?? repartidorPorDefecto(pedido)}
                          alCambiar={(valor) =>
                            setAsignaciones((actual) => ({ ...actual, [pedido.codigo]: valor }))
                          }
                          opciones={repartidores.map((item) => ({
                            valor: item.nombre,
                            etiqueta: item.nombre,
                          }))}
                        />
                        <button
                          type="button"
                          className="boton boton_secundario"
                          onClick={() => salirARuta(pedido)}
                        >
                          <Send />
                          Salir a ruta
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      {pestana === "en_ruta" && (
        <section className="panel">
          <EncabezadoSeccion
            etiqueta="Reparto a domicilio"
            titulo="Hoja de ruta"
            descripcion="Paradas activas ordenadas por urgencia. Registra cada entrega al llegar."
          />
          <ul className="lista_repartidores" aria-label="Repartidores">
            {repartidores
              .filter((item) => !esRepartidor || item.nombre === sesion.nombre)
              .map((repartidor) => {
                const asignados = enRuta.filter(
                  (pedido) => pedido.repartidor === repartidor.nombre,
                ).length;
                return (
                  <li key={repartidor.id} className="tarjeta_repartidor">
                    <span className="avatar_iniciales avatar_grande" aria-hidden="true">
                      {repartidor.iniciales}
                    </span>
                    <div>
                      <strong>{repartidor.nombre}</strong>
                      <span>
                        {repartidor.vehiculo} · {repartidor.placa}
                      </span>
                      <small>Zona {repartidor.zona}</small>
                    </div>
                    <span className="tarjeta_repartidor_carga">
                      <strong>{asignados}</strong>
                      <small>{asignados === 1 ? "parada" : "paradas"}</small>
                    </span>
                  </li>
                );
              })}
          </ul>
          {enRuta.length === 0 ? (
            <EstadoVacio
              titulo="No hay paradas en ruta"
              descripcion="Los pedidos que salgan a reparto aparecerán aquí."
              icono={Navigation}
            />
          ) : (
            <ol className="linea_tiempo">
              {enRuta.map((pedido, indice) => (
                <li key={pedido.codigo} className="parada">
                  <span className="parada_numero" aria-label={`Parada ${indice + 1}`}>
                    {relleno(indice + 1)}
                  </span>
                  <div className="parada_tarjeta">
                    <div className="parada_principal">
                      <div className="fila_pedido_titulo">
                        <span className="codigo_pedido">{pedido.codigo}</span>
                        <strong>{pedido.cliente}</strong>
                      </div>
                      <p className="parada_direccion">
                        <MapPin aria-hidden="true" />
                        <span>
                          {pedido.direccion}
                          {pedido.referencia && <small>{pedido.referencia}</small>}
                        </span>
                      </p>
                      <div className="fila_pedido_meta">
                        <span>{resumirPrendas(pedido.prendas)}</span>
                        <span className="modalidad">
                          <Bike aria-hidden="true" />
                          {pedido.repartidor}
                        </span>
                      </div>
                    </div>
                    <div className="parada_cobro">
                      <span>Cobrar</span>
                      <strong className={pedido.saldo > 0 ? "texto_alerta" : "texto_exito"}>
                        {pedido.saldo > 0 ? formatearMoneda(pedido.saldo) : "Pagado"}
                      </strong>
                      <IndicadorUrgencia fecha={pedido.fechaCompromiso} hoy={hoy} />
                    </div>
                    <button
                      type="button"
                      className="boton boton_primario"
                      onClick={() => abrirEntrega(pedido)}
                    >
                      <UserCheck />
                      Registrar entrega
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {pedidoEntrega && (
        <AsistentePasos
          key={sesionAsistente}
          abierto={abierto}
          alCerrar={() => setAbierto(false)}
          titulo={`Entrega de ${pedidoEntrega.codigo}`}
          etiquetaSuperior={
            esDomicilio ? "Delivery · Registro de entrega" : "Mostrador · Entrega en tienda"
          }
          icono={esDomicilio ? Bike : Store}
          pasos={pasos}
          resumenLateral={<ResumenLateralPedido pedido={pedidoEntrega} />}
          accionFinal={{
            etiqueta: "Confirmar entrega",
            icono: CircleCheck,
            alConfirmar: confirmarEntrega,
            tono: "exito",
          }}
          completado={
            finalizado ? (
              <VistaCompletado
                titulo={`${finalizado.codigo} entregado`}
                descripcion={`${finalizado.cliente} · ${resumirPrendas(finalizado.prendas)}`}
                datos={[
                  {
                    etiqueta: "Recibió",
                    valor: finalizado.recibidoPor ?? "—",
                    detalle: finalizado.parentescoRecibe,
                  },
                  {
                    etiqueta: "Cobro",
                    valor: pago ? formatearMoneda(pago.importe) : "Sin saldo",
                    detalle: pago ? `${pago.medio} · ${pago.operacion}` : undefined,
                  },
                  { etiqueta: "Fecha", valor: formatearFecha(finalizado.fechaEntrega) },
                ]}
                acciones={
                  <button
                    type="button"
                    className="boton boton_primario"
                    onClick={() => setAbierto(false)}
                  >
                    {esDomicilio ? "Siguiente parada" : "Volver al mostrador"}
                  </button>
                }
              />
            ) : undefined
          }
        />
      )}
    </div>
  );
}
