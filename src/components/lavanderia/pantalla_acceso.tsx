import { useEffect, useState, type FormEvent } from "react";
import {
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  UserRound,
  WashingMachine,
} from "lucide-react";

import { CampoFormulario } from "./elementos";
import { filtrarUsuario } from "@/lib/filtros_entrada";
import {
  INTENTOS_PERMITIDOS,
  SEGUNDOS_BLOQUEO,
  autenticar,
  type SesionUsuario,
} from "@/lib/usuarios";

export function PantallaAcceso({ alIngresar }: { alIngresar: (sesion: SesionUsuario) => void }) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState("");
  const [intentos, setIntentos] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState(0);
  const [ahora, setAhora] = useState(() => Date.now());

  const segundosRestantes = Math.max(0, Math.ceil((bloqueadoHasta - ahora) / 1000));
  const bloqueado = segundosRestantes > 0;

  useEffect(() => {
    if (!bloqueadoHasta) return undefined;
    const temporizador = window.setInterval(() => setAhora(Date.now()), 500);
    return () => window.clearInterval(temporizador);
  }, [bloqueadoHasta]);

  const ingresar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (bloqueado) return;
    if (usuario.length < 3) return setError("Ingresa tu usuario (mínimo 3 caracteres).");
    if (clave.length < 6) return setError("La contraseña tiene al menos 6 caracteres.");
    const sesion = autenticar(usuario, clave);
    if (sesion) {
      setError("");
      alIngresar(sesion);
      return;
    }
    const fallidos = intentos + 1;
    if (fallidos >= INTENTOS_PERMITIDOS) {
      setIntentos(0);
      setBloqueadoHasta(Date.now() + SEGUNDOS_BLOQUEO * 1000);
      setAhora(Date.now());
      setError(`Demasiados intentos. Espera ${SEGUNDOS_BLOQUEO} segundos para volver a intentar.`);
      return;
    }
    setIntentos(fallidos);
    setClave("");
    setError(
      `Usuario o contraseña incorrectos. Te quedan ${INTENTOS_PERMITIDOS - fallidos} intentos.`,
    );
  };

  return (
    <main className="acceso">
      <section className="acceso_marca" aria-hidden="true">
        <div className="acceso_marca_contenido">
          <span className="marca_simbolo acceso_simbolo">
            <WashingMachine />
          </span>
          <p className="acceso_marca_nombre">
            lava<span>track</span>
          </p>
          <h2>Operaciones de tu lavandería en un solo panel</h2>
          <ul className="acceso_beneficios">
            {[
              "Recepción guiada con pago por QR",
              "Control de prendas por etapas",
              "Entregas en tienda y delivery",
            ].map((texto) => (
              <li key={texto}>
                <ShieldCheck />
                {texto}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="acceso_panel" aria-labelledby="titulo_acceso">
        <form className="acceso_formulario" onSubmit={ingresar} noValidate>
          <header>
            <p className="texto_etiqueta">Acceso del personal</p>
            <h1 id="titulo_acceso">Inicia sesión</h1>
            <p className="acceso_descripcion">
              Cada rol ve solo los paneles que necesita para su trabajo.
            </p>
          </header>

          <CampoFormulario
            etiqueta="Usuario"
            obligatorio
            ayuda="Minúsculas, números, punto o guion bajo"
          >
            <span className="entrada_con_icono">
              <UserRound aria-hidden="true" />
              <input
                className="entrada"
                value={usuario}
                onChange={(evento) => setUsuario(filtrarUsuario(evento.target.value))}
                autoComplete="username"
                placeholder="tu.usuario"
                disabled={bloqueado}
                autoFocus
              />
            </span>
          </CampoFormulario>

          <CampoFormulario etiqueta="Contraseña" obligatorio>
            <span className="entrada_con_icono">
              <KeyRound aria-hidden="true" />
              <input
                className="entrada"
                type={verClave ? "text" : "password"}
                value={clave}
                maxLength={32}
                onChange={(evento) => setClave(evento.target.value.replace(/\s/g, ""))}
                autoComplete="current-password"
                placeholder="Mínimo 6 caracteres"
                disabled={bloqueado}
              />
              <button
                type="button"
                className="boton_icono entrada_accion"
                onClick={() => setVerClave((actual) => !actual)}
                aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {verClave ? <EyeOff /> : <Eye />}
              </button>
            </span>
          </CampoFormulario>

          {error && (
            <p className="aviso aviso_error" role="alert">
              {bloqueado ? <LockKeyhole /> : <CircleAlert />}
              {bloqueado ? `Acceso bloqueado. Intenta en ${segundosRestantes} s.` : error}
            </p>
          )}

          <button type="submit" className="boton boton_primario boton_grande" disabled={bloqueado}>
            <LogIn />
            Ingresar
          </button>
        </form>
      </section>
    </main>
  );
}
