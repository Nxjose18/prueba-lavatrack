import { useEffect, useRef, useState } from "react";
import {
  Banknote,
  BadgeCheck,
  CreditCard,
  Landmark,
  LoaderCircle,
  QrCode,
  RefreshCw,
  Smartphone,
  Undo2,
  type LucideIcon,
} from "lucide-react";

import { CampoFormulario, ControlSegmentado } from "./elementos";
import { formatearMoneda } from "@/lib/formato";
import { filtrarMonto, filtrarSoloDigitos } from "@/lib/filtros_entrada";
import {
  calcularVuelto,
  datosCobroNegocio,
  generarMatrizQr,
  generarNumeroOperacion,
  sugerirBilletes,
} from "@/lib/pagos";
import { mediosPago, type MedioPago, type PagoRegistrado } from "@/lib/pedidos";

const iconosMedio: Record<MedioPago, LucideIcon> = {
  Efectivo: Banknote,
  Yape: Smartphone,
  Plin: QrCode,
  Tarjeta: CreditCard,
  Transferencia: Landmark,
};

const DURACION_POS_MS = 1600;

type Etapa = "inicial" | "esperando" | "procesando";

export function CodigoQr({ texto, tono }: { texto: string; tono: "yape" | "plin" | "orden" }) {
  const matriz = generarMatrizQr(texto);
  const tamano = matriz.length;
  return (
    <svg
      className={`codigo_qr qr_${tono}`}
      viewBox={`-2 -2 ${tamano + 4} ${tamano + 4}`}
      role="img"
      aria-label={`Código QR simulado para ${texto}`}
    >
      <rect x={-2} y={-2} width={tamano + 4} height={tamano + 4} className="codigo_qr_fondo" />
      {matriz.flatMap((fila, y) =>
        fila.map((activo, x) =>
          activo ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} /> : null,
        ),
      )}
    </svg>
  );
}

