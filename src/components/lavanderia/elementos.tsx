import type { ReactNode } from "react";
import {
  TriangleAlert,
  ChevronDown,
  Clock3,
  Inbox,
  Package,
  Search,
  Shirt,
  X,
  type LucideIcon,
} from "lucide-react";

import { formatearFecha } from "@/lib/formato";
import { calcularUrgencia, type EstadoPedido, type Pedido } from "@/lib/pedidos";

const clasesEstado: Record<EstadoPedido, string> = {
  "En lavado": "estado_proceso",
  "En secado": "estado_proceso",
  "En planchado": "estado_proceso",
  "Control de calidad": "estado_control",
  "Listo para entregar": "estado_listo",
  "En ruta": "estado_ruta",
  Entregado: "estado_entregado",
};

export function EtiquetaEstado({ estado }: { estado: EstadoPedido }) {
  return (
    <span className={`etiqueta_estado ${clasesEstado[estado]}`}>
      <span aria-hidden="true" />
      {estado}
    </span>
  );
}

export function EtiquetaPago({ pedido }: { pedido: Pedido }) {
  if (pedido.saldo > 0)
    return <span className="etiqueta_pago pago_pendiente">Saldo pendiente</span>;
  return <span className="etiqueta_pago pago_completo">Pagado</span>;
}

const textosUrgencia = {
  vencido: "Vencido",
  hoy: "Vence hoy",
  manana: "Mañana",
  a_tiempo: "A tiempo",
} as const;

export function IndicadorUrgencia({ fecha, hoy }: { fecha: string; hoy: string }) {
  const urgencia = calcularUrgencia(fecha, hoy);
  return (
    <span
      className={`indicador_urgencia urgencia_${urgencia}`}
      title={`Fecha comprometida: ${formatearFecha(fecha)}`}
    >
      {urgencia === "vencido" ? (
        <TriangleAlert aria-hidden="true" />
      ) : (
        <Clock3 aria-hidden="true" />
      )}
      <span>
        {textosUrgencia[urgencia]}
        <small>{formatearFecha(fecha)}</small>
      </span>
    </span>
  );
}

const palabrasArticuloGrande = ["edredón", "sábana", "toalla", "cortina", "frazada"];

export function MiniaturaPrenda({ nombre, grande = false }: { nombre: string; grande?: boolean }) {
  const normalizado = nombre.toLocaleLowerCase("es");
  const Icono = palabrasArticuloGrande.some((palabra) => normalizado.includes(palabra))
    ? Package
    : Shirt;
  return (
    <span className={`miniatura_prenda ${grande ? "miniatura_grande" : ""}`} aria-hidden="true">
      <Icono />
    </span>
  );
}

export function EstadoVacio({
  titulo,
  descripcion,
  icono: Icono = Inbox,
}: {
  titulo: string;
  descripcion?: string | undefined;
  icono?: LucideIcon | undefined;
}) {
  return (
    <div className="estado_vacio">
      <span className="estado_vacio_icono" aria-hidden="true">
        <Icono />
      </span>
      <strong>{titulo}</strong>
      {descripcion && <p>{descripcion}</p>}
    </div>
  );
}

export function EncabezadoSeccion({
  etiqueta,
  titulo,
  descripcion,
  children,
}: {
  etiqueta: string;
  titulo: string;
  descripcion?: string | undefined;
  children?: ReactNode;
}) {
  return (
    <header className="encabezado_seccion">
      <div>
        <p className="texto_etiqueta">{etiqueta}</p>
        <h2>{titulo}</h2>
        {descripcion && <p className="encabezado_descripcion">{descripcion}</p>}
      </div>
      {children && <div className="encabezado_acciones">{children}</div>}
    </header>
  );
}

export type DatoMetrica = {
  id: string;
  icono: LucideIcon;
  valor: string;
  etiqueta: string;
  detalle: string;
  tono?: "neutro" | "exito" | "alerta" | "ruta";
};

