import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import hojaEstilos from "../styles.css?url";

function PaginaNoEncontrada() {
  return (
    <main className="pagina_estado">
      <section className="pagina_estado_tarjeta">
        <p className="pagina_estado_codigo">404</p>
        <h1>Página no encontrada</h1>
        <p>La página que buscas no existe o fue movida.</p>
        <Link to="/" className="boton boton_primario">
          Ir al inicio
        </Link>
      </section>
    </main>
  );
}

function PaginaError({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <main className="pagina_estado">
      <section className="pagina_estado_tarjeta">
        <h1>No pudimos cargar esta página</h1>
        <p>Ocurrió un error inesperado. Intenta nuevamente o vuelve al inicio.</p>
        <div className="pagina_estado_acciones">
          <button
            type="button"
            className="boton boton_primario"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Reintentar
          </button>
          <a href="/" className="boton boton_secundario">
            Ir al inicio
          </a>
        </div>
      </section>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "LavaTrack · Pantallas de prueba" },
      {
        name: "description",
        content: "Prototipo operativo de LavaTrack para pruebas con usuarios.",
      },
      { name: "theme-color", content: "#1b3a6b" },
    ],
    links: [
      { rel: "stylesheet", href: hojaEstilos },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: EstructuraDocumento,
  component: ComponenteRaiz,
  notFoundComponent: PaginaNoEncontrada,
  errorComponent: PaginaError,
});

function EstructuraDocumento({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function ComponenteRaiz() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
