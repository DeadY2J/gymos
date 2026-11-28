# Auditoría · GymOS

Fecha: 27/11/2026 · Alcance: repositorio `gymos` (Next.js 16, almacén en memoria, integraciones sin cuentas reales).
Metodología: revisión del código de todas las rutas API y módulos, más comprobaciones ejecutadas (typecheck, tests,
build, `npm audit`, cabeceras y límite de peticiones contra `next start`, navegación con Playwright a 1280 y 390 px).

## Resultado

Sin fallos críticos ni altos abiertos **para la demo**. Hay dos puntos altos que impiden usarlo con un gimnasio real
hasta la fase 2 (autenticación por socio y persistencia), marcados abajo como "bloquea producción".
**Limitación principal:** Mercado Pago, WhatsApp e IA solo están probados con respuestas simuladas; faltan pruebas
con cuentas de prueba reales.

## Seguridad

| # | Gravedad | Hallazgo | Estado |
|---|----------|----------|--------|
| S1 | Alta | Con integraciones reales, cualquiera podría usar el panel, crear cobros o enviar mensajes. | **Corregido**: con cualquier integración configurada todas las rutas exigen `GYMOS_TOKEN` (cabecera `x-gymos-token`, comparación en tiempo constante); sin él se niegan con 503. La máquina del tiempo y el reinicio solo existen en modo demo. Tests incluidos. |
| S2 | Alta | Webhook de Mercado Pago falsificable (renovar cuotas gratis). | **Corregido**: firma `x-signature` obligatoria (HMAC-SHA256 con `MERCADOPAGO_WEBHOOK_SECRET`), avisos de más de 10 min rechazados, el pago se consulta a la API (no se confía en el cuerpo), se comprueba estado e importe y es idempotente. Durante la auditoría se corrigió que `ts` llega en segundos según la documentación (antes se habría rechazado todo). Tests incluidos. |
| S3 | Alta | QR de acceso copiable o falsificable. | **Corregido**: código firmado con HMAC-SHA256 que cambia cada 60 s (se acepta la ventana anterior, máx. 2 min); sin datos personales; secreto propio de 32+ caracteres obligatorio fuera del modo demo. Tests de manipulación, otro socio, otro secreto y caducidad. |
| S4 | Alta · bloquea producción | No hay inicio de sesión por socio: en modo real la vista `/socio/[id]` y su QR quedan detrás de `GYMOS_TOKEN` (personal), así que el socio no puede ver su QR desde su móvil. En demo, cualquiera ve el QR de un socio ficticio. | Abierto. Fase 2: Supabase Auth y RLS para que cada socio solo vea lo suyo, e ids UUID en lugar de los legibles de la demo. |
| S5 | Alta · bloquea producción | Almacén y límite de peticiones en memoria: con varias instancias o reinicios se pierden visitas, contactos (y con ellos la regla de 14 días) y pagos procesados (idempotencia). | Abierto, igual que en las otras demos. Fase 2: Supabase y límite compartido. |
| S6 | Media | Riesgo de envíos masivos de WhatsApp. | **Corregido por diseño**: el texto personalizado se envía a mano con `wa.me`; la API solo manda una plantilla aprobada a un socio cada vez, tras pulsar una persona. Reglas: "no contactar", 14 días entre mensajes, tope diario y frase de baja. En modo demo el enlace no lleva número. Tests incluidos. |
| S7 | Media | Filtrado de tokens de Mercado Pago, WhatsApp o IA en errores. | **Corregido**: las claves solo se usan en el servidor; los errores no propagan el cuerpo de la API externa. Tests con `fetch` simulado que lo comprueban. |
| S8 | Media | La IA podría inventar ejercicios o ignorar una lesión. | **Corregido**: salida validada con Zod, solo ids del catálogo, se comprueban nivel y zonas a cuidar y se quitan notas con modismos; si algo falla, generador por reglas. Tests incluidos. |
| S9 | Media | CSP completa (script-src/style-src) no aplicada: Next.js necesita nonces para scripts en línea. | **Corregido (28/11/2026)**: CSP completa con nonce por petición en `src/proxy.ts` (ver sección de revisión). |
| S10 | Baja | Un QR capturado sirve durante un máximo de 2 minutos. | Aceptado: una visita por día y por socio; en fase 2 se puede ligar el QR al dispositivo. |
| S11 | Baja | `x-forwarded-for` se puede falsear fuera de Vercel para esquivar el límite por IP. | Aceptado (en Vercel lo fija la plataforma). En modo real además hace falta `GYMOS_TOKEN`. |
| S12 | Baja | La clave de acceso se guarda en `sessionStorage`. | Aceptado: se borra al cerrar la pestaña. Mejora futura: cookie `HttpOnly`. |

Comprobado sin hallazgos:
- **Validación de entradas**: Zod en todas las rutas (planes y objetivos como enumeraciones cerradas, días acotados, correo validado, ids con longitud máxima). JSON inválido → 400.
- **SVG del QR** insertado con `dangerouslySetInnerHTML`: lo genera la librería `qrcode` en el servidor a partir de un código propio; no entra texto del usuario.
- **Secretos**: ninguno en el código; `.env.example` sin valores; `.gitignore` excluye `.env*`.
- **Cabeceras** (verificado con `curl -I` contra `next start`): nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, HSTS, CSP mínima y sin `X-Powered-By`.
- **Dependencias**: `npm audit` → 0 vulnerabilidades.

