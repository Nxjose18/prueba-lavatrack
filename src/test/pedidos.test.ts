import { describe, expect, it } from "vitest";

import {
  filtrarCantidad,
  filtrarMonto,
  filtrarSoloLetras,
  formatearCelular,
} from "@/lib/filtros_entrada";
import { generarMatrizQr } from "@/lib/pagos";
import { autenticar } from "@/lib/usuarios";
import {
  agruparPor,
  anteriorEtapa,
  buscarClientePorContacto,
  calcularDescuento,
  enmascararDocumento,
  esRucValido,
  siguienteEtapaPedido,
  calcularEstadoPago,
  calcularTotalServicio,
  calcularUrgencia,
  esCelularValido,
  esDocumentoValido,
  filtrarPedidosEntregados,
  filtrarPorTexto,
  generarCodigoPedido,
  pedidosDemo,
  siguienteEtapa,
  type FiltrosEntregados,
} from "@/lib/pedidos";

const filtrosBase: FiltrosEntregados = {
  texto: "",
  estadoPago: "Todos",
  medioPago: "Todos",
  desde: "",
  hasta: "",
};

describe("Filtros operativos de pedidos", () => {
  it("busca por código, cliente, teléfono y nombre de prenda sin importar tildes", () => {
    const resultados = filtrarPorTexto(pedidosDemo, "camisa", (pedido) => [
      pedido.codigo,
      pedido.cliente,
      pedido.telefono,
      ...pedido.prendas.map((prenda) => prenda.nombre),
    ]);
    expect(resultados.map((pedido) => pedido.codigo)).toEqual(["LF-0418", "LF-0412"]);

    const sinTilde = filtrarPorTexto(pedidosDemo, "nunez", (pedido) => [pedido.cliente]);
    expect(sinTilde.map((pedido) => pedido.codigo)).toEqual(["LF-0416"]);
  });

  it("filtra entregados por rango exacto de fechas y estado de pago", () => {
    const resultados = filtrarPedidosEntregados(pedidosDemo, {
      ...filtrosBase,
      estadoPago: "Adelanto",
      medioPago: "Transferencia",
      desde: "2026-11-12",
      hasta: "2026-11-12",
    });
    expect(resultados.map((pedido) => pedido.codigo)).toEqual(["LF-0413"]);
  });

  it("filtra entregados por medio de pago del adelanto o del saldo", () => {
    expect(
      filtrarPedidosEntregados(pedidosDemo, { ...filtrosBase, medioPago: "Yape" }).map(
        (p) => p.codigo,
      ),
    ).toEqual(["LF-0414"]);
    expect(
      filtrarPedidosEntregados(pedidosDemo, { ...filtrosBase, medioPago: "Plin" }).map(
        (p) => p.codigo,
      ),
    ).toEqual(["LF-0413"]);
  });

  it("busca entregados por medio de pago escrito en el buscador", () => {
    const resultados = filtrarPedidosEntregados(pedidosDemo, { ...filtrosBase, texto: "Plin" });
    expect(resultados.map((pedido) => pedido.codigo)).toEqual(["LF-0413"]);
  });
});

