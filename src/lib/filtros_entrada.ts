/**
 * Filtros que se aplican mientras se escribe: cada campo solo acepta los
 * caracteres que le corresponden, así el error no llega a la validación final.
 */

export function filtrarSoloLetras(valor: string, maximo = 60) {
  return valor
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+/, "")
    .slice(0, maximo);
}

export function filtrarRazonSocial(valor: string, maximo = 80) {
  return valor
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9.,&' -]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+/, "")
    .slice(0, maximo);
}

export function filtrarSoloDigitos(valor: string, maximo: number) {
  return valor.replace(/\D/g, "").slice(0, maximo);
}

/** Agrupa el celular como 999 999 999 mientras se escribe. */
export function formatearCelular(valor: string) {
  const digitos = filtrarSoloDigitos(valor, 9);
  return [digitos.slice(0, 3), digitos.slice(3, 6), digitos.slice(6, 9)].filter(Boolean).join(" ");
}

/** Montos en soles: solo dígitos y un punto decimal con hasta dos decimales. */
export function filtrarMonto(valor: string, maximo = 9999) {
  const limpio = valor.replace(",", ".").replace(/[^\d.]/g, "");
  const [entero = "", ...resto] = limpio.split(".");
  const decimales = resto.join("").slice(0, 2);
  const texto = resto.length ? `${entero.slice(0, 5)}.${decimales}` : entero.slice(0, 5);
  return Number(texto) > maximo ? String(maximo) : texto;
}

/** Cantidades: enteras para prendas y piezas, con medio kilo para pesos. */
export function filtrarCantidad(valor: string, admiteDecimales: boolean) {
  if (!admiteDecimales) return filtrarSoloDigitos(valor, 3);
  const limpio = valor.replace(",", ".").replace(/[^\d.]/g, "");
  const [entero = "", decimal] = limpio.split(".");
  return decimal === undefined
    ? entero.slice(0, 3)
    : `${entero.slice(0, 3)}.${decimal.slice(0, 1)}`;
}

/** Texto libre sin caracteres de control ni símbolos que rompan etiquetas impresas. */
export function filtrarTextoLibre(valor: string, maximo = 120) {
  return valor
    .replace(/[<>{}[\]\\^`|~]/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, maximo);
}

export function filtrarDireccion(valor: string, maximo = 100) {
  return valor
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9.,#°º/ -]/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, maximo);
}

export function filtrarUsuario(valor: string) {
  return valor
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 24);
}
