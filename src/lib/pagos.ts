import type { MedioPago } from "./pedidos";

/** Datos ficticios del negocio que aparecen en los cobros simulados. */
export const datosCobroNegocio = {
  titular: "Lavandería San Borja",
  celular: "987 000 111",
  banco: "Banco de prueba",
  cuenta: "191-0000000-0-00",
  cci: "002-191-000000000000-00",
};

function semillaDeTexto(texto: string) {
  let semilla = 2166136261;
  for (const caracter of texto) {
    semilla ^= caracter.charCodeAt(0);
    semilla = Math.imul(semilla, 16777619);
  }
  return semilla >>> 0;
}

function crearAleatorio(semilla: number) {
  let estado = semilla || 1;
  return () => {
    estado ^= estado << 13;
    estado ^= estado >>> 17;
    estado ^= estado << 5;
    return (estado >>> 0) / 4294967296;
  };
}

const prefijosOperacion: Record<MedioPago, string> = {
  Efectivo: "EF",
  Yape: "YP",
  Plin: "PL",
  Tarjeta: "AU",
  Transferencia: "TR",
};

export function generarNumeroOperacion(medio: MedioPago, referencia: string) {
  const aleatorio = crearAleatorio(semillaDeTexto(`${medio}-${referencia}-${Date.now()}`));
  const numero = Array.from({ length: 8 }, () => Math.floor(aleatorio() * 10)).join("");
  return `${prefijosOperacion[medio]}-${numero}`;
}

/**
 * Matriz con apariencia de código QR (patrones de posición y módulos derivados
 * del texto). Es solo una simulación visual: no es un QR escaneable.
 */
export function generarMatrizQr(texto: string, tamano = 25) {
  const aleatorio = crearAleatorio(semillaDeTexto(texto));
  const matriz = Array.from({ length: tamano }, () =>
    Array.from({ length: tamano }, () => aleatorio() > 0.52),
  );
  const esquinas = [
    [0, 0],
    [0, tamano - 7],
    [tamano - 7, 0],
  ] as const;
  for (const [fila, columna] of esquinas) {
    for (let y = -1; y <= 7; y++) {
      for (let x = -1; x <= 7; x++) {
        const filaReal = fila + y;
        const columnaReal = columna + x;
        if (filaReal < 0 || columnaReal < 0 || filaReal >= tamano || columnaReal >= tamano)
          continue;
        const borde = y === 0 || y === 6 || x === 0 || x === 6;
        const centro = y >= 2 && y <= 4 && x >= 2 && x <= 4;
        const fuera = y < 0 || y > 6 || x < 0 || x > 6;
        const filaMatriz = matriz[filaReal];
        if (filaMatriz) filaMatriz[columnaReal] = !fuera && (borde || centro);
      }
    }
  }
  for (let indice = 8; indice < tamano - 8; indice++) {
    const filaTiempo = matriz[6];
    if (filaTiempo) filaTiempo[indice] = indice % 2 === 0;
    const filaColumna = matriz[indice];
    if (filaColumna) filaColumna[6] = indice % 2 === 0;
  }
  return matriz;
}

export function calcularVuelto(importe: number, recibido: number) {
  return Number(Math.max(0, recibido - importe).toFixed(2));
}

/** Billetes habituales para sugerir el monto recibido en efectivo. */
export function sugerirBilletes(importe: number) {
  const billetes = [10, 20, 50, 100, 200];
  const exacto = Number(importe.toFixed(2));
  const sugeridos = billetes.filter((billete) => billete > exacto).slice(0, 3);
  return [exacto, ...sugeridos];
}