describe("Validaciones de recepción", () => {
  it("acepta solo 8 dígitos para DNI y 11 para RUC", () => {
    expect(esDocumentoValido("DNI", "12345678")).toBe(true);
    expect(esDocumentoValido("DNI", "1234567")).toBe(false);
    expect(esDocumentoValido("RUC", "20123456789")).toBe(true);
    expect(esDocumentoValido("RUC", "2012345678")).toBe(false);
    expect(esDocumentoValido("DNI", "1234AB78")).toBe(false);
  });

  it("exige celular de 9 dígitos que empiece en 9, permitiendo espacios visuales", () => {
    expect(esCelularValido("987 654 321")).toBe(true);
    expect(esCelularValido("98765432")).toBe(false);
    expect(esCelularValido("987654321X")).toBe(false);
    expect(esCelularValido("187 654 321")).toBe(false);
  });

  it("valida RUC y enmascara documentos en listados", () => {
    expect(esRucValido("20604578123")).toBe(true);
    expect(esRucValido("30604578123")).toBe(false);
    expect(enmascararDocumento("71823456")).toBe("•••••456");
    expect(enmascararDocumento("—")).toBe("Sin documento");
  });

  it("filtra cada campo mientras se escribe", () => {
    expect(filtrarSoloLetras("Ana3 María!!")).toBe("Ana María");
    expect(formatearCelular("98a7654321999")).toBe("987 654 321");
    expect(filtrarMonto("12,345")).toBe("12.34");
    expect(filtrarCantidad("2.75", true)).toBe("2.7");
    expect(filtrarCantidad("2.5", false)).toBe("25");
  });

  it("aplica descuentos y reconoce clientes ya registrados por celular", () => {
    expect(calcularDescuento(100, "frecuente")).toBe(15);
    expect(calcularDescuento(100, "ninguno")).toBe(0);
    expect(buscarClientePorContacto(pedidosDemo, "987654321", "")?.cliente).toBe("Valeria Flores");
    expect(buscarClientePorContacto(pedidosDemo, "900000000", "")).toBeNull();
  });

  it("calcula importes del catálogo respetando mínimos por peso", () => {
    expect(calcularTotalServicio("ropa_peso", 2)).toBe(12);
    expect(calcularTotalServicio("ropa_peso", 3)).toBe(13.5);
    expect(calcularTotalServicio("toallas_peso", 2)).toBe(12);
    expect(calcularTotalServicio("planchado_camisa", 2)).toBe(10);
    expect(calcularTotalServicio("camisa_seco", 1)).toBe(9);
    expect(calcularTotalServicio("edredon_dos_plazas", 1)).toBe(26);
    expect(calcularTotalServicio("no_existe", 3)).toBe(0);
  });

  it("deriva el estado de pago desde el adelanto", () => {
    expect(calcularEstadoPago(50, 0)).toBe("Pendiente");
    expect(calcularEstadoPago(50, 20)).toBe("Adelanto");
    expect(calcularEstadoPago(50, 50)).toBe("Pagado");
  });

  it("genera el siguiente código correlativo", () => {
    expect(generarCodigoPedido(pedidosDemo)).toBe("LF-0419");
  });
});

describe("Flujo y prioridad", () => {
  it("avanza las etapas del proceso hasta quedar listo", () => {
    expect(siguienteEtapa("En lavado")).toBe("En secado");
    expect(siguienteEtapa("En secado")).toBe("En planchado");
    expect(siguienteEtapa("En planchado")).toBe("Control de calidad");
    expect(siguienteEtapa("Listo para entregar")).toBeNull();
    expect(anteriorEtapa("En secado")).toBe("En lavado");
    expect(anteriorEtapa("En lavado")).toBeNull();
  });

  it("salta el planchado cuando el pedido no tiene prendas de vestir", () => {
    const edredon = pedidosDemo.find((pedido) => pedido.codigo === "LF-0415");
    const camisas = pedidosDemo.find((pedido) => pedido.codigo === "LF-0412");
    if (!edredon || !camisas) throw new Error("Faltan pedidos de ejemplo");
    expect(siguienteEtapaPedido({ ...edredon, estado: "En secado" })).toBe("Control de calidad");
    expect(siguienteEtapaPedido({ ...camisas, estado: "En secado" })).toBe("En planchado");
  });

  it("clasifica la urgencia según la fecha comprometida", () => {
    expect(calcularUrgencia("2026-11-13", "2026-11-14")).toBe("vencido");
    expect(calcularUrgencia("2026-11-14", "2026-11-14")).toBe("hoy");
    expect(calcularUrgencia("2026-11-15", "2026-11-14")).toBe("manana");
    expect(calcularUrgencia("2026-11-20", "2026-11-14")).toBe("a_tiempo");
  });

  it("genera un QR simulado estable con los tres patrones de posición", () => {
    const matriz = generarMatrizQr("Yape|LF-0419|20");
    expect(matriz).toHaveLength(25);
    expect(generarMatrizQr("Yape|LF-0419|20")).toEqual(matriz);
    expect(matriz[0]?.slice(0, 7).every(Boolean)).toBe(true);
    expect(matriz[3]?.[3]).toBe(true);
  });

  it("autentica solo con usuario y contraseña correctos", () => {
    expect(autenticar("admin", "lava2026")?.rol).toBe("administrador");
    expect(autenticar("ADMIN ", "lava2026")?.rol).toBe("administrador");
    expect(autenticar("admin", "otra")).toBeNull();
  });

  it("agrupa conservando el orden de aparición", () => {
    const grupos = agruparPor(pedidosDemo, (pedido) => pedido.tipoEntrega);
    expect(grupos.map((grupo) => grupo.clave)).toEqual(["tienda", "domicilio"]);
  });
});
