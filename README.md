# LavaTrack · Pantallas de prueba

Prototipo operativo de una lavandería para pruebas con usuarios reales: inicio de sesión por roles y cuatro paneles: Recepción, Control de prendas, Entregas (tienda y delivery) e Historial de entregas. Usa datos de ejemplo en memoria: nada se guarda al cerrar la página y los cobros son simulados.

Los hallazgos del focus group y las decisiones tomadas están en [analisis_focus_group.md](analisis_focus_group.md).

## Acceso

| Rol           | Usuario        | Contraseña   | Paneles                             |
| ------------- | -------------- | ------------ | ----------------------------------- |
| Administrador | `admin`        | `lava2026`   | Los cuatro + resumen del negocio    |
| Recepción     | `recepcion`    | `mostrador1` | Recepción, Entregas, Historial      |
| Taller        | `taller`       | `lavado123`  | Control de prendas                  |
| Repartidor    | `pedro.quispe` | `ruta2026`   | Entregas (solo sus paradas en ruta) |

Cuentas ficticias de la prueba. Tras 3 intentos fallidos el acceso se bloquea 30 segundos.

## Paneles

| Panel                 | Qué permite probar                                                                                                                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recepción             | 4 pasos: cliente (DNI opcional, detecta clientes ya registrados), prendas por categoría con daños y fotos, entrega con rango de fechas, descuento y cobro con QR, y confirmación con etiqueta QR del pedido.                  |
| Control de prendas    | Agenda de 7 días por fecha de entrega, tablero lavado → secado → planchado → control → aprobados con botón, selección en lote, arrastrar y soltar y deshacer. Control de calidad con aviso al cliente.                        |
| Entregas              | Pestañas Por entregar (tienda y delivery) y En ruta. Entrega unificada: identificación del titular o de un tercero, cobro del saldo y almacenaje, confirmación.                                                               |
| Historial de entregas | Entregas de tienda y delivery juntas, con filtros por fecha, medio y estado de pago, agrupadas por fecha o por cliente, y detalle de cada orden. El administrador ve además ingresos por medio de pago y clientes frecuentes. |

Todo campo filtra los caracteres que no le corresponden mientras se escribe (`src/lib/filtros_entrada.ts`).

## Estructura

```
src/
  components/lavanderia/
    aplicacion_lavanderia.tsx   Estructura general, sesión y navegación por rol
    pantalla_acceso.tsx         Inicio de sesión
    simulador_pago.tsx          Cobro simulado: efectivo, Yape, Plin, tarjeta y transferencia
    ventana_flotante.tsx        Ventana modal animada y accesible
    asistente_pasos.tsx         Asistente por pasos sobre la ventana flotante
    componentes_pedido.tsx      Bloques reutilizables de pedido
    elementos.tsx               Etiquetas, campos, métricas y estados vacíos
    pantallas/                  Un panel por archivo
  lib/
    pedidos.ts                  Tipos, datos de ejemplo y reglas de negocio
    filtros_entrada.ts          Filtros de caracteres por tipo de campo
    pagos.ts                    Números de operación y QR simulado
    usuarios.ts                 Roles, permisos y cuentas de prueba
    formato.ts                  Formato de moneda y fechas
  styles.css                    Sistema visual y animaciones
```

## Desarrollo local

Requiere Node.js 20 o superior.

```sh
npm install
npm run dev      # http://localhost:8080
npm test         # pruebas de reglas de negocio y rutas
npm run build    # compilación de producción
```
