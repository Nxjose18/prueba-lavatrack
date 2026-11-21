export function renderizarPaginaError(): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>No pudimos cargar esta página</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #f3f6fb; color: #1b3a6b; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .tarjeta { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; background: #fff; border: 1px solid #dfe5dc; border-radius: 18px; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5d53; margin: 0 0 1.5rem; }
      .acciones { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.6rem 1rem; border-radius: 8px; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primario { background: #2c5b43; color: #fff; }
      .secundario { background: #fff; color: #1b3a6b; border-color: #c6d2e3; }
    </style>
  </head>
  <body>
    <main class="tarjeta">
      <h1>No pudimos cargar esta página</h1>
      <p>Ocurrió un error inesperado. Intenta nuevamente o vuelve al inicio.</p>
      <div class="acciones">
        <button class="primario" onclick="location.reload()">Reintentar</button>
        <a class="secundario" href="/">Ir al inicio</a>
      </div>
    </main>
  </body>
</html>`;
}
