# Fábrica · GymOS

Proyecto de Jorge Lamelas: producto 3 de la Fábrica de software para pymes de Latinoamérica.
Panel para gimnasios: QR de acceso, cuotas, radar de bajas que prepara un mensaje al socio antes de que se vaya,
rutinas y ranking. Alcance en `ALCANCE.md`.

## Comandos
- `npm run dev`: servidor en http://localhost:3000 (sin claves funciona el modo demo).
- `npm test`: tests (Vitest). Deben pasar siempre antes de commitear.
- `npm run typecheck` y `npm run build`: los ejecuta también la CI.

## Arquitectura (respétala)
- `src/gimnasio/config.ts`: lo ÚNICO que cambia por cliente (gimnasio, planes, gracia, pesos del radar, ranking, topes).
- `src/gimnasio/`: motor puro y testeable, sin UI ni red. `fechas.ts` (días UTC, "hoy" siempre por parámetro),
  `acceso.ts` (QR firmado y decisión de acceso), `cuotas.ts`, `riesgo.ts` (radar de bajas), `mensaje.ts` y
  `contacto.ts` (WhatsApp uno a uno), `ranking.ts`, `rutinas.ts`, `neutro.ts` (detector de voseo y modismos).
- Integraciones opcionales que solo se activan con variables de entorno (Mercado Pago, WhatsApp, IA).
- `src/app/`: interfaz y rutas API.

## Convenciones
- Código y comentarios en español. Textos visibles en español latinoamericano neutro con tuteo: sin voseo ni
  modismos ("cita", no "turno"; "anticipo", no "seña").
- Toda regla de negocio nueva va en el motor con su test, no en la UI.
- El radar nunca inventa datos: sin historial suficiente, "sin datos".
- Mensajes a socios: siempre uno a uno y confirmados por una persona. Nada de envíos masivos ni automáticos.
- Ninguna API externa es obligatoria: sin claves, todo funciona en modo demo.
