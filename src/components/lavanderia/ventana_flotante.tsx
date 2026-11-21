import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, type LucideIcon } from "lucide-react";

const DURACION_SALIDA_MS = 220;
const SELECTOR_ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type PropsVentanaFlotante = {
  abierta: boolean;
  alCerrar: () => void;
  titulo: string;
  etiquetaSuperior?: string | undefined;
  descripcion?: string | undefined;
  icono?: LucideIcon | undefined;
  tamano?: "mediana" | "grande" | undefined;
  pie?: ReactNode;
  children: ReactNode;
};

/**
 * Controla el montaje en dos fases: al cerrar se mantiene el nodo en pantalla
 * el tiempo de la animación de salida y luego se desmonta.
 */
function usarPresenciaAnimada(abierta: boolean) {
  const [montada, setMontada] = useState(abierta);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (abierta) {
      setMontada(true);
      setSaliendo(false);
      return undefined;
    }
    if (!montada) return undefined;
    setSaliendo(true);
    const temporizador = window.setTimeout(() => {
      setMontada(false);
      setSaliendo(false);
    }, DURACION_SALIDA_MS);
    return () => window.clearTimeout(temporizador);
  }, [abierta, montada]);

  return { montada, saliendo };
}

export function VentanaFlotante({
  abierta,
  alCerrar,
  titulo,
  etiquetaSuperior,
  descripcion,
  icono: Icono,
  tamano = "mediana",
  pie,
  children,
}: PropsVentanaFlotante) {
  const { montada, saliendo } = usarPresenciaAnimada(abierta);
  const panelRef = useRef<HTMLDivElement>(null);
  const idTitulo = useId();
  const idDescripcion = useId();
  const alCerrarRef = useRef(alCerrar);
  alCerrarRef.current = alCerrar;

  useEffect(() => {
    if (!montada || saliendo) return undefined;
    const enfocadoAntes = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const primerCampo =
      panelRef.current?.querySelector<HTMLElement>("[data-autofoco]") ?? panelRef.current;
    primerCampo?.focus({ preventScroll: true });

    // Mantiene el foco del teclado dentro de la ventana mientras está abierta.
    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        alCerrarRef.current();
        return;
      }
      if (evento.key !== "Tab" || !panelRef.current) return;
      const enfocables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES),
      );
      const primero = enfocables[0];
      const ultimo = enfocables.at(-1);
      if (!primero || !ultimo) return;
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", alPresionarTecla);
    return () => {
      document.removeEventListener("keydown", alPresionarTecla);
      document.body.style.overflow = overflowAnterior;
      enfocadoAntes?.focus?.({ preventScroll: true });
    };
  }, [montada, saliendo]);

  if (!montada || typeof document === "undefined") return null;

  const estadoAnimacion = saliendo ? "cerrando" : "abierta";

  return createPortal(
    <div className="ventana_capa" data-estado={estadoAnimacion}>
      <div className="ventana_fondo" aria-hidden="true" onClick={alCerrar} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descripcion ? idDescripcion : undefined}
        tabIndex={-1}
        className={`ventana_panel ventana_${tamano}`}
      >
        <header className="ventana_encabezado">
          {Icono && (
            <span className="ventana_icono" aria-hidden="true">
              <Icono />
            </span>
          )}
          <div className="ventana_titulos">
            {etiquetaSuperior && <p className="texto_etiqueta">{etiquetaSuperior}</p>}
            <h2 id={idTitulo}>{titulo}</h2>
            {descripcion && <p id={idDescripcion}>{descripcion}</p>}
          </div>
          <button
            type="button"
            className="ventana_cerrar"
            onClick={alCerrar}
            aria-label="Cerrar ventana"
          >
            <X />
          </button>
        </header>
        <div className="ventana_cuerpo">{children}</div>
        {pie && <footer className="ventana_pie">{pie}</footer>}
      </div>
    </div>,
    document.body,
  );
}
