/**
 * Bisel de cronómetro alrededor del QR: 60 marcas, una por segundo de validez.
 * Las marcas encendidas son los segundos que le quedan al código; en los últimos 10 se ponen naranjas.
 */
export function Cronometro({ restante, total, children }: { restante: number; total: number; children: React.ReactNode }) {
  const marcas = Array.from({ length: total }, (_, i) => i);
  const final = restante <= 10;
  return (
    <div className="relative aspect-square w-full">
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
        {marcas.map((i) => {
          const encendida = i < restante;
          const larga = i % 5 === 0;
          return (
            <line
              key={i}
              x1="100"
              y1={larga ? 3 : 6}
              x2="100"
              y2="17"
              transform={`rotate(${(i * 360) / total} 100 100)`}
              strokeWidth={larga ? 3.4 : 2.2}
              className="bisel-marca"
              stroke={encendida ? (final ? "var(--color-naranja)" : "var(--color-azul)") : "rgb(228 229 224 / 0.16)"}
            />
          );
        })}
      </svg>
      <div className="absolute inset-[13%] grid place-items-center">{children}</div>
    </div>
  );
}
