import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CircleAlert, ArrowLeft, ArrowRight, Check, type LucideIcon } from "lucide-react";

import { VentanaFlotante } from "./ventana_flotante";
import { relleno } from "@/lib/formato";

export type PasoAsistente = {
  id: string;
  titulo: string;
  descripcion: string;
  icono: LucideIcon;
  contenido: ReactNode;
  /** Devuelve un mensaje de error si el paso no está completo, o null si puede avanzar. */
  validar?: (() => string | null) | undefined;
};

export type AccionFinalAsistente = {
  etiqueta: string;
  icono: LucideIcon;
  alConfirmar: () => void;
  tono?: "primario" | "exito" | "alerta" | undefined;
};

type PropsAsistentePasos = {
  abierto: boolean;
  alCerrar: () => void;
  titulo: string;
  etiquetaSuperior: string;
  icono: LucideIcon;
  pasos: PasoAsistente[];
  accionFinal: AccionFinalAsistente;
  resumenLateral?: ReactNode;
  /** Cuando existe, reemplaza los pasos por la vista de resultado. */
  completado?: ReactNode;
};

type Direccion = "adelante" | "atras";

export function AsistentePasos({
  abierto,
  alCerrar,
  titulo,
  etiquetaSuperior,
  icono,
  pasos,
  accionFinal,
  resumenLateral,
  completado,
}: PropsAsistentePasos) {
  const [pasoActual, setPasoActual] = useState(0);
  const [pasoMaximo, setPasoMaximo] = useState(0);
  const [direccion, setDireccion] = useState<Direccion>("adelante");
  const [error, setError] = useState<string | null>(null);
  const [intentosFallidos, setIntentosFallidos] = useState(0);

  useEffect(() => {
    if (!abierto) return;
    setPasoActual(0);
    setPasoMaximo(0);
    setDireccion("adelante");
    setError(null);
  }, [abierto]);

  const paso = pasos[pasoActual];
  const esUltimo = pasoActual === pasos.length - 1;
  const progreso = ((pasoActual + 1) / pasos.length) * 100;
  const IconoFinal = accionFinal.icono;

  const marcarError = (mensaje: string) => {
    setError(mensaje);
    setIntentosFallidos((actual) => actual + 1);
  };

  const irA = (destino: number) => {
    if (destino < 0 || destino >= pasos.length || destino === pasoActual) return;
    if (destino > pasoActual) {
      for (let indice = pasoActual; indice < destino; indice++) {
        const mensaje = pasos[indice]?.validar?.() ?? null;
        if (mensaje) {
          if (indice !== pasoActual) {
            setDireccion("atras");
            setPasoActual(indice);
          }
          marcarError(mensaje);
          return;
        }
      }
    }
    setError(null);
    setDireccion(destino > pasoActual ? "adelante" : "atras");
    setPasoActual(destino);
    setPasoMaximo((actual) => Math.max(actual, destino));
  };

  const confirmar = () => {
    const mensaje = paso?.validar?.() ?? null;
    if (mensaje) {
      marcarError(mensaje);
      return;
    }
    setError(null);
    accionFinal.alConfirmar();
  };

  const alEnviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (esUltimo) confirmar();
    else irA(pasoActual + 1);
  };

  const pie = completado ? null : (
    <div className="asistente_pie">
      <button type="button" className="boton boton_fantasma" onClick={alCerrar}>
        Cancelar
      </button>
      <div className="asistente_pie_acciones">
        <button
          type="button"
          className="boton boton_secundario"
          onClick={() => irA(pasoActual - 1)}
          disabled={pasoActual === 0}
        >
          <ArrowLeft />
          Anterior
        </button>
        {esUltimo ? (
          <button
            type="submit"
            form="formulario_asistente"
            className={`boton boton_${accionFinal.tono ?? "primario"}`}
          >
            <IconoFinal />
            {accionFinal.etiqueta}
          </button>
        ) : (
          <button type="submit" form="formulario_asistente" className="boton boton_primario">
            Siguiente
            <ArrowRight />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <VentanaFlotante
      abierta={abierto}
      alCerrar={alCerrar}
      titulo={titulo}
      etiquetaSuperior={etiquetaSuperior}
      icono={icono}
      tamano="grande"
      pie={pie}
    >
      {completado ? (
        <div className="asistente_completado">{completado}</div>
      ) : (
        <div className="asistente_estructura">
          <aside className="asistente_riel" aria-label="Pasos del recorrido">
            <ol className="asistente_lista_pasos">
              {pasos.map((elemento, indice) => {
                const IconoPaso = elemento.icono;
                const estado =
                  indice === pasoActual ? "activo" : indice < pasoActual ? "hecho" : "pendiente";
                return (
                  <li key={elemento.id} className={`asistente_item asistente_item_${estado}`}>
                    <button
                      type="button"
                      className="asistente_item_boton"
                      onClick={() => irA(indice)}
                      disabled={indice > pasoMaximo + 1}
                      aria-current={estado === "activo" ? "step" : undefined}
                    >
                      <span className="asistente_item_marca" aria-hidden="true">
                        {estado === "hecho" ? <Check /> : <IconoPaso />}
                      </span>
                      <span className="asistente_item_texto">
                        <small>Paso {relleno(indice + 1)}</small>
                        <strong>{elemento.titulo}</strong>
                        <span>{elemento.descripcion}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {resumenLateral && <div className="asistente_resumen">{resumenLateral}</div>}
          </aside>

          <form
            id="formulario_asistente"
            className="asistente_contenido"
            onSubmit={alEnviar}
            noValidate
          >
            <div className="asistente_progreso" aria-hidden="true">
              <span style={{ width: `${progreso}%` }} />
            </div>
            <div className="asistente_contador">
              <span>
                Paso <strong>{pasoActual + 1}</strong> de {pasos.length}
              </span>
              <span className="asistente_puntos" aria-hidden="true">
                {pasos.map((elemento, indice) => (
                  <span key={elemento.id} className={indice <= pasoActual ? "punto_activo" : ""} />
                ))}
              </span>
            </div>
            {paso && (
              <section
                key={paso.id}
                className={`asistente_panel asistente_panel_${direccion}`}
                aria-labelledby={`titulo_${paso.id}`}
              >
                <header className="asistente_panel_encabezado">
                  <h3 id={`titulo_${paso.id}`}>{paso.titulo}</h3>
                  <p>{paso.descripcion}</p>
                </header>
                {paso.contenido}
              </section>
            )}
            {error && (
              <p key={intentosFallidos} className="aviso aviso_error aviso_sacudida" role="alert">
                <CircleAlert />
                {error}
              </p>
            )}
          </form>
        </div>
      )}
    </VentanaFlotante>
  );
}
