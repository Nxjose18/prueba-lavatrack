import type { ReactNode } from "react";
import { Camera, CircleCheck, MessageSquareWarning, Phone } from "lucide-react";

import { EtiquetaEstado, ListaDatos, MiniaturaPrenda, type DatoDefinicion } from "./elementos";
import { formatearMoneda } from "@/lib/formato";
import { SIN_OBSERVACIONES, describirPrenda, type Pedido, type Prenda } from "@/lib/pedidos";

export function CabeceraPedido({ pedido, children }: { pedido: Pedido; children?: ReactNode }) {
  return (
    <article className="cabecera_pedido">
      <div className="cabecera_pedido_identidad">
        <span className="codigo_pedido">{pedido.codigo}</span>
        <strong>{pedido.cliente}</strong>
        <a className="enlace_telefono" href={`tel:${pedido.telefono.replace(/\s/g, "")}`}>
          <Phone aria-hidden="true" />
          {pedido.telefono}
        </a>
      </div>
      <div className="cabecera_pedido_estado">
        <EtiquetaEstado estado={pedido.estado} />
        {children}
      </div>
    </article>
  );
}

export function ListaPrendasPedido({ prendas }: { prendas: Prenda[] }) {
  return (
    <ul className="lista_prendas">
      {prendas.map((prenda, indice) => {
        const conObservacion = prenda.observacion && prenda.observacion !== SIN_OBSERVACIONES;
        return (
          <li key={`${prenda.nombre}-${indice}`} className="lista_prendas_item">
            <MiniaturaPrenda nombre={prenda.nombre} />
            <div className="lista_prendas_texto">
              <strong>{describirPrenda(prenda)}</strong>
              <span>
                {prenda.color}
                {prenda.marca !== "—" ? ` · ${prenda.marca}` : ""}
              </span>
            </div>
            {conObservacion && (
              <span className="nota_observacion">
                <MessageSquareWarning aria-hidden="true" />
                {prenda.observacion}
              </span>
            )}
            {prenda.evidencias && prenda.evidencias.length > 0 && (
              <span className="nota_fotos">
                <Camera aria-hidden="true" />
                {prenda.evidencias.length} {prenda.evidencias.length === 1 ? "foto" : "fotos"}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ResumenLateralPedido({ pedido }: { pedido: Pedido }) {
  return (
    <div className="resumen_lateral">
      <p className="texto_etiqueta">Pedido</p>
      <strong className="resumen_lateral_codigo">{pedido.codigo}</strong>
      <span>{pedido.cliente}</span>
      <div className="resumen_lateral_importe">
        <span>{pedido.saldo > 0 ? "Saldo" : "Total"}</span>
        <strong>{formatearMoneda(pedido.saldo > 0 ? pedido.saldo : pedido.total)}</strong>
      </div>
    </div>
  );
}

export function VistaCompletado({
  titulo,
  descripcion,
  datos,
  acciones,
}: {
  titulo: string;
  descripcion: string;
  datos: DatoDefinicion[];
  acciones: ReactNode;
}) {
  return (
    <div className="vista_completado">
      <span className="vista_completado_icono" aria-hidden="true">
        <CircleCheck />
      </span>
      <h3>{titulo}</h3>
      <p>{descripcion}</p>
      <div className="vista_completado_datos">
        <ListaDatos datos={datos} columnas={3} />
      </div>
      <div className="vista_completado_acciones">{acciones}</div>
    </div>
  );
}
