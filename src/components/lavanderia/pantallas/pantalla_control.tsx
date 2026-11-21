import { useEffect, useState, type DragEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  CalendarRange,
  Camera,
  CheckCheck,
  ClipboardCheck,
  Copy,
  Droplets,
  Flame,
  Info,
  MessageSquareWarning,
  PackageCheck,
  RotateCcw,
  ScanSearch,
  TriangleAlert,
  Undo2,
  Wind,
  X,
  type LucideIcon,
} from "lucide-react";

import { AsistentePasos, type PasoAsistente } from "../asistente_pasos";
import { CabeceraPedido, ResumenLateralPedido, VistaCompletado } from "../componentes_pedido";
import {
  Aviso,
  Buscador,
  ControlSegmentado,
  FilaMetricas,
  IndicadorUrgencia,
  ListaDatos,
  MiniaturaPrenda,
  Selector,
  type DatoMetrica,
} from "../elementos";
import { formatearFecha, formatearFechaLarga, relleno, sumarDias } from "@/lib/formato";
import {
  SIN_OBSERVACIONES,
  anteriorEtapa,
  contarObservaciones,
  crearMensajeAviso,
  describirPrenda,
  etapasProceso,
  filtrarPorTexto,
  ordenarPorUrgencia,
  resumirPrendas,
  siguienteEtapaPedido,
  type EstadoPedido,
  type Pedido,
} from "@/lib/pedidos";

type ResultadoPrenda = "conforme" | "incidencia";
type RevisionPrenda = { resultado: ResultadoPrenda | null; nota: string };
type Decision = "aprobar" | "devolver";
type Orden = "vencimiento" | "ingreso";
type MovimientoDeshacer = { texto: string; anteriores: { codigo: string; estado: EstadoPedido }[] };

type ColumnaTablero = {
  estado: EstadoPedido;
  titulo: string;
  descripcion: string;
  icono: LucideIcon;
  tono: string;
  /** Las columnas de proceso aceptan movimientos manuales; aprobados solo llega por control. */
  aceptaMovimiento: boolean;
};

const columnasTablero: ColumnaTablero[] = [
  {
    estado: "En lavado",
    titulo: "Lavado",
    descripcion: "Recién ingresados",
    icono: Droplets,
    tono: "proceso",
    aceptaMovimiento: true,
  },
  {
    estado: "En secado",
    titulo: "Secado",
    descripcion: "Salieron de lavadora",
    icono: Wind,
    tono: "proceso",
    aceptaMovimiento: true,
  },
  {
    estado: "En planchado",
    titulo: "Planchado",
    descripcion: "Solo prendas de vestir",
    icono: Flame,
    tono: "proceso",
    aceptaMovimiento: true,
  },
  {
    estado: "Control de calidad",
    titulo: "Por revisar",
    descripcion: "Control final",
    icono: ScanSearch,
    tono: "control",
    aceptaMovimiento: true,
  },
  {
    estado: "Listo para entregar",
    titulo: "Aprobados",
    descripcion: "Listos para entregar",
    icono: PackageCheck,
    tono: "listo",
    aceptaMovimiento: false,
  },
];

const etapasManuales: EstadoPedido[] = ["En lavado", "En secado", "En planchado"];

const tareasEmpaque = [
  { id: "doblado", texto: "Prendas dobladas o colgadas en gancho" },
  { id: "etiqueta", texto: "Etiqueta con el código del pedido visible" },
  { id: "funda", texto: "Funda o bolsa protectora cerrada" },
];

const DIAS_AGENDA = 7;
const SEGUNDOS_DESHACER = 8;
const TODAS = "todas";
const VENCIDOS = "vencidos";

function tituloEtapa(estado: EstadoPedido) {
  return columnasTablero.find((columna) => columna.estado === estado)?.titulo ?? estado;
}

function etiquetaDiaAgenda(fecha: string, hoy: string) {
  if (fecha === hoy) return "Hoy";
  if (fecha === sumarDias(hoy, 1)) return "Mañana";
  return new Intl.DateTimeFormat("es-PE", { weekday: "short" }).format(
    new Date(`${fecha}T12:00:00`),
  );
}

