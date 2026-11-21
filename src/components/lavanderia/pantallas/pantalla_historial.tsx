import { useState } from "react";
import {
  Eye,
  FileCheck2,
  FilterX,
  ReceiptText,
  Store,
  Trophy,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

import { CabeceraPedido, ListaPrendasPedido } from "../componentes_pedido";
import {
  ControlSegmentado,
  EncabezadoSeccion,
  EstadoVacio,
  EtiquetaPago,
  FilaMetricas,
  ListaDatos,
  MiniaturaPrenda,
  Selector,
  Buscador,
  type DatoMetrica,
} from "../elementos";
import { VentanaFlotante } from "../ventana_flotante";
import { filtrarTextoLibre } from "@/lib/filtros_entrada";
import {
  formatearFecha,
  formatearFechaCompleta,
  formatearFechaLarga,
  formatearMoneda,
  relleno,
} from "@/lib/formato";
import {
  agruparPor,
  enmascararDocumento,
  filtrarPedidosEntregados,
  mediosPago,
  rankingClientes,
  resumirPrendas,
  type EstadoPago,
  type FiltrosEntregados,
  type MedioPago,
  type Pedido,
} from "@/lib/pedidos";
import { buscarRol, type SesionUsuario } from "@/lib/usuarios";

type Agrupacion = "fecha" | "cliente";

const filtrosIniciales: FiltrosEntregados = {
  texto: "",
  estadoPago: "Todos",
  medioPago: "Todos",
  desde: "",
  hasta: "",
};

function mediosDelPedido(pedido: Pedido) {
  return Array.from(
    new Set(
      [pedido.medioPago, pedido.medioPagoSaldo].filter((medio): medio is MedioPago =>
        Boolean(medio),
      ),
    ),
  );
}

export function PantallaHistorial({
  pedidos,
  hoy,
  sesion,
}: {
  pedidos: Pedido[];
  hoy: string;
  sesion: SesionUsuario;
}) {
  const rol = buscarRol(sesion.rol);
  const [filtros, setFiltros] = useState<FiltrosEntregados>(filtrosIniciales);
  const [agrupacion, setAgrupacion] = useState<Agrupacion>("fecha");
  const [codigoDetalle, setCodigoDetalle] = useState<string | null>(null);

  const actualizarFiltros = (cambios: Partial<FiltrosEntregados>) =>
    setFiltros((actual) => ({ ...actual, ...cambios }));

  const historial = filtrarPedidosEntregados(pedidos, filtros).sort((a, b) =>
    b.fechaEntrega.localeCompare(a.fechaEntrega),
  );
  const gruposHistorial =
    agrupacion === "fecha"
      ? agruparPor(historial, (pedido) => pedido.fechaEntrega)
      : agruparPor(
          [...historial].sort((a, b) => a.cliente.localeCompare(b.cliente)),
          (pedido) => pedido.cliente,
        );
  const filtrosActivos = (Object.keys(filtros) as (keyof FiltrosEntregados)[]).filter(
    (clave) => filtros[clave] !== filtrosIniciales[clave],
  ).length;
  const pedidoDetalle = pedidos.find((pedido) => pedido.codigo === codigoDetalle) ?? null;

  const metricas: DatoMetrica[] = [
    {
      id: "listadas",
      icono: FileCheck2,
      valor: relleno(historial.length),
      etiqueta: "Entregas listadas",
      detalle: filtrosActivos ? "Según los filtros aplicados" : "Sin filtros aplicados",
    },
    {
      id: "importe",
      icono: Wallet,
      valor: formatearMoneda(historial.reduce((suma, pedido) => suma + pedido.total, 0)),
      etiqueta: "Importe entregado",
      detalle: "Suma de órdenes listadas",
      tono: "exito",
    },
    {
      id: "tienda",
      icono: Store,
      valor: relleno(historial.filter((pedido) => pedido.tipoEntrega === "tienda").length),
      etiqueta: "En tienda",
      detalle: "Recogidas en mostrador",
    },
    {
      id: "delivery",
      icono: Truck,
      valor: relleno(historial.filter((pedido) => pedido.tipoEntrega === "domicilio").length),
      etiqueta: "Por delivery",
      detalle: `${historial.filter((pedido) => pedido.fechaEntrega === hoy).length} entregas hoy`,
      tono: "ruta",
    },
  ];

  const ranking = rankingClientes(pedidos).slice(0, 5);
  // Los pedidos de ejemplo no tienen pagos detallados: se atribuye su total al medio registrado.
  const pagosHistorial = historial.flatMap((pedido) => {
    if (pedido.pagos?.length) return pedido.pagos;
    const medio = pedido.medioPagoSaldo ?? pedido.medioPago;
    return medio ? [{ medio, importe: pedido.total }] : [];
  });
  const ingresosPorMedio = mediosPago
    .map((medio) => ({
      medio,
      importe: pagosHistorial
        .filter((item) => item.medio === medio)
        .reduce((suma, item) => suma + item.importe, 0),
    }))
    .filter((fila) => fila.importe > 0);
  const maximoIngreso = Math.max(1, ...ingresosPorMedio.map((fila) => fila.importe));

  return (
    <div className="contenido_pantalla">
      <FilaMetricas metricas={metricas} />

      {rol.veResumenNegocio && (
        <section className="panel resumen_negocio" aria-label="Resumen del negocio">
          <EncabezadoSeccion
            etiqueta="Solo administrador"
            titulo="Resumen del negocio"
            descripcion="Ingresos de las entregas listadas y clientes que más vuelven."
          />
          <div className="resumen_negocio_rejilla">
            <article className="tarjeta_resumen">
              <h3>
                <Wallet aria-hidden="true" />
                Ingresos por medio de pago
              </h3>
              {ingresosPorMedio.length === 0 ? (
                <p className="seccion_lista_vacia">Sin ingresos en este rango.</p>
              ) : (
                <ul className="barras_horizontales">
                  {ingresosPorMedio.map((fila) => (
                    <li key={fila.medio}>
                      <span>{fila.medio}</span>
                      <span className="barra_horizontal" aria-hidden="true">
                        <span style={{ width: `${(fila.importe / maximoIngreso) * 100}%` }} />
                      </span>
                      <strong>{formatearMoneda(fila.importe)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </article>
            <article className="tarjeta_resumen">
              <h3>
                <Trophy aria-hidden="true" />
                Clientes frecuentes
              </h3>
              <ol className="ranking_clientes">
                {ranking.map((fila, indice) => (
                  <li key={fila.cliente}>
                    <span className="ranking_posicion">{indice + 1}</span>
                    <strong>{fila.cliente}</strong>
                    <small>
                      {fila.ordenes} {fila.ordenes === 1 ? "orden" : "órdenes"} ·{" "}
                      {formatearMoneda(fila.importe)}
                    </small>
                  </li>
                ))}
              </ol>
            </article>
          </div>
        </section>
      )}

      <section className="panel">
        <EncabezadoSeccion
          etiqueta="Registro"
          titulo="Historial de entregas"
          descripcion="Tienda y delivery juntos. Agrupa por fecha o por cliente."
        >
          {filtrosActivos > 0 && (
            <button
              type="button"
              className="boton boton_fantasma boton_pequeno"
              onClick={() => setFiltros(filtrosIniciales)}
            >
              <FilterX />
              Limpiar {filtrosActivos} {filtrosActivos === 1 ? "filtro" : "filtros"}
            </button>
          )}
        </EncabezadoSeccion>

        <div className="panel_filtros">
          <div className="panel_filtros_fila">
            <Buscador
              valor={filtros.texto}
              alCambiar={(texto) => actualizarFiltros({ texto: filtrarTextoLibre(texto, 40) })}
              marcador="Orden, cliente, prenda o medio"
              etiqueta="Buscar en el historial"
            />
            <label className="campo campo_en_linea">
              <span className="campo_etiqueta">Desde</span>
              <input
                className="entrada"
                type="date"
                value={filtros.desde}
                max={filtros.hasta || hoy}
                onChange={(evento) => actualizarFiltros({ desde: evento.target.value })}
              />
            </label>
            <label className="campo campo_en_linea">
              <span className="campo_etiqueta">Hasta</span>
              <input
                className="entrada"
                type="date"
                value={filtros.hasta}
                min={filtros.desde || undefined}
                max={hoy}
                onChange={(evento) => actualizarFiltros({ hasta: evento.target.value })}
              />
            </label>
            <label className="campo campo_en_linea">
              <span className="campo_etiqueta">Medio</span>
              <Selector
                etiqueta="Filtrar por medio de pago"
                valor={filtros.medioPago}
                alCambiar={(valor) =>
                  actualizarFiltros({ medioPago: valor as FiltrosEntregados["medioPago"] })
                }
                opciones={[
                  { valor: "Todos", etiqueta: "Todos los medios" },
                  ...mediosPago.map((medio) => ({ valor: medio, etiqueta: medio })),
                ]}
              />
            </label>
          </div>
          <div className="panel_filtros_opciones">
            <ControlSegmentado
              etiqueta="Filtrar por estado de pago"
              variante="fichas"
              valor={filtros.estadoPago}
              alCambiar={(valor) =>
                actualizarFiltros({ estadoPago: valor as EstadoPago | "Todos" })
              }
              opciones={[
                { valor: "Todos", etiqueta: "Todos los pagos" },
                { valor: "Pagado", etiqueta: "Pagado al recibir" },
                { valor: "Adelanto", etiqueta: "Con adelanto" },
                { valor: "Pendiente", etiqueta: "Pendiente" },
              ]}
            />
            <ControlSegmentado
              etiqueta="Agrupar historial"
              valor={agrupacion}
              alCambiar={(valor) => setAgrupacion(valor as Agrupacion)}
              opciones={[
                { valor: "fecha", etiqueta: "Por fecha" },
                { valor: "cliente", etiqueta: "Por cliente", icono: Users },
              ]}
            />
          </div>
        </div>

        {historial.length === 0 ? (
          <EstadoVacio
            titulo="Sin entregas para estos filtros"
            descripcion="Amplía el rango de fechas o limpia los filtros."
            icono={FilterX}
          />
        ) : (
          <div className="tabla_contenedor">
            <table className="tabla_historial">
              <thead>
                <tr>
                  <th scope="col">Orden</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Prendas y servicio</th>
                  <th scope="col" className="celda_numero">
                    Importe
                  </th>
                  <th scope="col">Pago</th>
                  <th scope="col">
                    <span className="solo_lector">Acciones</span>
                  </th>
                </tr>
              </thead>
              {gruposHistorial.map((grupo) => (
                <tbody key={grupo.clave}>
                  <tr className="tabla_grupo">
                    <th scope="colgroup" colSpan={6}>
                      <span>
                        {agrupacion === "fecha" ? formatearFechaLarga(grupo.clave) : grupo.clave}
                      </span>
                      <small>
                        {grupo.elementos.length}{" "}
                        {grupo.elementos.length === 1 ? "entrega" : "entregas"} ·{" "}
                        {formatearMoneda(
                          grupo.elementos.reduce((suma, pedido) => suma + pedido.total, 0),
                        )}
                      </small>
                    </th>
                  </tr>
                  {grupo.elementos.map((pedido) => (
                    <tr key={pedido.codigo}>
                      <td>
                        <span className="codigo_pedido">{pedido.codigo}</span>
                        <small>
                          {pedido.tipoEntrega === "tienda" ? "Tienda" : "Delivery"}
                          {agrupacion === "cliente"
                            ? ` · ${formatearFecha(pedido.fechaEntrega)}`
                            : ""}
                        </small>
                      </td>
                      <td>
                        <strong>{pedido.cliente}</strong>
                        <small>
                          {pedido.tipoDocumento} {enmascararDocumento(pedido.documento)}
                        </small>
                      </td>
                      <td>
                        <span className="celda_prendas">
                          <MiniaturaPrenda nombre={pedido.prendas[0]?.nombre ?? ""} />
                          <span>
                            <strong>{resumirPrendas(pedido.prendas)}</strong>
                            <small>{pedido.servicio}</small>
                          </span>
                        </span>
                      </td>
                      <td className="celda_numero">
                        <strong>{formatearMoneda(pedido.total)}</strong>
                      </td>
                      <td>
                        <EtiquetaPago pedido={pedido} />
                        <small>{mediosDelPedido(pedido).join(" + ") || "Medio no indicado"}</small>
                      </td>
                      <td className="celda_accion">
                        <button
                          type="button"
                          className="boton_icono"
                          onClick={() => setCodigoDetalle(pedido.codigo)}
                          aria-label={`Ver detalle de ${pedido.codigo}`}
                        >
                          <Eye />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </section>

      <VentanaFlotante
        abierta={Boolean(pedidoDetalle)}
        alCerrar={() => setCodigoDetalle(null)}
        titulo={pedidoDetalle ? `Orden ${pedidoDetalle.codigo}` : "Detalle"}
        etiquetaSuperior="Historial · Detalle de entrega"
        icono={ReceiptText}
        pie={
          <button
            type="button"
            className="boton boton_secundario"
            onClick={() => setCodigoDetalle(null)}
          >
            Cerrar
          </button>
        }
      >
        {pedidoDetalle && (
          <div className="pila_contenido">
            <CabeceraPedido pedido={pedidoDetalle}>
              <EtiquetaPago pedido={pedidoDetalle} />
            </CabeceraPedido>
            <ListaDatos
              columnas={3}
              datos={[
                {
                  etiqueta: "Recibido",
                  valor: formatearFechaCompleta(pedidoDetalle.fechaRecepcion),
                },
                {
                  etiqueta: "Entregado",
                  valor: formatearFechaCompleta(pedidoDetalle.fechaEntrega),
                  detalle: pedidoDetalle.recibidoPor
                    ? `Recibió ${pedidoDetalle.recibidoPor}${pedidoDetalle.parentescoRecibe ? ` (${pedidoDetalle.parentescoRecibe})` : ""}`
                    : undefined,
                },
                {
                  etiqueta: "Modalidad",
                  valor: pedidoDetalle.tipoEntrega === "tienda" ? "Recojo en tienda" : "Delivery",
                  detalle:
                    pedidoDetalle.tipoEntrega === "domicilio" ? pedidoDetalle.direccion : undefined,
                },
                { etiqueta: "Total", valor: formatearMoneda(pedidoDetalle.total) },
                { etiqueta: "Saldo", valor: formatearMoneda(pedidoDetalle.saldo) },
                {
                  etiqueta: "Operaciones",
                  valor:
                    pedidoDetalle.pagos?.map((item) => item.operacion).join(" · ") ||
                    mediosDelPedido(pedidoDetalle).join(" + ") ||
                    "—",
                },
              ]}
            />
            <section className="bloque_lista">
              <header className="bloque_lista_encabezado">
                <h4>Prendas</h4>
                <span className="contador_pildora">{pedidoDetalle.prendas.length}</span>
              </header>
              <ListaPrendasPedido prendas={pedidoDetalle.prendas} />
            </section>
          </div>
        )}
      </VentanaFlotante>
    </div>
  );
}
