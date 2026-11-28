# Estado · GymOS

Revisión del 27/11/2026.

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