function ProgresoEtapas({ estado }: { estado: EstadoPedido }) {
  const actual = etapasProceso.indexOf(estado);
  return (
    <ol className="progreso_etapas" aria-label={`Etapa ${actual + 1} de ${etapasProceso.length}`}>
      {etapasProceso.map((etapa, indice) => (
        <li
          key={etapa}
          title={tituloEtapa(etapa)}
          className={indice < actual ? "etapa_hecha" : indice === actual ? "etapa_actual" : ""}
        />
      ))}
    </ol>
  );
}

export function PantallaControl({
  pedidos,
  hoy,
  alActualizar,
}: {
  pedidos: Pedido[];
  hoy: string;
  alActualizar: (codigo: string, cambios: Partial<Pedido>) => void;
}) {
  const [consulta, setConsulta] = useState("");
  const [diaAgenda, setDiaAgenda] = useState<string>(TODAS);
  const [orden, setOrden] = useState<Orden>("vencimiento");
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [columnaDestino, setColumnaDestino] = useState<EstadoPedido | null>(null);
  const [deshacer, setDeshacer] = useState<MovimientoDeshacer | null>(null);
  const [codigoEnControl, setCodigoEnControl] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [sesion, setSesion] = useState(0);
  const [revision, setRevision] = useState<Record<number, RevisionPrenda>>({});
  const [empaque, setEmpaque] = useState<Record<string, boolean>>({});
  const [decision, setDecision] = useState<Decision>("aprobar");
  const [copiado, setCopiado] = useState(false);
  const [finalizado, setFinalizado] = useState<{
    pedido: Pedido;
    decision: Decision;
    incidencias: string[];
  } | null>(null);

  useEffect(() => {
    if (!deshacer) return undefined;
    const temporizador = window.setTimeout(() => setDeshacer(null), SEGUNDOS_DESHACER * 1000);
    return () => window.clearTimeout(temporizador);
  }, [deshacer]);

  const enProceso = pedidos.filter((pedido) => etapasProceso.includes(pedido.estado));
  const porTexto = filtrarPorTexto(enProceso, consulta, (pedido) => [
    pedido.codigo,
    pedido.cliente,
    pedido.telefono,
    ...pedido.prendas.map((prenda) => prenda.nombre),
  ]);
  const visibles = porTexto.filter((pedido) => {
    if (diaAgenda === TODAS) return true;
    if (diaAgenda === VENCIDOS)
      return pedido.fechaCompromiso < hoy && pedido.estado !== "Listo para entregar";
    return pedido.fechaCompromiso === diaAgenda;
  });
  const ordenar = (lista: Pedido[]) =>
    orden === "vencimiento"
      ? ordenarPorUrgencia(lista, hoy)
      : [...lista].sort((a, b) => a.fechaRecepcion.localeCompare(b.fechaRecepcion));

  const pendientesTaller = enProceso.filter((pedido) => pedido.estado !== "Listo para entregar");
  const agenda = [
    {
      clave: VENCIDOS,
      titulo: "Vencidos",
      detalle: "Atrasados",
      cantidad: pendientesTaller.filter((pedido) => pedido.fechaCompromiso < hoy).length,
    },
    ...Array.from({ length: DIAS_AGENDA }, (_, indice) => {
      const fecha = sumarDias(hoy, indice);
      return {
        clave: fecha,
        titulo: etiquetaDiaAgenda(fecha, hoy),
        detalle: formatearFecha(fecha),
        cantidad: pendientesTaller.filter((pedido) => pedido.fechaCompromiso === fecha).length,
      };
    }),
  ];

  const moverPedidos = (
    codigos: string[],
    destino: (pedido: Pedido) => EstadoPedido | null,
    texto: string,
  ) => {
    const anteriores: MovimientoDeshacer["anteriores"] = [];
    for (const codigo of codigos) {
      const pedido = pedidos.find((item) => item.codigo === codigo);
      const nuevo = pedido ? destino(pedido) : null;
      if (!pedido || !nuevo || nuevo === pedido.estado) continue;
      anteriores.push({ codigo, estado: pedido.estado });
      alActualizar(codigo, { estado: nuevo });
    }
    if (anteriores.length) setDeshacer({ texto, anteriores });
    setSeleccion([]);
  };

  const avanzar = (pedido: Pedido) => {
    const destino = siguienteEtapaPedido(pedido);
    if (destino)
      moverPedidos(
        [pedido.codigo],
        () => destino,
        `${pedido.codigo} pasó a ${tituloEtapa(destino)}`,
      );
  };

  const retroceder = (pedido: Pedido) => {
    const destino = anteriorEtapa(pedido.estado);
    if (destino)
      moverPedidos(
        [pedido.codigo],
        () => destino,
        `${pedido.codigo} regresó a ${tituloEtapa(destino)}`,
      );
  };

  const avanzarSeleccion = () =>
    moverPedidos(seleccion, siguienteEtapaPedido, `${seleccion.length} pedidos avanzaron de etapa`);

  const revertir = () => {
    deshacer?.anteriores.forEach((item) => alActualizar(item.codigo, { estado: item.estado }));
    setDeshacer(null);
  };

  const alternarSeleccion = (codigo: string) =>
    setSeleccion((actual) =>
      actual.includes(codigo) ? actual.filter((item) => item !== codigo) : [...actual, codigo],
    );

  const puedeSoltar = (destino: EstadoPedido) => {
    const pedido = pedidos.find((item) => item.codigo === arrastrando);
    const columna = columnasTablero.find((item) => item.estado === destino);
    return Boolean(
      pedido &&
      columna?.aceptaMovimiento &&
      etapasManuales.includes(pedido.estado) &&
      pedido.estado !== destino,
    );
  };

  const soltar = (evento: DragEvent<HTMLElement>, destino: EstadoPedido) => {
    evento.preventDefault();
    if (arrastrando && puedeSoltar(destino))
      moverPedidos(
        [arrastrando],
        () => destino,
        `${arrastrando} se movió a ${tituloEtapa(destino)}`,
      );
    setArrastrando(null);
    setColumnaDestino(null);
  };

  const pedidoEnControl = pedidos.find((pedido) => pedido.codigo === codigoEnControl) ?? null;

  const iniciarControl = (pedido: Pedido) => {
    setCodigoEnControl(pedido.codigo);
    setRevision({});
    setEmpaque({});
    setDecision("aprobar");
    setFinalizado(null);
    setCopiado(false);
    setSesion((actual) => actual + 1);
    setAbierto(true);
  };

  const contarEtapa = (estado: EstadoPedido) =>
    enProceso.filter((pedido) => pedido.estado === estado).length;

  const metricas: DatoMetrica[] = [
    {
      id: "por_revisar",
      icono: ScanSearch,
      valor: relleno(contarEtapa("Control de calidad")),
      etiqueta: "Por revisar",
      detalle: "Requieren control de calidad",
      tono: "alerta",
    },
    {
      id: "en_proceso",
      icono: Droplets,
      valor: relleno(etapasManuales.reduce((suma, estado) => suma + contarEtapa(estado), 0)),
      etiqueta: "En lavado, secado o planchado",
      detalle: "Aún en el taller",
    },
    {
      id: "vencidos",
      icono: TriangleAlert,
      valor: relleno(agenda[0]?.cantidad ?? 0),
      etiqueta: "Vencidos",
      detalle: "Priorízalos hoy",
      tono: "ruta",
    },
    {
      id: "aprobados",
      icono: PackageCheck,
      valor: relleno(contarEtapa("Listo para entregar")),
      etiqueta: "Aprobados",
      detalle: "Listos para entregar",
      tono: "exito",
    },
  ];

  const prendas = pedidoEnControl?.prendas ?? [];
  const evaluadas = prendas.filter((_, indice) => revision[indice]?.resultado).length;
  const incidencias = prendas
    .map((prenda, indice) => ({ prenda, revision: revision[indice] }))
    .filter((item) => item.revision?.resultado === "incidencia");
  const hayIncidencias = incidencias.length > 0;
  const decisionEfectiva: Decision = hayIncidencias ? decision : "aprobar";

  const actualizarRevision = (indice: number, cambios: Partial<RevisionPrenda>) =>
    setRevision((actual) => ({
      ...actual,
      [indice]: { resultado: null, nota: "", ...actual[indice], ...cambios },
    }));

  const confirmarControl = () => {
    if (!pedidoEnControl) return;
    const notas = incidencias.map((item) => `${item.prenda.nombre}: ${item.revision?.nota.trim()}`);
    const aprobado = decisionEfectiva === "aprobar";
    alActualizar(pedidoEnControl.codigo, {
      estado: aprobado ? "Listo para entregar" : "En lavado",
      incidencias: notas.length ? notas : undefined,
      avisoEnviado: aprobado,
    });
    setFinalizado({ pedido: pedidoEnControl, decision: decisionEfectiva, incidencias: notas });
  };

  const copiarMensaje = (texto: string) => {
    navigator.clipboard?.writeText(texto).then(
      () => setCopiado(true),
      () => setCopiado(false),
    );
  };

  const pasos: PasoAsistente[] = pedidoEnControl
    ? [
        {
          id: "verificar",
          titulo: "Verificar pedido",
          descripcion: "Datos, observaciones y fotos de recepción",
          icono: Info,
          contenido: (
            <div className="pila_contenido">
              <CabeceraPedido pedido={pedidoEnControl}>
                <IndicadorUrgencia fecha={pedidoEnControl.fechaCompromiso} hoy={hoy} />
              </CabeceraPedido>
              <ListaDatos
                columnas={3}
                datos={[
                  {
                    etiqueta: "Recibido",
                    valor: formatearFechaLarga(pedidoEnControl.fechaRecepcion),
                  },
                  {
                    etiqueta: "Entrega estimada",
                    valor: formatearFechaLarga(pedidoEnControl.fechaCompromiso),
                  },
                  {
                    etiqueta: "Servicio",
                    valor: pedidoEnControl.servicio,
                    detalle:
                      pedidoEnControl.tipoEntrega === "tienda" ? "Recojo en tienda" : "Delivery",
                  },
                ]}
              />
              {contarObservaciones(pedidoEnControl.prendas) > 0 ? (
                <Aviso tono="alerta" icono={MessageSquareWarning}>
                  <strong>Observaciones registradas en la recepción</strong>
                  <ul className="lista_vinetas">
                    {pedidoEnControl.prendas
                      .filter((prenda) => prenda.observacion !== SIN_OBSERVACIONES)
                      .map((prenda) => (
                        <li key={prenda.nombre}>
                          <strong>{prenda.nombre}:</strong> {prenda.observacion}
                        </li>
                      ))}
                  </ul>
                </Aviso>
              ) : (
                <Aviso tono="info" icono={Info}>
                  La recepción no registró observaciones para este pedido.
                </Aviso>
              )}
              {pedidoEnControl.notas && (
                <Aviso tono="info" icono={Info}>
                  <strong>Indicaciones:</strong> {pedidoEnControl.notas}
                </Aviso>
              )}
            </div>
          ),
        },
        {
          id: "revisar",
          titulo: "Revisar prendas",
          descripcion: "Marca cada artículo como conforme o con incidencia",
          icono: ClipboardCheck,
          validar: () => {
            if (evaluadas < prendas.length)
              return `Faltan ${prendas.length - evaluadas} prendas por evaluar.`;
            if (incidencias.some((item) => !item.revision?.nota.trim()))
              return "Describe cada incidencia encontrada.";
            return null;
          },
          contenido: (
            <div className="pila_contenido">
              <div className="barra_revision">
                <div className="barra_revision_progreso">
                  <span>
                    <strong>{evaluadas}</strong> de {prendas.length} evaluadas
                  </span>
                  <span className="barra_progreso" aria-hidden="true">
                    <span
                      style={{
                        width: `${prendas.length ? (evaluadas / prendas.length) * 100 : 0}%`,
                      }}
                    />
                  </span>
                </div>
                <button
                  type="button"
                  className="boton boton_secundario boton_pequeno"
                  onClick={() =>
                    setRevision(
                      Object.fromEntries(
                        prendas.map((_, indice) => [
                          indice,
                          { resultado: "conforme" as const, nota: "" },
                        ]),
                      ),
                    )
                  }
                >
                  <CheckCheck />
                  Todas conformes
                </button>
              </div>
              <ul className="lista_revision">
                {prendas.map((prenda, indice) => {
                  const estado = revision[indice];
                  return (
                    <li
                      key={`${prenda.nombre}-${indice}`}
                      className={`tarjeta_revision ${estado?.resultado ? `revision_${estado.resultado}` : ""}`}
                    >
                      <div className="tarjeta_revision_cabecera">
                        <MiniaturaPrenda nombre={prenda.nombre} grande />
                        <div className="tarjeta_revision_texto">
                          <strong>{describirPrenda(prenda)}</strong>
                          <span>
                            {prenda.color}
                            {prenda.marca !== "—" ? ` · ${prenda.marca}` : ""}
                          </span>
                          {prenda.observacion !== SIN_OBSERVACIONES && (
                            <small className="nota_observacion">
                              <MessageSquareWarning aria-hidden="true" />
                              {prenda.observacion}
                            </small>
                          )}
                        </div>
                        <ControlSegmentado
                          etiqueta={`Resultado de ${prenda.nombre}`}
                          valor={estado?.resultado ?? ""}
                          alCambiar={(valor) =>
                            actualizarRevision(indice, { resultado: valor as ResultadoPrenda })
                          }
                          opciones={[
                            { valor: "conforme", etiqueta: "Conforme", icono: CheckCheck },
                            { valor: "incidencia", etiqueta: "Incidencia", icono: TriangleAlert },
                          ]}
                        />
                      </div>
                      {prenda.evidencias && prenda.evidencias.length > 0 && (
                        <div
                          className="galeria_evidencias galeria_compacta"
                          aria-label="Fotos de recepción"
                        >
                          <Camera aria-hidden="true" />
                          {prenda.evidencias.map((url, posicion) => (
                            <figure key={url} className="evidencia">
                              <img
                                src={url}
                                alt={`Foto ${posicion + 1} de ${prenda.nombre} al recibirla`}
                              />
                            </figure>
                          ))}
                        </div>
                      )}
                      {estado?.resultado === "incidencia" && (
                        <label className="campo campo_completo tarjeta_revision_nota">
                          <span className="campo_etiqueta">Describe la incidencia</span>
                          <input
                            className="entrada"
                            value={estado.nota}
                            maxLength={100}
                            onChange={(evento) =>
                              actualizarRevision(indice, { nota: evento.target.value })
                            }
                            placeholder="Ej. La mancha no salió por completo"
                          />
                        </label>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ),
        },
        {
          id: "resultado",
          titulo: "Resultado y empaque",
          descripcion: "Decide el destino y avisa al cliente",
          icono: PackageCheck,
          validar: () => {
            if (decisionEfectiva === "aprobar" && tareasEmpaque.some((tarea) => !empaque[tarea.id]))
              return "Completa la lista de empaque para aprobar el pedido.";
            return null;
          },
          contenido: (
            <div className="pila_contenido">
              <div className="resumen_revision">
                <div className="resumen_revision_dato tono_exito">
                  <strong>{prendas.length - incidencias.length}</strong>
                  <span>Conformes</span>
                </div>
                <div className={`resumen_revision_dato ${hayIncidencias ? "tono_alerta" : ""}`}>
                  <strong>{incidencias.length}</strong>
                  <span>Con incidencia</span>
                </div>
              </div>
              {hayIncidencias && (
                <>
                  <Aviso tono="alerta" icono={TriangleAlert}>
                    <strong>Incidencias encontradas</strong>
                    <ul className="lista_vinetas">
                      {incidencias.map((item) => (
                        <li key={item.prenda.nombre}>
                          <strong>{item.prenda.nombre}:</strong> {item.revision?.nota}
                        </li>
                      ))}
                    </ul>
                  </Aviso>
                  <fieldset className="grupo_campos">
                    <legend>¿Qué hacemos con el pedido?</legend>
                    <ControlSegmentado
                      etiqueta="Decisión del control"
                      valor={decision}
                      alCambiar={(valor) => setDecision(valor as Decision)}
                      opciones={[
                        {
                          valor: "aprobar",
                          etiqueta: "Aprobar con observaciones",
                          icono: PackageCheck,
                        },
                        { valor: "devolver", etiqueta: "Devolver a lavado", icono: RotateCcw },
                      ]}
                    />
                  </fieldset>
                </>
              )}
              {decisionEfectiva === "aprobar" ? (
                <>
                  <fieldset className="grupo_campos">
                    <legend>Lista de empaque · marca todas</legend>
                    <ul className="lista_verificacion">
                      {tareasEmpaque.map((tarea) => (
                        <li key={tarea.id}>
                          <label className="casilla_confirmacion">
                            <input
                              type="checkbox"
                              checked={Boolean(empaque[tarea.id])}
                              onChange={(evento) =>
                                setEmpaque((actual) => ({
                                  ...actual,
                                  [tarea.id]: evento.target.checked,
                                }))
                              }
                            />
                            <span>
                              <strong>{tarea.texto}</strong>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </fieldset>
                  <Aviso tono="info" icono={BellRing}>
                    Al aprobar se enviará este aviso al {pedidoEnControl.telefono} (simulado):
                    <blockquote className="mensaje_aviso">
                      {crearMensajeAviso(pedidoEnControl)}
                    </blockquote>
                  </Aviso>
                </>
              ) : (
                <Aviso tono="info" icono={RotateCcw}>
                  El pedido volverá a la etapa <strong>Lavado</strong> con las incidencias
                  registradas.
                </Aviso>
              )}
            </div>
          ),
        },
      ]
    : [];

  return (
    <div className="contenido_pantalla">
      <FilaMetricas metricas={metricas} variante="compacta" />

      <section className="panel panel_taller">
        <header className="taller_cabecera">
          <div>
            <p className="texto_etiqueta">Taller</p>
            <h2>Tablero de etapas</h2>
            <p className="encabezado_descripcion">
              Pulsa «Pasar a…», arrastra la tarjeta o selecciona varias para moverlas juntas.
            </p>
          </div>
          <div className="barra_filtros">
            <Buscador
              valor={consulta}
              alCambiar={setConsulta}
              marcador="Pedido, cliente o prenda"
              etiqueta="Buscar pedidos en el taller"
            />
            <Selector
              etiqueta="Ordenar pedidos"
              valor={orden}
              alCambiar={(valor) => setOrden(valor as Orden)}
              opciones={[
                { valor: "vencimiento", etiqueta: "Vencen primero" },
                { valor: "ingreso", etiqueta: "Ingresaron primero" },
              ]}
            />
          </div>
        </header>

        <div className="agenda_barra">
          <span className="agenda_barra_titulo">
            <CalendarRange aria-hidden="true" />
            Entrega
          </span>
          <div className="agenda_dias" role="radiogroup" aria-label="Filtrar por día de entrega">
            {[
              {
                clave: TODAS,
                titulo: "Todos",
                detalle: "Sin filtro",
                cantidad: pendientesTaller.length,
              },
              ...agenda,
            ].map((dia) => {
              const activo = diaAgenda === dia.clave;
              return (
                <button
                  key={dia.clave}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  className={`agenda_dia ${activo ? "agenda_dia_activo" : ""} ${dia.clave === VENCIDOS && dia.cantidad > 0 ? "agenda_dia_vencido" : ""}`}
                  onClick={() => setDiaAgenda(dia.clave)}
                >
                  <span className="agenda_dia_texto">
                    <small>{dia.titulo}</small>
                    <span>{dia.detalle}</span>
                  </span>
                  <strong
                    aria-label={`${dia.cantidad} ${dia.cantidad === 1 ? "pedido" : "pedidos"}`}
                  >
                    {dia.cantidad}
                  </strong>
                </button>
              );
            })}
          </div>
        </div>

        {(seleccion.length > 0 || deshacer) && (
          <div className="barra_acciones_lote" role="status">
            {seleccion.length > 0 ? (
              <>
                <strong>
                  {seleccion.length}{" "}
                  {seleccion.length === 1 ? "pedido seleccionado" : "pedidos seleccionados"}
                </strong>
                <button
                  type="button"
                  className="boton boton_primario boton_pequeno"
                  onClick={avanzarSeleccion}
                >
                  Pasar a la siguiente etapa
                  <ArrowRight />
                </button>
                <button
                  type="button"
                  className="boton boton_fantasma boton_pequeno"
                  onClick={() => setSeleccion([])}
                >
                  <X />
                  Quitar selección
                </button>
              </>
            ) : (
              deshacer && (
                <>
                  <span>{deshacer.texto}</span>
                  <button
                    type="button"
                    className="boton boton_secundario boton_pequeno"
                    onClick={revertir}
                  >
                    <Undo2 />
                    Deshacer
                  </button>
                </>
              )
            )}
          </div>
        )}

        <div className="tablero" aria-label="Tablero de etapas">
          {columnasTablero.map((columna) => {
            const Icono = columna.icono;
            const lista = ordenar(visibles.filter((pedido) => pedido.estado === columna.estado));
            const resaltada = columnaDestino === columna.estado && puedeSoltar(columna.estado);
            return (
              <section
                key={columna.estado}
                className={`tablero_columna columna_${columna.tono} ${resaltada ? "tablero_columna_destino" : ""}`}
                aria-label={columna.titulo}
                onDragOver={(evento) => {
                  if (!puedeSoltar(columna.estado)) return;
                  evento.preventDefault();
                  setColumnaDestino(columna.estado);
                }}
                onDragLeave={() => setColumnaDestino(null)}
                onDrop={(evento) => soltar(evento, columna.estado)}
              >
                <header className="tablero_columna_encabezado">
                  <span className="seccion_lista_icono" aria-hidden="true">
                    <Icono />
                  </span>
                  <div>
                    <h3>{columna.titulo}</h3>
                    <p>{columna.descripcion}</p>
                  </div>
                  <span className="contador_pildora">{lista.length}</span>
                </header>
                {lista.length === 0 ? (
                  <p className="tablero_vacio">
                    {arrastrando && resaltada ? "Suelta aquí" : "Sin pedidos"}
                  </p>
                ) : (
                  <ul className="tablero_lista">
                    {lista.map((pedido) => {
                      const manual = etapasManuales.includes(pedido.estado);
                      const destino = siguienteEtapaPedido(pedido);
                      const anterior = anteriorEtapa(pedido.estado);
                      const observaciones = contarObservaciones(pedido.prendas);
                      const seleccionado = seleccion.includes(pedido.codigo);
                      return (
                        <li
                          key={pedido.codigo}
                          className={`tarjeta_tablero ${seleccionado ? "tarjeta_tablero_seleccionada" : ""} ${arrastrando === pedido.codigo ? "tarjeta_tablero_arrastrando" : ""}`}
                          draggable={manual}
                          onDragStart={(evento) => {
                            evento.dataTransfer.effectAllowed = "move";
                            setArrastrando(pedido.codigo);
                          }}
                          onDragEnd={() => {
                            setArrastrando(null);
                            setColumnaDestino(null);
                          }}
                        >
                          <div className="tarjeta_tablero_cabecera">
                            {manual && (
                              <input
                                type="checkbox"
                                className="tarjeta_tablero_casilla"
                                checked={seleccionado}
                                onChange={() => alternarSeleccion(pedido.codigo)}
                                aria-label={`Seleccionar ${pedido.codigo}`}
                              />
                            )}
                            <span className="codigo_pedido">{pedido.codigo}</span>
                            <IndicadorUrgencia fecha={pedido.fechaCompromiso} hoy={hoy} />
                          </div>
                          <strong className="tarjeta_tablero_cliente">{pedido.cliente}</strong>
                          <p className="tarjeta_tablero_prendas">
                            {resumirPrendas(pedido.prendas)}
                          </p>
                          <ProgresoEtapas estado={pedido.estado} />
                          {(observaciones > 0 || pedido.incidencias) && (
                            <div className="fila_pedido_meta">
                              {observaciones > 0 && (
                                <span className="nota_observacion">
                                  <MessageSquareWarning aria-hidden="true" />
                                  {observaciones} obs.
                                </span>
                              )}
                              {pedido.incidencias && (
                                <span className="nota_incidencia">
                                  <TriangleAlert aria-hidden="true" />
                                  {pedido.incidencias.length} inc.
                                </span>
                              )}
                            </div>
                          )}
                          <div className="tarjeta_tablero_acciones">
                            {manual && anterior && (
                              <button
                                type="button"
                                className="boton_icono"
                                onClick={() => retroceder(pedido)}
                                aria-label={`Regresar ${pedido.codigo} a ${tituloEtapa(anterior)}`}
                                title={`Regresar a ${tituloEtapa(anterior)}`}
                              >
                                <ArrowLeft />
                              </button>
                            )}
                            {manual && destino && (
                              <button
                                type="button"
                                className="boton boton_secundario boton_pequeno"
                                onClick={() => avanzar(pedido)}
                                aria-label={`Pasar ${pedido.codigo} a ${tituloEtapa(destino).toLowerCase()}`}
                                title={`Pasar a ${tituloEtapa(destino).toLowerCase()}`}
                              >
                                {tituloEtapa(destino)}
                                <ArrowRight />
                              </button>
                            )}
                            {pedido.estado === "Control de calidad" && (
                              <button
                                type="button"
                                className="boton boton_primario boton_pequeno"
                                onClick={() => iniciarControl(pedido)}
                              >
                                <ClipboardCheck />
                                Revisar
                              </button>
                            )}
                            {pedido.estado === "Listo para entregar" && (
                              <span className="texto_aprobado">
                                <BellRing aria-hidden="true" />
                                {pedido.avisoEnviado ? "Cliente avisado" : "Control aprobado"}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </section>

      {pedidoEnControl && (
        <AsistentePasos
          key={sesion}
          abierto={abierto}
          alCerrar={() => setAbierto(false)}
          titulo={`Control de ${pedidoEnControl.codigo}`}
          etiquetaSuperior="Taller · Control de calidad"
          icono={ClipboardCheck}
          pasos={pasos}
          resumenLateral={<ResumenLateralPedido pedido={pedidoEnControl} />}
          accionFinal={
            decisionEfectiva === "aprobar"
              ? {
                  etiqueta: "Aprobar y avisar al cliente",
                  icono: PackageCheck,
                  alConfirmar: confirmarControl,
                  tono: "exito",
                }
              : {
                  etiqueta: "Devolver a lavado",
                  icono: RotateCcw,
                  alConfirmar: confirmarControl,
                  tono: "alerta",
                }
          }
          completado={
            finalizado ? (
              <VistaCompletado
                titulo={
                  finalizado.decision === "aprobar"
                    ? `${finalizado.pedido.codigo} listo y cliente avisado`
                    : `${finalizado.pedido.codigo} devuelto a lavado`
                }
                descripcion={`${finalizado.pedido.cliente} · ${resumirPrendas(finalizado.pedido.prendas)}`}
                datos={[
                  {
                    etiqueta: "Prendas revisadas",
                    valor: String(finalizado.pedido.prendas.length),
                  },
                  { etiqueta: "Incidencias", valor: String(finalizado.incidencias.length) },
                  {
                    etiqueta: "Nueva etapa",
                    valor: finalizado.decision === "aprobar" ? "Listo para entregar" : "Lavado",
                  },
                ]}
                acciones={
                  <>
                    {finalizado.decision === "aprobar" && (
                      <button
                        type="button"
                        className="boton boton_secundario"
                        onClick={() => copiarMensaje(crearMensajeAviso(finalizado.pedido))}
                      >
                        {copiado ? <CheckCheck /> : <Copy />}
                        {copiado ? "Mensaje copiado" : "Copiar mensaje de aviso"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="boton boton_primario"
                      onClick={() => setAbierto(false)}
                    >
                      Volver al tablero
                    </button>
                  </>
                }
              />
            ) : undefined
          }
        />
      )}
    </div>
  );
}
