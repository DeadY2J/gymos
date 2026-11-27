"use client";

import { useState } from "react";
import type { Rutina } from "@/gimnasio/rutinas";

const zonas = [
  { id: "rodilla", nombre: "Rodilla" },
  { id: "hombro", nombre: "Hombro" },
  { id: "espalda_baja", nombre: "Espalda baja" },
] as const;

export function Rutinas({ cabeceras, alGenerar }: { cabeceras: () => HeadersInit; alGenerar: (r: Rutina | null, error?: string) => void }) {
  const [objetivo, setObjetivo] = useState("ganar_musculo");
  const [nivel, setNivel] = useState("principiante");
  const [dias, setDias] = useState(3);
  const [minutos, setMinutos] = useState(60);
  const [cuidar, setCuidar] = useState<string[]>([]);
  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [cargando, setCargando] = useState(false);

  async function generar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    const res = await fetch("/api/rutina", { method: "POST", headers: cabeceras(), body: JSON.stringify({ objetivo, nivel, diasPorSemana: dias, minutos, cuidar }) });
    const json = await res.json().catch(() => ({}));
    setCargando(false);
    if (!res.ok) return alGenerar(null, json.error ?? "No se pudo generar la rutina.");
    setRutina(json);
    alGenerar(json);
  }

  const campo = "mt-1 rounded-lg border border-salvia-borde bg-papel px-3 py-2";
  return (
    <section aria-labelledby="t-rutinas" className="mt-6 rounded-2xl border border-salvia-borde bg-white p-4">
      <h2 id="t-rutinas" className="text-xl font-bold text-bosque">Rutina personalizada</h2>
      <form onSubmit={generar} className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm font-medium">
          Objetivo
          <select value={objetivo} onChange={(e) => setObjetivo(e.target.value)} className={campo}>
            <option value="ganar_musculo">Ganar músculo</option>
            <option value="perder_grasa">Perder grasa</option>
            <option value="salud_general">Salud general</option>
          </select>
        </label>
        <label className="flex flex-col text-sm font-medium">
          Nivel
          <select value={nivel} onChange={(e) => setNivel(e.target.value)} className={campo}>
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </label>
        <label className="flex flex-col text-sm font-medium">
          Días por semana
          <select value={dias} onChange={(e) => setDias(Number(e.target.value))} className={campo}>
            {[2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-sm font-medium">
          Minutos
          <select value={minutos} onChange={(e) => setMinutos(Number(e.target.value))} className={campo}>
            {[30, 45, 60, 90].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <fieldset className="text-sm">
          <legend className="font-medium">Cuidar</legend>
          <div className="mt-1 flex gap-3">
            {zonas.map((z) => (
              <label key={z.id} className="flex items-center gap-1">
                <input type="checkbox" checked={cuidar.includes(z.id)} onChange={(e) => setCuidar((c) => (e.target.checked ? [...c, z.id] : c.filter((x) => x !== z.id)))} />
                {z.nombre}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" disabled={cargando} className="rounded-lg bg-jacaranda px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-70">
          {cargando ? "Generando…" : "Generar rutina"}
        </button>
      </form>
      {rutina && (
        <div className="aparece mt-4">
          <h3 className="font-bold">{rutina.titulo}</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rutina.dias.map((d, i) => (
              <div key={i} className="rounded-xl bg-papel p-3">
                <h4 className="font-semibold text-bosque">Día {i + 1} · {d.titulo}</h4>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {d.ejercicios.map((e) => <li key={e.id}>{e.nombre} <span className="cifra text-tinta-suave">{e.series}×{e.repeticiones}</span></li>)}
                  <li className="text-tinta-suave">Cardio: {d.cardioMin} min</li>
                </ul>
              </div>
            ))}
          </div>
          <ul className="mt-2 list-inside list-disc text-xs text-tinta-suave">{rutina.notas.map((n) => <li key={n}>{n}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