export function FilaMetricas({
  metricas,
  variante = "normal",
}: {
  metricas: DatoMetrica[];
  variante?: "normal" | "compacta";
}) {
  return (
    <section
      className={`fila_metricas ${variante === "compacta" ? "fila_metricas_compacta" : ""}`}
      aria-label="Indicadores"
    >
      {metricas.map((metrica) => {
        const Icono = metrica.icono;
        return (
          <article key={metrica.id} className={`tarjeta_metrica tono_${metrica.tono ?? "neutro"}`}>
            <span className="tarjeta_metrica_icono" aria-hidden="true">
              <Icono />
            </span>
            <div>
              <p className="tarjeta_metrica_valor">{metrica.valor}</p>
              <p className="tarjeta_metrica_etiqueta">{metrica.etiqueta}</p>
              <p className="tarjeta_metrica_detalle">{metrica.detalle}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export function CampoFormulario({
  etiqueta,
  ayuda,
  obligatorio = false,
  ancho = "normal",
  agrupaControles = false,
  children,
}: {
  etiqueta: string;
  ayuda?: string | undefined;
  obligatorio?: boolean;
  ancho?: "normal" | "completo";
  /** Usa un contenedor neutro cuando el contenido son botones, para que la etiqueta no los active. */
  agrupaControles?: boolean;
  children: ReactNode;
}) {
  const Contenedor = agrupaControles ? "div" : "label";
  return (
    <Contenedor className={`campo ${ancho === "completo" ? "campo_completo" : ""}`}>
      <span className="campo_etiqueta">
        {etiqueta}
        {obligatorio && (
          <span className="campo_obligatorio" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {children}
      {ayuda && <span className="campo_ayuda">{ayuda}</span>}
    </Contenedor>
  );
}

export type OpcionSelector = { valor: string; etiqueta: string };

export function Selector({
  valor,
  alCambiar,
  opciones,
  etiqueta,
}: {
  valor: string;
  alCambiar: (valor: string) => void;
  opciones: OpcionSelector[];
  etiqueta: string;
}) {
  return (
    <span className="selector">
      <select
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        aria-label={etiqueta}
      >
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" />
    </span>
  );
}

export type OpcionSegmentada = {
  valor: string;
  etiqueta: string;
  cantidad?: number;
  icono?: LucideIcon;
};

export function ControlSegmentado({
  valor,
  alCambiar,
  opciones,
  etiqueta,
  variante = "normal",
}: {
  valor: string;
  alCambiar: (valor: string) => void;
  opciones: OpcionSegmentada[];
  etiqueta: string;
  variante?: "normal" | "fichas";
}) {
  return (
    <div
      className={`control_segmentado segmentado_${variante}`}
      role="radiogroup"
      aria-label={etiqueta}
    >
      {opciones.map((opcion) => {
        const Icono = opcion.icono;
        const activo = opcion.valor === valor;
        return (
          <button
            key={opcion.valor}
            type="button"
            role="radio"
            aria-checked={activo}
            className={`segmento ${activo ? "segmento_activo" : ""}`}
            onClick={() => alCambiar(opcion.valor)}
          >
            {Icono && <Icono aria-hidden="true" />}
            <span>{opcion.etiqueta}</span>
            {opcion.cantidad !== undefined && (
              <span className="segmento_cantidad">{opcion.cantidad}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Buscador({
  valor,
  alCambiar,
  marcador,
  etiqueta,
}: {
  valor: string;
  alCambiar: (valor: string) => void;
  marcador: string;
  etiqueta: string;
}) {
  return (
    <div className="buscador">
      <Search aria-hidden="true" />
      <input
        type="search"
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        placeholder={marcador}
        aria-label={etiqueta}
      />
      {valor && (
        <button
          type="button"
          className="buscador_limpiar"
          onClick={() => alCambiar("")}
          aria-label="Limpiar búsqueda"
        >
          <X />
        </button>
      )}
    </div>
  );
}

export type DatoDefinicion = { etiqueta: string; valor: ReactNode; detalle?: string | undefined };

export function ListaDatos({
  datos,
  columnas = 2,
}: {
  datos: DatoDefinicion[];
  columnas?: 1 | 2 | 3;
}) {
  return (
    <dl className={`lista_datos columnas_${columnas}`}>
      {datos.map((dato) => (
        <div key={dato.etiqueta} className="lista_datos_item">
          <dt>{dato.etiqueta}</dt>
          <dd>
            {dato.valor}
            {dato.detalle && <small>{dato.detalle}</small>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Aviso({
  tono,
  icono: Icono,
  children,
}: {
  tono: "info" | "alerta" | "exito" | "error";
  icono: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className={`aviso aviso_${tono}`}>
      <Icono aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
