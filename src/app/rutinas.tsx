"use client";

import { useEffect, useRef, useState } from "react";
import type { Rutina } from "@/gimnasio/rutinas";

const zonas = [
  { id: "rodilla", nombre: "Rodilla" },
  { id: "hombro", nombre: "Hombro" },
  { id: "espalda_baja", nombre: "Espalda baja" },
] as const;

export function Rutinas({ cabeceras, alGenerar, pedido = 0 }: { cabeceras: () => HeadersInit; alGenerar: (r: Rutina | null, error?: string) => void; pedido?: number }) {
  const [objetivo, setObjetivo] = useState("ganar_musculo");
  const [nivel, setNivel] = useState("principiante");
  const [dias, setDias] = useState(3);
  const [minutos, setMinutos] = useState(60);
  const [cuidar, setCuidar] = useState<string[]>([]);
  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [cargando, setCargando] = useState(false);

  // El modo presentación pide una rutina con los valores que haya en el formulario.
  const generarRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (pedido > 0) generarRef.current();
  }, [pedido]);

  async function generar(e?: React.FormEvent) {
    e?.preventDefault();
    setCargando(true);
    const res = await fetch("/api/rutina", { method: "POST", headers: cabeceras(), body: JSON.stringify({ objetivo, nivel, diasPorSemana: dias, minutos, cuidar }) });
    const json = await res.json().catch(() => ({}));
    setCargando(false);
    if (!res.ok) return alGenerar(null, json.error ?? "No se pudo generar la rutina.");
    setRutina(json);
    alGenerar(json);
  }

  generarRef.current = generar;

  const campo = "mt-1 border-2 border-tinta bg-hormigon-claro px-3 py-2";
  return (
    <section aria-labelledby="t-rutinas" className="mt-12 scroll-mt-4">
      <h2 id="t-rutinas" className="marcador border-b-[6px] border-tinta pb-2 text-6xl">Rutina personalizada</h2>
      <form onSubmit={generar} className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm font-semibold">
          Objetivo
          <select value={objetivo} onChange={(e) => setObjetivo(e.target.value)} className={campo}>
            <option value="ganar_musculo">Ganar músculo</option>
            <option value="perder_grasa">Perder grasa</option>
            <option value="salud_general">Salud general</option>
          </select>
        </label>
        <label className="flex flex-col text-sm font-semibold">
          Nivel
          <select value={nivel} onChange={(e) => setNivel(e.target.value)} className={campo}>
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </label>
        <label className="flex flex-col text-sm font-semibold">
          Días por semana
          <select value={dias} onChange={(e) => setDias(Number(e.target.value))} className={campo}>
            {[2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-sm font-semibold">
          Minutos
          <select value={minutos} onChange={(e) => setMinutos(Number(e.target.value))} className={campo}>
            {[30, 45, 60, 90].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <fieldset className="text-sm">
          <legend className="font-semibold">Cuidar</legend>
          <div className="mt-1 flex flex-wrap gap-3 py-2">
            {zonas.map((z) => (
              <label key={z.id} className="flex items-center gap-1">
                <input type="checkbox" className="h-4 w-4 accent-azul" checked={cuidar.includes(z.id)} onChange={(e) => setCuidar((c) => (e.target.checked ? [...c, z.id] : c.filter((x) => x !== z.id)))} />
                {z.nombre}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" disabled={cargando} className="bg-azul px-5 py-2.5 font-bold text-white hover:bg-tinta disabled:opacity-60">
          {cargando ? "Generando…" : "Generar rutina"}
        </button>
      </form>
      {rutina && (
        <div className="aparece mt-4">
          <h3 className="marcador-fino text-3xl">{rutina.titulo}</h3>
          <ol className="mt-3 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {rutina.dias.map((d, i) => (
              <li key={i} className="losa p-4">
                <h4 className="flex items-baseline gap-3"><span className="marcador text-5xl text-azul"><span className="sr-only">Día </span>{i + 1}</span><span className="font-bold">{d.titulo}</span></h4>
                <ul className="mt-2 space-y-1 text-sm">
                  {d.ejercicios.map((e) => <li key={e.id} className="flex justify-between gap-3"><span>{e.nombre}</span><span className="marcador-fino shrink-0 text-lg">{e.series}×{e.repeticiones}</span></li>)}
                  <li className="text-tinta-suave">Cardio: {d.cardioMin} min</li>
                </ul>
              </li>
            ))}
          </ol>
          <ul className="mt-3 list-inside list-disc text-sm text-tinta-suave">{rutina.notas.map((n) => <li key={n}>{n}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