export function SimuladorPago({
  importe,
  referencia,
  pago,
  alRegistrar,
  titulo = "Medio de pago",
}: {
  importe: number;
  referencia: string;
  pago: PagoRegistrado | null;
  alRegistrar: (pago: PagoRegistrado | null) => void;
  titulo?: string;
}) {
  const [medio, setMedio] = useState<MedioPago>(pago?.medio ?? "Efectivo");
  const [etapa, setEtapa] = useState<Etapa>("inicial");
  const [recibido, setRecibido] = useState("");
  const [operacionManual, setOperacionManual] = useState("");
  const [tipoTarjeta, setTipoTarjeta] = useState("debito");
  const [versionQr, setVersionQr] = useState(0);

  // Se guarda en una referencia para que el temporizador del POS no se reinicie en cada render del padre.
  const registrarRef = useRef(alRegistrar);
  registrarRef.current = alRegistrar;

  useEffect(() => {
    if (etapa !== "procesando") return undefined;
    const temporizador = window.setTimeout(() => {
      registrarRef.current({
        medio: "Tarjeta",
        importe,
        operacion: generarNumeroOperacion("Tarjeta", referencia),
      });
      setEtapa("inicial");
    }, DURACION_POS_MS);
    return () => window.clearTimeout(temporizador);
  }, [etapa, importe, referencia]);

  const cambiarMedio = (valor: string) => {
    setMedio(valor as MedioPago);
    setEtapa("inicial");
    setRecibido("");
    setOperacionManual("");
    alRegistrar(null);
  };

  const registrar = (operacion: string, vuelto?: number) =>
    alRegistrar({ medio, importe, operacion, vuelto });

  if (pago) {
    return (
      <div className="pago_registrado" role="status">
        <span className="pago_registrado_icono" aria-hidden="true">
          <BadgeCheck />
        </span>
        <div>
          <strong>
            Pago de {formatearMoneda(pago.importe)} por {pago.medio} registrado
          </strong>
          <span>
            N.° de operación <b>{pago.operacion}</b>
            {pago.vuelto ? ` · Vuelto ${formatearMoneda(pago.vuelto)}` : ""}
          </span>
        </div>
        <button
          type="button"
          className="boton boton_fantasma boton_pequeno"
          onClick={() => cambiarMedio(pago.medio)}
        >
          <Undo2 />
          Anular
        </button>
      </div>
    );
  }

  const montoRecibido = Number(recibido) || 0;
  const tonoQr = medio === "Yape" ? "yape" : "plin";

  return (
    <div className="simulador_pago">
      <fieldset className="grupo_campos">
        <legend>{titulo}</legend>
        <ControlSegmentado
          etiqueta={titulo}
          variante="fichas"
          valor={medio}
          alCambiar={cambiarMedio}
          opciones={mediosPago.map((item) => ({
            valor: item,
            etiqueta: item,
            icono: iconosMedio[item],
          }))}
        />
      </fieldset>

      <div className="simulador_pago_cuerpo">
        <div className="simulador_pago_importe">
          <span>Importe a cobrar</span>
          <strong>{formatearMoneda(importe)}</strong>
        </div>

        {medio === "Efectivo" && (
          <div className="pila_contenido">
            <div className="rejilla_campos">
              <CampoFormulario
                etiqueta="Monto recibido (S/)"
                ayuda="Solo números, hasta 2 decimales"
              >
                <input
                  className="entrada"
                  inputMode="decimal"
                  value={recibido}
                  onChange={(evento) => setRecibido(filtrarMonto(evento.target.value))}
                  placeholder={importe.toFixed(2)}
                />
              </CampoFormulario>
              <CampoFormulario etiqueta="Billetes frecuentes" agrupaControles>
                <div className="lista_fichas">
                  {sugerirBilletes(importe).map((monto) => (
                    <button
                      key={monto}
                      type="button"
                      className="ficha_accion"
                      onClick={() => setRecibido(monto.toFixed(2))}
                    >
                      {monto === Number(importe.toFixed(2)) ? "Exacto" : formatearMoneda(monto)}
                    </button>
                  ))}
                </div>
              </CampoFormulario>
            </div>
            <div className="simulador_vuelto">
              <span>Vuelto</span>
              <strong>{formatearMoneda(calcularVuelto(importe, montoRecibido))}</strong>
            </div>
            <button
              type="button"
              className="boton boton_primario"
              disabled={montoRecibido < importe}
              onClick={() =>
                registrar(
                  generarNumeroOperacion("Efectivo", referencia),
                  calcularVuelto(importe, montoRecibido),
                )
              }
            >
              <Banknote />
              Registrar pago en efectivo
            </button>
          </div>
        )}

        {(medio === "Yape" || medio === "Plin") &&
          (etapa === "inicial" ? (
            <button
              type="button"
              className="boton boton_primario"
              onClick={() => setEtapa("esperando")}
            >
              <QrCode />
              Generar QR de {medio}
            </button>
          ) : (
            <div className={`tarjeta_qr tarjeta_qr_${tonoQr}`}>
              <CodigoQr texto={`${medio}|${referencia}|${importe}|${versionQr}`} tono={tonoQr} />
              <div className="tarjeta_qr_texto">
                <p className="texto_etiqueta">{medio} · Simulación</p>
                <strong>{formatearMoneda(importe)}</strong>
                <span>{datosCobroNegocio.titular}</span>
                <span>Celular {datosCobroNegocio.celular}</span>
                <p className="tarjeta_qr_estado">
                  <LoaderCircle className="icono_girando" aria-hidden="true" />
                  Esperando que el cliente escanee y pague
                </p>
                <div className="lista_fichas">
                  <button
                    type="button"
                    className="boton boton_exito boton_pequeno"
                    onClick={() => registrar(generarNumeroOperacion(medio, referencia))}
                  >
                    <BadgeCheck />
                    Simular pago recibido
                  </button>
                  <button
                    type="button"
                    className="boton boton_secundario boton_pequeno"
                    onClick={() => setVersionQr((actual) => actual + 1)}
                  >
                    <RefreshCw />
                    Regenerar
                  </button>
                </div>
              </div>
            </div>
          ))}

        {medio === "Tarjeta" && (
          <div className="pila_contenido">
            <ControlSegmentado
              etiqueta="Tipo de tarjeta"
              valor={tipoTarjeta}
              alCambiar={setTipoTarjeta}
              opciones={[
                { valor: "debito", etiqueta: "Débito" },
                { valor: "credito", etiqueta: "Crédito" },
              ]}
            />
            {etapa === "procesando" ? (
              <p className="tarjeta_pos" role="status">
                <LoaderCircle className="icono_girando" aria-hidden="true" />
                Procesando en el POS… pide al cliente acercar o insertar su tarjeta.
              </p>
            ) : (
              <button
                type="button"
                className="boton boton_primario"
                onClick={() => setEtapa("procesando")}
              >
                <CreditCard />
                Enviar {formatearMoneda(importe)} al POS
              </button>
            )}
            <small className="campo_ayuda">
              Simulación: no se ingresan datos de la tarjeta en el sistema.
            </small>
          </div>
        )}

        {medio === "Transferencia" && (
          <div className="pila_contenido">
            <dl className="lista_datos columnas_2">
              {[
                { etiqueta: "Titular", valor: datosCobroNegocio.titular },
                { etiqueta: datosCobroNegocio.banco, valor: datosCobroNegocio.cuenta },
              ].map((dato) => (
                <div key={dato.etiqueta} className="lista_datos_item">
                  <dt>{dato.etiqueta}</dt>
                  <dd>{dato.valor}</dd>
                </div>
              ))}
            </dl>
            <CampoFormulario etiqueta="N.° de operación del voucher" ayuda="Entre 6 y 12 dígitos">
              <input
                className="entrada"
                inputMode="numeric"
                value={operacionManual}
                onChange={(evento) =>
                  setOperacionManual(filtrarSoloDigitos(evento.target.value, 12))
                }
                placeholder="Ej. 00451287"
              />
            </CampoFormulario>
            <button
              type="button"
              className="boton boton_primario"
              disabled={operacionManual.length < 6}
              onClick={() => registrar(`TR-${operacionManual}`)}
            >
              <Landmark />
              Registrar transferencia
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
