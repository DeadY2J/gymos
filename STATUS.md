# Estado · GymOS

Revisión del 27/11/2026.

## Revisión del 28/11/2026 (auditoría fase 4)
- CSP completa con nonce por petición (`src/proxy.ts`), verificada en navegador sin errores.
- Typecheck, 63 tests, build y `npm audit` (0 vulnerabilidades) en verde; axe sin incidencias en la vista inicial; sin desbordamiento a 375 px.
- Pendiente con cuentas reales (no se da por bueno): Mercado Pago (pago y suscripción, firma del webhook) y WhatsApp con cuentas de prueba reales, IA real, y Supabase Auth + RLS para que cada socio solo vea su QR.
- Detalle en `AUDITORIA.md`. No desplegado.

## Hecho
- Panel para un gimnasio ficticio (Forja Gym, Ciudad de México): QR de acceso firmado que rota cada 60 s, cuotas,
  radar de bajas con «máquina del tiempo», mensaje uno a uno confirmado por una persona, rutinas y ranking.
- Mercado Pago, WhatsApp e IA opcionales: sin claves todo funciona en modo demo.
- Comprobado hoy: 60 tests, typecheck, build y `npm audit` (0 vulnerabilidades) en local; CI en verde en `main`.
  Sin voseo ni modismos en los textos de la app.

## Corregido en esta revisión
- El PR #4 (AUDITORIA.md y README con el guion del vídeo) se fusionó en la rama del PR #3 después de que esa rama ya
  estuviera en `main`, así que nunca llegó a `main`. Este PR trae esos dos archivos sin cambios.

## Pendiente
- Autenticación por socio y persistencia (Supabase con RLS): bloquea el uso con un gimnasio real.
- Probar Mercado Pago y WhatsApp con cuentas de prueba (WhatsApp solo admite plantillas aprobadas fuera de 24 h).
- Ver «Pendiente antes de usarlo con un gimnasio real» en AUDITORIA.md. No desplegado.

## Cómo probarlo
```bash
npm ci
npm run dev        # http://localhost:3000, modo demo sin claves
npm test && npm run typecheck && npm run build
```
