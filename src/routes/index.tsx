import { createFileRoute } from "@tanstack/react-router";

import { AplicacionLavanderia } from "@/components/lavanderia/aplicacion_lavanderia";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pantallas operativas | LavaTrack" },
      {
        name: "description",
        content:
          "Prototipo de LavaTrack para pruebas con usuarios: acceso por roles, recepción, control de prendas y entregas.",
      },
      { property: "og:title", content: "Pantallas operativas | LavaTrack" },
      {
        property: "og:description",
        content: "Prueba los recorridos de recepción, control de prendas y entregas de LavaTrack.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AplicacionLavanderia,
});
