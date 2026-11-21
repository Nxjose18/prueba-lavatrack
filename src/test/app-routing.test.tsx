import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Solo se resuelven rutas, sin ejecutar loaders ni renderizar.
describe("Enrutamiento de la aplicación", () => {
  it("resuelve una página para / en lugar de la página no encontrada", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const coincidencias = router.matchRoutes("/");

    expect(coincidencias.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
