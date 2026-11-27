# Alcance · GymOS

Producto 3 de la Fábrica. Fecha: 27/11/2026. Referencias de estilo y arquitectura: Recepción 24/7 y Radar Pyme.

## Problema del negocio

Un gimnasio pequeño de Latinoamérica pierde a la mayoría de sus socios en silencio: dejan de venir unas semanas,
no renuevan y nadie se entera hasta que ya se fueron. Además controla el acceso a ojo (o con una libreta), cobra
cuotas a mano y no tiene nada que enganche a los socios constantes. Captar un socio nuevo cuesta bastante más que
retener a uno, así que **detectar a tiempo al que se está yendo y escribirle** es el dinero más fácil del negocio.

## Usuarios

- **Recepción / dueño del gimnasio**: escanea el QR en la entrada, cobra, mira el radar de bajas y escribe a los socios en riesgo.
- **Socio**: muestra su QR desde el móvil, ve su cuota, su rutina y su puesto en el ranking (si quiere salir).

## Momento wow (vídeo de 60 s)

1. **0-15 s · Acceso por QR**: el móvil del socio muestra un QR que cambia cada minuto; recepción lo escanea y la
   pantalla se pone verde ("Bienvenido, Lucía. Tu cuota vence en 3 días") o roja ("tu cuota está vencida").
2. **15-45 s · Radar de bajas con "máquina del tiempo"**: un control avanza el calendario de la demo semana a
   semana; los socios que dejan de venir pasan de verde a rojo con el motivo exacto ("Hace 24 días que no viene;
   lo habitual era venir cada 2 días"). Un clic y aparece el mensaje de WhatsApp personalizado, listo para enviar.
3. **45-60 s · Ranking y rutina**: el ranking del mes por constancia y una rutina generada en un segundo.

## Funcionalidades del MVP

1. **QR de acceso rotativo** firmado con HMAC-SHA256 (cambia cada 60 s; una captura caduca). La decisión de acceso
   depende de la cuota: al día, por vencer (avisa), en gracia (deja pasar y avisa), vencida o congelada (no pasa).
   Varios escaneos el mismo día cuentan como una visita.
2. **Cuotas**: planes en el archivo de configuración, renovar (encadena sin perder días), congelar (desplaza el
   vencimiento, con máximo), lista de cuotas por cobrar. Cobro manual en la demo; **Mercado Pago opcional**
   (suscripción o enlace de pago) con webhook firmado, solo si hay `MERCADOPAGO_ACCESS_TOKEN`.
3. **Radar de bajas**: puntuación 0-100 por socio con señales explicables (ausencia frente a su frecuencia habitual,
   caída de ritmo, cuota vencida, renovación cercana con menos asistencia, alta que nunca vino). Si no hay historial
   suficiente dice "sin datos": nunca inventa. Los congelados no cuentan como riesgo.
4. **Mensaje al socio en riesgo**: plantilla en español neutro según la señal principal, con enlace `wa.me` que abre
   el chat para enviarlo **a mano**, uno a uno. Reglas: respeto a "no contactar", un mensaje cada 14 días por socio,
   tope diario y frase de baja. **WhatsApp Cloud API opcional** (solo con variables de entorno) para el envío de un
   mensaje concreto que una persona confirma; nunca envíos masivos ni automáticos.
5. **Rutinas**: generador por reglas (objetivo, nivel, días, minutos, zonas a cuidar) con un catálogo cerrado de
   ejercicios. **IA opcional** con cualquier modelo compatible con OpenAI (p. ej. OmniRoute) o Claude: su salida se
   valida con el mismo esquema y solo puede usar ejercicios del catálogo; si falla, se usa el generador por reglas.
6. **Ranking mensual por constancia** (visitas, semanas cumplidas y racha), solo con socios que aceptan salir y con apodo.
7. **Panel de demo** con datos ficticios deterministas (≈40 socios con perfiles: constantes, en fuga, caída gradual,
   altas que no arrancan, cuotas vencidas) y la "máquina del tiempo"; página del socio con su QR.
8. Calidad: TypeScript estricto, Vitest, CI (typecheck, tests, build), `AUDITORIA.md`.

## Fase 2 (fuera de este alcance)

- Persistencia en Supabase con autenticación (hoy almacén en memoria, como en las otras demos).
- Lector QR con la cámara (hoy el escaneo se simula pegando o eligiendo el código) y torniquete físico.
- PWA instalable para el socio, reservas de clases con aforo (módulo de la Fábrica).
- Facturación electrónica de las cuotas.

## Criterios de aceptación

- `npm install && npm run dev` funciona sin ninguna clave: panel, QR, radar, mensajes, rutinas y ranking en modo demo.
- Un QR válido de un socio al día abre; uno manipulado, de otro socio o de hace más de 2 minutos no (tests).
- El socio de demo "en fuga" aparece arriba del radar con el motivo; un socio nuevo sin historial sale "sin datos" (tests).
- Avanzar el tiempo en la demo cambia el radar de forma determinista.
- No se puede escribir dos veces al mismo socio en 14 días, ni a quien pidió no recibir mensajes, ni pasar el tope diario (tests).
- Ningún texto visible tiene voseo ni modismos (test con el detector sobre todas las plantillas y la rutina).
- Mercado Pago, WhatsApp e IA funcionan solo con sus variables; probados con `fetch` simulado y webhook con firma válida e inválida. Sin claves, la app no los llama.
- `npm run typecheck`, `npm test` y `npm run build` pasan en la CI.

## Riesgos (honestos)

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Las integraciones (Mercado Pago, WhatsApp, IA) solo se prueban con respuestas simuladas: no hay cuentas reales. | Alto hasta probarlas | Clientes aislados y testeados; probarlos con cuentas de prueba antes de un cliente real. |
| El radar es una heurística, no un modelo entrenado: puede dar falsos positivos. | Medio | Cada punto se explica; los pesos están en la configuración; el mensaje lo revisa y envía una persona. |
| Datos personales de socios (teléfono, asistencia). | Alto en producción | Demo con datos ficticios; en producción, Supabase con RLS, panel con clave y el socio solo ve lo suyo. |
| El QR depende de la hora del móvil. | Bajo | Se acepta la ventana anterior (hasta 2 min); el código no lleva datos personales. |
| Almacén en memoria: con varias instancias o reinicios se pierden visitas y contactos. | Alto en producción | Solo para demo. Fase 2: Supabase. |

## Supuestos (sin preguntas pendientes)

No hacía falta preguntar nada para empezar. Supuestos que se cambian en `src/gimnasio/config.ts`: gimnasio ficticio
"Forja Gym" en Ciudad de México, precios en MXN, cuota de 30 días, 3 días de gracia, QR que rota cada 60 s.

## Estimación

| Parte | Horas |
|---|---|
| Alcance, base del repo y CI | 2 |
| Motor (acceso, cuotas, radar, mensajes, ranking, rutinas) con tests | 8 |
| Datos de demo, almacén, API y seguridad | 5 |
| Interfaz (panel, máquina del tiempo, página del socio) | 8 |
| Integraciones opcionales (Mercado Pago, WhatsApp, IA) con tests simulados | 6 |
| Auditoría, README y guion del vídeo | 3 |
| **Total** | **32** |
