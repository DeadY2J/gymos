"use client";

import { useEffect, useState } from "react";
import { Cronometro } from "../../cronometro";

type Qr = { svg: string; caducaEnSeg: number; nombre: string; vencimiento: string };

/** Vista del socio en el móvil: su QR, que gira y se renueva solo antes de caducar. */
export function VistaSocio({ id, gimnasio }: { id: string; gimnasio: string }) {
  const [qr, setQr] = useState<Qr | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const [restante, setRestante] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    let temporizador: ReturnType<typeof setTimeout>;
    async function cargar() {
      let token = "";
      try { token = sessionStorage.getItem("gymos-token") ?? ""; } catch { /* sin almacenamiento */ }
      const res = await fetch(`/api/socios/${encodeURIComponent(id)}/qr`, { headers: token ? { "x-gymos-token": token } : {} });
      const json = await res.json().catch(() => ({}));
      if (!vivo) return;
      if (!res.ok) return setError(json.error ?? "No se pudo cargar tu QR.");
      setQr(json);
      setVuelta((v) => v + 1);
      setRestante(json.caducaEnSeg);
      temporizador = setTimeout(cargar, json.caducaEnSeg * 1000 + 300);
    }
    cargar();
    return () => {
      vivo = false;
      clearTimeout(temporizador);
    };
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setRestante((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="sobre-oscuro flex min-h-dvh flex-col bg-asfalto px-5 py-6 text-hormigon-claro">
      <p className="text-sm font-semibold text-hormigon"><span className="marcador-fino mr-2 text-lg text-azul-claro">{gimnasio}</span>tu acceso</p>
      {error && <p role="alert" className="mt-6 bg-naranja p-3 font-semibold text-tinta">{error}</p>}
      {qr && (
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-5">
          <h1 className="marcador text-7xl">Hola, {qr.nombre.split(" ")[0]}</h1>
          <Cronometro restante={restante} total={60}>
            <div key={vuelta} role="img" aria-label="Tu código QR de acceso" className="gira aspect-square w-full bg-white p-2" dangerouslySetInnerHTML={{ __html: qr.svg }} />
          </Cronometro>
          <p className="flex items-baseline gap-3">
            <span className="marcador text-7xl tabular-nums">{restante}</span>
            <span className="text-hormigon">segundos para que tu código cambie</span>
          </p>
          <p>Tu cuota vence el <strong>{qr.vencimiento.split("-").reverse().join("/")}</strong>.</p>
        </div>
      )}
      {!qr && !error && <p className="mt-6 text-hormigon">Cargando tu QR…</p>}
    </main>
  );
}
