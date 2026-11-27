"use client";

import { useEffect, useState } from "react";

type Qr = { svg: string; caducaEnSeg: number; nombre: string; vencimiento: string };

/** Vista del socio en el móvil: su QR, que se renueva solo antes de caducar. */
export function VistaSocio({ id, gimnasio }: { id: string; gimnasio: string }) {
  const [qr, setQr] = useState<Qr | null>(null);
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
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-jacaranda">{gimnasio} · tu acceso</p>
      {error && <p role="alert" className="text-alerta">{error}</p>}
      {qr && (
        <>
          <h1 className="text-2xl font-extrabold text-bosque">Hola, {qr.nombre.split(" ")[0]}</h1>
          <div role="img" aria-label="Tu código QR de acceso" className="w-64 rounded-2xl border border-salvia-borde bg-white p-3 shadow-sm" dangerouslySetInnerHTML={{ __html: qr.svg }} />
          <p className="text-sm text-tinta-suave" aria-live="polite">Se renueva en <span className="cifra font-bold text-bosque">{restante}</span> s</p>
          <p className="text-sm">Tu cuota vence el <strong>{qr.vencimiento.split("-").reverse().join("/")}</strong>.</p>
        </>
      )}
      {!qr && !error && <p className="text-tinta-suave">Cargando tu QR…</p>}
    </main>
  );
}
