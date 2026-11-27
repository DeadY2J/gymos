# Presupuesto · GymOS

Fase 5 del flujo de la Fábrica. Plantilla para un cliente propio: un gimnasio que quiere GymOS en producción.
Las tarifas quedan sin rellenar a propósito.

- Tarifa por hora: **[TARIFA_HORA_USD]** USD
- Cuota mensual de mantenimiento: **[CUOTA_MENSUAL_USD]** USD
- Moneda local del cliente: convertir al tipo de cambio del día de emisión e indicar la fecha del cambio.

## 1. Adaptación y puesta en producción

| Tarea | Horas |
|---|---|
| Configuración del gimnasio (planes, precios, gracia, pesos del radar, ranking) | 2 |
| Persistencia en Supabase con RLS | 8 |
| Inicio de sesión de cada socio y del personal | 6 |
| Cuotas recurrentes con Mercado Pago real y pruebas | 4 |
| WhatsApp Cloud API con plantillas aprobadas y pruebas | 4 |
| Importar socios existentes (hoja de cálculo) | 2 |
| Seguridad de producción (CSP con nonces, límite de peticiones compartido) | 2 |
| Despliegue en Vercel con dominio | 2 |
| Pruebas con el gimnasio y ajustes | 4 |
| **Total** | **34 h** |

**Importe de implementación** = 34 h × [TARIFA_HORA_USD] = ____ USD (≈ ____ en moneda local).

## 2. Mantenimiento mensual

[CUOTA_MENSUAL_USD] USD al mes. Incluye: alojamiento gestionado, actualizaciones de seguridad, copias de seguridad,
cambios menores de configuración (planes, precios, horarios) y soporte por WhatsApp en horario laboral.
No incluye funciones nuevas: se presupuestan aparte.

## 3. Costes de terceros (los paga el cliente, según la tarifa vigente de cada proveedor)

- Mercado Pago: comisión por cobro.
- WhatsApp Cloud API (Meta): cobro por conversación según país y tipo de plantilla.
- IA para rutinas (opcional): consumo por uso; sin clave, las rutinas usan plantillas sin coste.
- Supabase y Vercel: planes gratuitos al principio; de pago si crece el volumen.

## Condiciones

- 50 % al aceptar y 50 % a la entrega. Garantía de 30 días sobre lo entregado.
- Validez del presupuesto: 15 días.

## Si llega por Kodarvia

El precio lo fija Kodarvia. Comparar su pago con las 34 h de la tabla: si el pago por hora resultante queda por debajo
de [TARIFA_HORA_USD], no compensa. Recordar sus condiciones: cesión total del código, 30 días de garantía y no captar
al cliente final durante 12 meses.
