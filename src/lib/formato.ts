const formatoMoneda = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatearMoneda(valor: number) {
  return `S/ ${formatoMoneda.format(valor)}`;
}

function crearFecha(fecha: string) {
  return new Date(`${fecha}T12:00:00`);
}

export function formatearFecha(fecha: string) {
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" })
    .format(crearFecha(fecha))
    .replace(".", "");
}

export function formatearFechaLarga(fecha: string) {
  if (!fecha) return "—";
  const texto = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(crearFecha(fecha));
  return texto.charAt(0).toLocaleUpperCase("es") + texto.slice(1);
}

export function formatearFechaCompleta(fecha: string) {
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(crearFecha(fecha));
}

export function obtenerFechaHoy() {
  const fecha = new Date();
  const desfaseLocal = fecha.getTimezoneOffset() * 60_000;
  return new Date(fecha.getTime() - desfaseLocal).toISOString().slice(0, 10);
}

export function sumarDias(fecha: string, dias: number) {
  const resultado = new Date(`${fecha}T12:00:00Z`);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado.toISOString().slice(0, 10);
}

export function relleno(numero: number, digitos = 2) {
  return String(numero).padStart(digitos, "0");
}
