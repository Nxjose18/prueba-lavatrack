export type IdPanel = "recepcion" | "control" | "entregas" | "historial";
export type RolUsuario = "administrador" | "recepcion" | "taller" | "repartidor";

export type DefinicionRol = {
  id: RolUsuario;
  nombre: string;
  descripcion: string;
  paneles: IdPanel[];
  /** Solo el administrador ve importes acumulados y clientes frecuentes. */
  veResumenNegocio: boolean;
};

export type UsuarioDemo = {
  usuario: string;
  clave: string;
  nombre: string;
  rol: RolUsuario;
};

export type SesionUsuario = Omit<UsuarioDemo, "clave"> & { inicio: number };

export const roles: DefinicionRol[] = [
  {
    id: "administrador",
    nombre: "Administrador",
    descripcion: "Dueño del negocio: ve todos los paneles y el resumen de ingresos.",
    paneles: ["recepcion", "control", "entregas", "historial"],
    veResumenNegocio: true,
  },
  {
    id: "recepcion",
    nombre: "Recepción",
    descripcion: "Atiende el mostrador: recibe pedidos y entrega en tienda.",
    paneles: ["recepcion", "entregas", "historial"],
    veResumenNegocio: false,
  },
  {
    id: "taller",
    nombre: "Taller",
    descripcion: "Lava, seca, plancha y controla la calidad de las prendas.",
    paneles: ["control"],
    veResumenNegocio: false,
  },
  {
    id: "repartidor",
    nombre: "Repartidor",
    descripcion: "Sale a ruta y registra las entregas a domicilio.",
    paneles: ["entregas"],
    veResumenNegocio: false,
  },
];

/** Cuentas ficticias solo para la prueba con usuarios; no existen fuera de esta página. */
export const usuariosDemo: UsuarioDemo[] = [
  { usuario: "admin", clave: "lava2026", nombre: "Rosa Mendoza", rol: "administrador" },
  { usuario: "recepcion", clave: "mostrador1", nombre: "Lucía Paz", rol: "recepcion" },
  { usuario: "taller", clave: "lavado123", nombre: "Carlos Ríos", rol: "taller" },
  { usuario: "pedro.quispe", clave: "ruta2026", nombre: "Pedro Quispe", rol: "repartidor" },
];

export const INTENTOS_PERMITIDOS = 3;
export const SEGUNDOS_BLOQUEO = 30;

export function buscarRol(rol: RolUsuario) {
  return roles.find((item) => item.id === rol) ?? (roles[0] as DefinicionRol);
}

export function autenticar(usuario: string, clave: string): SesionUsuario | null {
  const encontrado = usuariosDemo.find(
    (item) => item.usuario === usuario.trim().toLowerCase() && item.clave === clave,
  );
  if (!encontrado) return null;
  return {
    usuario: encontrado.usuario,
    nombre: encontrado.nombre,
    rol: encontrado.rol,
    inicio: Date.now(),
  };
}

export function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}