## Calidad

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | OK |
| `npm test` | OK · 60 tests (QR, cuotas, radar, mensajes y reglas de contacto, ranking, rutinas, datos de demo, API, seguridad, Mercado Pago, WhatsApp e IA simulados) |
| `npm run build` | OK |
| CI | `.github/workflows/ci.yml` (typecheck, tests, build) en cada PR |
| Límite de peticiones | Verificado contra `next start`: la rutina 31 en un minuto devuelve 429 |
| Navegación | Playwright: panel → mensaje → QR → escaneo → máquina del tiempo → vista del socio, sin errores en consola |
| Móvil | Sin scroll horizontal a 390 px en el panel y en la vista del socio |
| Accesibilidad | Etiquetas en todos los campos, `aria-live` para errores y para el resultado del escaneo, `aria-expanded` en el mensaje, `aria-current` en la semana, QR con texto alternativo, foco visible y `prefers-reduced-motion`. Contraste: blanco sobre terracota 5,9:1, sobre verde WhatsApp 5,4:1, sobre jacarandá 4,9:1; paleta de texto heredada de Radar Pyme (≥ 4,5:1). |
| Textos | Detector de voseo y modismos sobre todas las plantillas de mensaje, la rutina, el catálogo y los mensajes del panel. |

## Calidad del radar (honesto)

Es una heurística explicable, no un modelo entrenado. En los datos de demo detecta a todos los socios que se van
(fugas pasadas y las cuatro que empiezan durante la máquina del tiempo), pero también da algún falso positivo
"medio" cuando un socio constante tiene una racha de faltas al azar (por ejemplo, Emiliano Reyes a +3 semanas).
Por eso cada punto se explica y el mensaje lo revisa y lo envía una persona. Los pesos están en `config.ts`.

## Pendiente antes de usarlo con un gimnasio real

1. Supabase (datos, contactos, pagos procesados) y autenticación por socio con RLS (S4, S5).
2. Probar Mercado Pago con credenciales de prueba (enlace, suscripción y webhook firmado) y WhatsApp con una plantilla aprobada.
3. Límite de peticiones compartido. (La CSP con nonces, S9, quedó corregida el 28/11/2026.)
4. Revisar los textos legales de los mensajes (aviso de privacidad y baja) con el gimnasio.

## Revisión del 28/11/2026 (fase 4 completa)

Pasada de auditoría sobre `main` de las seis apps de la Fábrica, en la nube. Resultado: **sin críticos, altos ni medios
abiertos que se puedan corregir sin cuentas reales**. Lo que depende de cuentas reales queda pendiente y no se da por bueno.

Corregido en esta pasada:
- **CSP completa** (S9): `src/proxy.ts` genera un nonce por petición y aplica `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'`
  (sin `unsafe-inline` ni `unsafe-eval` en producción), `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`
  y `upgrade-insecure-requests`. `style-src` mantiene `'unsafe-inline'` porque React usa atributos `style` (riesgo bajo). Las páginas
  pasan a render dinámico (`connection()` en el layout) para que el nonce sea nuevo en cada visita. Las rutas API llevan
  `frame-ancestors 'none'; object-src 'none'; base-uri 'none'`. Política en `src/*/csp.ts` con test (`tests/csp.test.ts`).

Comprobado (todo contra `next build` + `next start`, Chromium sin cabeza):

| Comprobación | Resultado |
|---|---|
| Typecheck · tests · build | OK · 63 tests en verde · OK |
| `npm audit` | 0 vulnerabilidades |
| CSP en navegador | Cabecera con nonce en la página; scripts de Next con nonce; React hidrata y responde a clics; 0 errores en consola |
| Accesibilidad (axe-core 4.10, WCAG 2 A/AA, vista inicial) | 0 incidencias |
| Móvil (375 px) | Sin desbordamiento horizontal |
| Rendimiento (Pixel 5 emulado, CPU ×4, red lenta) | LCP 2,3 s · CLS 0 · TTFB ≈ 150 ms (local) |
| Voseo y modismos | Ninguno fuera de los tests de modismos y de los patrones que sirven para entender al usuario |
| Documentos de la Fábrica | ALCANCE, AUDITORIA, PRESUPUESTO (marcadores `[TARIFA_HORA_USD]` y `[CUOTA_MENSUAL_USD]` sin rellenar), PROSPECCION y STATUS presentes |

Límites honestos de esta pasada: axe solo cubre la vista inicial (no todos los estados), el rendimiento se midió en local
(no en Vercel ni con Lighthouse) y no hubo prueba en móviles físicos.

**Pendiente que no se puede dar por bueno sin cuentas reales:** Mercado Pago (pago y suscripción, firma del webhook) y WhatsApp con cuentas de prueba reales, IA real, y Supabase Auth + RLS para que cada socio solo vea su QR.
