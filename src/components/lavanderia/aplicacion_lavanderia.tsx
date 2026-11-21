import { useEffect, useState } from "react";
import {
  CalendarDays,
  ClipboardCheck,
  FlaskConical,
  History,
  LogOut,
  MapPin,
  PackageCheck,
  Plus,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";

import { PantallaAcceso } from "./pantalla_acceso";
import { PantallaControl } from "./pantallas/pantalla_control";
import { PantallaEntregas } from "./pantallas/pantalla_entregas";
import { PantallaHistorial } from "./pantallas/pantalla_historial";
import { PantallaRecepcion } from "./pantallas/pantalla_recepcion";
import { diferenciaDias, desplazarFechasPedidos, pedidosDemo, type Pedido } from "@/lib/pedidos";
import { formatearFechaLarga, obtenerFechaHoy, relleno } from "@/lib/formato";
import { buscarRol, iniciales, type IdPanel, type SesionUsuario } from "@/lib/usuarios";

type DefinicionPantalla = {
  id: IdPanel;
  etiqueta: string;
  descripcion: string;
  icono: LucideIcon;
  contarPendientes: (pedidos: Pedido[]) => number;
};

const pantallas: DefinicionPantalla[] = [
  {
    id: "recepcion",
    etiqueta: "Recepción",
    descripcion: "Registra pedidos nuevos en el mostrador con un recorrido guiado.",
    icono: Plus,
    contarPendientes: () => 0,
  },
  {
    id: "control",
    etiqueta: "Control de prendas",
    descripcion:
      "Mueve cada pedido por las etapas del taller y revisa la calidad antes de entregar.",
    icono: ClipboardCheck,
    contarPendientes: (pedidos) =>
      pedidos.filter((pedido) => pedido.estado === "Control de calidad").length,
  },
  {
    id: "entregas",
    etiqueta: "Entregas",
    descripcion: "Entrega en tienda y reparto a domicilio: identifica, cobra y confirma.",
    icono: PackageCheck,
    contarPendientes: (pedidos) =>
      pedidos.filter((pedido) => ["Listo para entregar", "En ruta"].includes(pedido.estado)).length,
  },
  {
    id: "historial",
    etiqueta: "Historial de entregas",
    descripcion: "Registro de órdenes entregadas en tienda y por delivery, con filtros y detalle.",
    icono: History,
    contarPendientes: () => 0,
  },
];

/** Fecha base de los pedidos de ejemplo; se desplazan para que la prueba ocurra "hoy". */
const FECHA_REFERENCIA = "2026-11-14";

export function AplicacionLavanderia() {
  const [sesion, setSesion] = useState<SesionUsuario | null>(null);
  const [pantallaActiva, setPantallaActiva] = useState<IdPanel>("recepcion");
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosDemo);
  const [hoy, setHoy] = useState(FECHA_REFERENCIA);

  useEffect(() => {
    const fechaReal = obtenerFechaHoy();
    setHoy(fechaReal);
    setPedidos(desplazarFechasPedidos(pedidosDemo, diferenciaDias(FECHA_REFERENCIA, fechaReal)));
  }, []);

  if (!sesion) {
    return (
      <PantallaAcceso
        alIngresar={(nueva) => {
          setSesion(nueva);
          setPantallaActiva(buscarRol(nueva.rol).paneles[0] ?? "recepcion");
        }}
      />
    );
  }

  const rol = buscarRol(sesion.rol);
  const permitidas = pantallas.filter((pantalla) => rol.paneles.includes(pantalla.id));
  const definicion = permitidas.find((pantalla) => pantalla.id === pantallaActiva) ?? permitidas[0];

  const actualizarPedido = (codigo: string, cambios: Partial<Pedido>) => {
    setPedidos((actuales) =>
      actuales.map((pedido) => (pedido.codigo === codigo ? { ...pedido, ...cambios } : pedido)),
    );
  };

  const registrarPedido = (pedido: Pedido) => setPedidos((actuales) => [pedido, ...actuales]);

  const cambiarPantalla = (id: IdPanel) => {
    setPantallaActiva(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="aplicacion">
      <header className="barra_superior">
        <div className="marca" aria-label="LavaTrack">
          <span className="marca_simbolo" aria-hidden="true">
            <WashingMachine />
          </span>
          <span className="marca_nombre">
            lava<span>track</span>
          </span>
        </div>
        <span className="barra_superior_divisor" aria-hidden="true" />
        <span className="barra_superior_texto">Operaciones</span>
        <span className="etiqueta_prueba">
          <FlaskConical aria-hidden="true" />
          Prueba de usuario
        </span>
        <span className="barra_superior_fecha">
          <CalendarDays aria-hidden="true" />
          {formatearFechaLarga(hoy)}
        </span>
        <div className="sesion_usuario">
          <span className="avatar_iniciales sesion_avatar" aria-hidden="true">
            {iniciales(sesion.nombre)}
          </span>
          <span className="sesion_texto">
            <strong>{sesion.nombre}</strong>
            <small>{rol.nombre}</small>
          </span>
          <button
            type="button"
            className="boton_icono sesion_salir"
            onClick={() => setSesion(null)}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut />
          </button>
        </div>
      </header>

      <div className="area_trabajo">
        <aside className="navegacion_lateral" aria-label="Paneles">
          <p className="texto_etiqueta navegacion_titulo">Flujos de trabajo</p>
          <nav>
            <ul className="navegacion_lista">
              {permitidas.map((pantalla, indice) => {
                const Icono = pantalla.icono;
                const pendientes = pantalla.contarPendientes(pedidos);
                const activa = pantalla.id === definicion?.id;
                return (
                  <li key={pantalla.id}>
                    <button
                      type="button"
                      className={`navegacion_item ${activa ? "navegacion_item_activo" : ""}`}
                      onClick={() => cambiarPantalla(pantalla.id)}
                      aria-current={activa ? "page" : undefined}
                    >
                      <span className="navegacion_numero">{relleno(indice + 1)}</span>
                      <Icono aria-hidden="true" />
                      <span className="navegacion_texto">{pantalla.etiqueta}</span>
                      {pendientes > 0 && (
                        <span
                          className="navegacion_contador"
                          aria-label={`${pendientes} pendientes`}
                        >
                          {pendientes}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="navegacion_nota">
            <strong>Rol: {rol.nombre}</strong>
            <p>{rol.descripcion}</p>
          </div>
          <p className="navegacion_sede">
            <MapPin aria-hidden="true" />
            Sede San Borja · Lima
          </p>
        </aside>

        <main className="area_principal">
          <nav className="navegacion_movil" aria-label="Paneles">
            {permitidas.map((pantalla) => {
              const Icono = pantalla.icono;
              const activa = pantalla.id === definicion?.id;
              return (
                <button
                  key={pantalla.id}
                  type="button"
                  className={`navegacion_movil_item ${activa ? "navegacion_movil_activo" : ""}`}
                  onClick={() => cambiarPantalla(pantalla.id)}
                  aria-current={activa ? "page" : undefined}
                >
                  <Icono aria-hidden="true" />
                  {pantalla.etiqueta}
                </button>
              );
            })}
          </nav>

          <header className="encabezado_pagina">
            <div>
              <p className="migas">
                <span>Operaciones</span>
                <span aria-hidden="true">/</span>
                <span>{definicion?.etiqueta}</span>
              </p>
              <h1>{definicion?.etiqueta}</h1>
              <p className="encabezado_pagina_descripcion">{definicion?.descripcion}</p>
            </div>
          </header>

          <div key={definicion?.id} className="transicion_pantalla">
            {definicion?.id === "recepcion" && (
              <PantallaRecepcion pedidos={pedidos} hoy={hoy} alRegistrar={registrarPedido} />
            )}
            {definicion?.id === "control" && (
              <PantallaControl pedidos={pedidos} hoy={hoy} alActualizar={actualizarPedido} />
            )}
            {definicion?.id === "entregas" && (
              <PantallaEntregas
                pedidos={pedidos}
                hoy={hoy}
                sesion={sesion}
                alActualizar={actualizarPedido}
              />
            )}
            {definicion?.id === "historial" && (
              <PantallaHistorial pedidos={pedidos} hoy={hoy} sesion={sesion} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
