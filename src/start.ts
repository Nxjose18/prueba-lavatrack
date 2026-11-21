import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderizarPaginaError } from "./lib/error-page";

const middlewareErrores = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderizarPaginaError(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Al definir src/start.ts se reemplaza la configuración por defecto, así que se
// vuelve a registrar la protección CSRF para las funciones de servidor.
const middlewareCsrf = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// requestMiddleware se ejecuta en cada petición. Agrega elementos al arreglo; no lo reemplaces.
export const startInstance = createStart(() => ({
  requestMiddleware: [middlewareErrores, middlewareCsrf],
}));
