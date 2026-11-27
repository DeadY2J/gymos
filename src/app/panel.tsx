"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Panel as DatosPanel } from "@/gimnasio/vista";
import type { Rutina } from "@/gimnasio/rutinas";
import { Rutinas } from "./rutinas";

type FilaRadar = DatosPanel["radar"][number];
type Decision = { permitido: boolean; mensaje: string; estado?: string; socio?: { nombre: string } };
type Qr = { codigo: string; svg: string; caducaEnSeg: number; nombre: string };

const SEMANAS = [0, 1, 2, 3, 4, 5, 6];

const estiloNivel: Record<FilaRadar["nivel"], { chip: string; barra: string; texto: string }> = {
  alto: { chip: "bg-alerta text-white", barra: "bg-alerta", texto: "Riesgo alto" },
  medio: { chip: "bg-ambar/15 text-ambar", barra: "bg-ambar", texto: "Riesgo medio" },
  bajo: { chip: "bg-salvia text-bosque", barra: "bg-bosque-claro", texto: "Constante" },
  sin_datos: { chip: "bg-papel text-tinta-suave border border-salvia-borde", barra: "bg-salvia-borde", texto: "Sin datos" },
  congelado: { chip: "bg-jacaranda-claro text-jacaranda", barra: "bg-jacaranda", texto: "Congelado" },
};

const textoCuota: Record<string, string> = { al_dia: "Al día", por_vencer: "Por vencer", en_gracia: "En gracia", vencida: "Vencida", congelada: "Congelada" };

function leerToken(): string {
  try {
    return sessionStorage.getItem("gymos-token") ?? "";
  } catch {
    return "";
  }
}

export function Panel() {
  const [datos, setDatos] = useState<DatosPanel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [verTodos, setVerTodos] = useState(false);
  const [cambiados, setCambiados] = useState<Set<string>>(new Set());
  const anterior = useRef<Map<string, string>>(new Map());

  const cabeceras = useCallback((): HeadersInit => ({ "Content-Type": "application/json", ...(token ? { "x-gymos-token": token } : {}) }), [token]);

  const aplicar = useCallback((p: DatosPanel) => {
    // Resalta los socios que acaban de cambiar de nivel (el momento en que el radar "los ve").
    const nuevos = new Set<string>();
    for (const r of p.radar) {
      const antes = anterior.current.get(r.socioId);
      if (antes && antes !== r.nivel && (r.nivel === "alto" || r.nivel === "medio")) nuevos.add(r.socioId);
    }
    anterior.current = new Map(p.radar.map((r) => [r.socioId, r.nivel]));
    setCambiados(nuevos);
    setDatos(p);
  }, []);

  const pedir = useCallback(
    async (ruta: string, cuerpo?: unknown) => {
      setError(null);
      const res = await fetch(ruta, cuerpo === undefined ? { headers: cabeceras() } : { method: "POST", headers: cabeceras(), body: JSON.stringify(cuerpo) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Algo salió mal. Inténtalo de nuevo.");
        return null;
      }
      return json;
    },
    [cabeceras],
  );

  const cargar = useCallback(async () => {
    const p = await pedir("/api/panel");
    if (p) aplicar(p);
  }, [pedir, aplicar]);

  useEffect(() => {
    setToken(leerToken());
  }, []);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const viajar = useCallback(
    async (semanas: number) => {
      const p = await pedir("/api/tiempo", { dias: semanas * 7 });
      if (p) aplicar(p);
    },
    [pedir, aplicar],
  );

  // Reproducción automática de la máquina del tiempo: una semana cada 1,6 s.
  useEffect(() => {
    if (!reproduciendo || !datos) return;
    const semana = Math.round(datos.desplazamiento / 7);
    if (semana >= SEMANAS.at(-1)!) {
      setReproduciendo(false);
      return;
    }
    const t = setTimeout(() => viajar(semana + 1), 1600);
    return () => clearTimeout(t);
  }, [reproduciendo, datos, viajar]);

  async function accion(ruta: string, cuerpo: unknown = {}) {
    const p = await pedir(ruta, cuerpo);
    if (p) aplicar(p);
  }

  if (!datos) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p role="status" aria-live="polite" className="text-tinta-suave">{error ?? "Cargando el panel…"}</p>
        {error && <ClaveAcceso token={token} onCambio={setToken} onGuardar={cargar} />}
      </main>
    );
  }

  const semanaActual = Math.round(datos.desplazamiento / 7);
  const enRiesgo = datos.radar.filter((r) => r.nivel === "alto" || r.nivel === "medio");
  const visibles = verTodos ? datos.radar : enRiesgo;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-jacaranda">GymOS</p>
          <h1 className="text-3xl font-extrabold text-bosque">{datos.gimnasio.nombre}</h1>
          <p className="text-tinta-suave">{datos.gimnasio.ciudad} · hoy es {datos.hoyTexto}</p>
        </div>
        {datos.modoDemo && <span className="rounded-full bg-ambar/15 px-3 py-1 text-sm font-medium text-ambar">Modo demo · socios ficticios</span>}
      </header>

      {!datos.modoDemo && <ClaveAcceso token={token} onCambio={setToken} onGuardar={cargar} />}

      {datos.modoDemo && (
        <section aria-labelledby="t-tiempo" className="mt-5 rounded-2xl bg-bosque p-4 text-papel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="t-tiempo" className="text-lg font-bold">Máquina del tiempo</h2>
              <p className="text-sm text-papel/80">Avanza el calendario y mira cómo el radar detecta a quien empieza a faltar.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setReproduciendo((r) => !r)} className="rounded-lg bg-jacaranda px-4 py-2 font-semibold text-white hover:opacity-90" aria-pressed={reproduciendo}>
                {reproduciendo ? "Pausar" : semanaActual >= 6 ? "Fin del recorrido" : "▶ Avanzar semanas"}
              </button>
              <button type="button" onClick={() => { setReproduciendo(false); accion("/api/demo/reiniciar"); }} className="rounded-lg border border-papel/40 px-4 py-2 font-semibold hover:bg-bosque-claro">
                Reiniciar demo
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1" role="group" aria-label="Semana de la demo">
            {SEMANAS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setReproduciendo(false); viajar(s); }}
                aria-current={s === semanaActual}
                className={`rounded-md px-1 py-2 text-xs font-semibold sm:text-sm ${s === semanaActual ? "bg-papel text-bosque" : s < semanaActual ? "bg-bosque-claro" : "bg-bosque-claro/40 hover:bg-bosque-claro"}`}
              >
                {s === 0 ? "Hoy" : `+${s} sem`}
              </button>
            ))}
          </div>
        </section>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cifra titulo="Socios activos" valor={datos.resumen.socios} />
        <Cifra titulo="Riesgo alto" valor={datos.resumen.riesgoAlto} destacado={datos.resumen.riesgoAlto > 0} />
        <Cifra titulo="Riesgo medio" valor={datos.resumen.riesgoMedio} />
        <Cifra titulo="Visitas hoy" valor={datos.resumen.visitasHoy} />
      </dl>

      <p role="status" aria-live="polite" className="mt-3 min-h-6 text-sm text-alerta">{error}</p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="t-radar" className="rounded-2xl border border-salvia-borde bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="t-radar" className="text-xl font-bold text-bosque">Radar de bajas</h2>
            <button type="button" onClick={() => setVerTodos((v) => !v)} className="text-sm font-medium text-jacaranda underline-offset-2 hover:underline">
              {verTodos ? "Ver solo en riesgo" : `Ver a todos (${datos.radar.length})`}
            </button>
          </div>
          <p className="text-sm text-tinta-suave">Quién está dejando de venir, por qué, y un mensaje listo para escribirle uno a uno.</p>
          {visibles.length === 0 && <p className="mt-4 text-tinta-suave">Nadie en riesgo esta semana.</p>}
          <ul className="mt-3 space-y-2">
            {visibles.map((r) => (
              <FilaSocio key={r.socioId} r={r} abierto={abierto === r.socioId} recien={cambiados.has(r.socioId)} onAbrir={() => setAbierto(abierto === r.socioId ? null : r.socioId)} onEnviado={() => accion(`/api/socios/${encodeURIComponent(r.socioId)}/contacto`)} />
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <Recepcion socios={datos.socios} cabeceras={cabeceras} onCambio={cargar} />
          <section aria-labelledby="t-cobros" className="rounded-2xl border border-salvia-borde bg-white p-4">
            <h2 id="t-cobros" className="text-xl font-bold text-bosque">Cuotas por cobrar</h2>
            {datos.porCobrar.length === 0 && <p className="mt-2 text-sm text-tinta-suave">No hay cuotas por vencer.</p>}
            <ul className="mt-2 divide-y divide-salvia">
              {datos.porCobrar.slice(0, 8).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="font-medium">{c.nombre}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${c.estado === "vencida" || c.estado === "en_gracia" ? "bg-alerta/10 text-alerta" : "bg-ambar/15 text-ambar"}`}>{textoCuota[c.estado]} · {c.vencimiento.split("-").reverse().join("/")}</span>
                  </span>
                  <button type="button" onClick={() => accion(`/api/socios/${encodeURIComponent(c.id)}/renovar`, { planId: c.planId })} className="shrink-0 rounded-lg border border-bosque px-3 py-1 font-semibold text-bosque hover:bg-salvia">
                    Cobrar y renovar
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="t-ranking" className="rounded-2xl border border-salvia-borde bg-white p-4">
            <h2 id="t-ranking" className="text-xl font-bold text-bosque">Ranking del mes</h2>
            <p className="text-sm text-tinta-suave">Por constancia, no por fuerza. Solo quien aceptó salir, con su apodo.</p>
            <ol className="mt-2 space-y-1">
              {datos.ranking.map((f) => (
                <li key={f.socioId} className="flex items-center gap-3 text-sm">
                  <span className={`cifra grid h-7 w-7 place-items-center rounded-full font-bold ${f.posicion <= 3 ? "bg-jacaranda text-white" : "bg-salvia"}`}>{f.posicion}</span>
                  <span className="flex-1 font-medium">{f.apodo}</span>
                  <span className="text-tinta-suave">{f.visitas} visitas{f.mejorRacha > 1 ? ` · racha ${f.mejorRacha} sem` : ""}</span>
                  <span className="cifra w-12 text-right font-bold text-bosque">{f.puntos}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <Rutinas cabeceras={cabeceras} alGenerar={(r: Rutina | null, e?: string) => (e ? setError(e) : r && setError(null))} />

      <footer className="mt-10 border-t border-salvia-borde pt-4 text-xs text-tinta-suave">
        GymOS · Fábrica. Los mensajes se envían a mano, de uno en uno. {datos.modoDemo ? "Datos ficticios de demostración." : ""}
      </footer>
    </main>
  );
}

function Cifra({ titulo, valor, destacado }: { titulo: string; valor: number; destacado?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${destacado ? "border-alerta/40 bg-alerta/5" : "border-salvia-borde bg-white"}`}>
      <dt className="text-sm text-tinta-suave">{titulo}</dt>
      <dd className={`cifra text-3xl font-extrabold ${destacado ? "text-alerta" : "text-bosque"}`}>{valor}</dd>
    </div>
  );
}

function FilaSocio({ r, abierto, recien, onAbrir, onEnviado }: { r: FilaRadar; abierto: boolean; recien: boolean; onAbrir: () => void; onEnviado: () => void }) {
  const e = estiloNivel[r.nivel];
  const idDetalle = `detalle-${r.socioId}`;
  return (
    <li className={`rounded-xl border border-salvia-borde p-3 transition-colors ${recien ? "recien" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">{r.nombre}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.chip}`}>{e.texto}</span>
        <span className="text-xs text-tinta-suave">{r.plan} · cuota {textoCuota[r.estadoCuota].toLowerCase()}</span>
        <span className="cifra ml-auto text-xl font-bold" aria-label={`Riesgo ${r.score} de 100`}>{r.score}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-salvia" aria-hidden>
        <div className={`h-full rounded-full ${e.barra} transition-all duration-700`} style={{ width: `${Math.max(r.score, 2)}%` }} />
      </div>
      {r.senales.length > 0 && <p className="mt-2 text-sm">{r.senales[0].texto}</p>}
      {r.nivel === "sin_datos" && <p className="mt-2 text-sm text-tinta-suave">Aún no hay historial suficiente para saber qué es lo habitual en este socio.</p>}
      {(r.nivel === "alto" || r.nivel === "medio") && (
        <div className="mt-2">
          {r.mensaje ? (
            <button type="button" onClick={onAbrir} aria-expanded={abierto} aria-controls={idDetalle} className="rounded-lg bg-bosque px-3 py-1.5 text-sm font-semibold text-papel hover:bg-bosque-claro">
              {abierto ? "Ocultar mensaje" : "Preparar WhatsApp"}
            </button>
          ) : (
            <p className="text-sm text-tinta-suave">{r.ultimoContacto ? `Mensaje enviado el ${r.ultimoContacto.split("-").reverse().join("/")}.` : !r.permiso.ok ? r.permiso.motivo : ""}</p>
          )}
        </div>
      )}
      {abierto && r.mensaje && (
        <div id={idDetalle} className="fondo-chat mt-3 rounded-xl p-3">
          {r.senales.length > 1 && (
            <ul className="mb-2 list-inside list-disc text-xs text-tinta-suave">
              {r.senales.map((s) => <li key={s.id}>{s.texto} (+{s.puntos})</li>)}
            </ul>
          )}
          <p className="max-w-prose rounded-xl rounded-tr-sm bg-burbuja p-3 text-sm shadow-sm">{r.mensaje.texto}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={r.mensaje.enlace} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#1f7a4d] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90">
              Abrir WhatsApp
            </a>
            <button type="button" onClick={onEnviado} className="rounded-lg border border-bosque bg-white px-3 py-1.5 text-sm font-semibold text-bosque hover:bg-salvia">
              Marcar como enviado
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function Recepcion({ socios, cabeceras, onCambio }: { socios: { id: string; nombre: string }[]; cabeceras: () => HeadersInit; onCambio: () => void }) {
  const [socioId, setSocioId] = useState("martina-rojas");
  const [qr, setQr] = useState<Qr | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [cargando, setCargando] = useState(false);

  async function mostrarQr() {
    setDecision(null);
    const res = await fetch(`/api/socios/${encodeURIComponent(socioId)}/qr`, { headers: cabeceras() });
    const json = await res.json().catch(() => ({}));
    setQr(res.ok ? json : null);
    if (!res.ok) setDecision({ permitido: false, mensaje: json.error ?? "No se pudo generar el QR." });
  }

  async function escanear() {
    if (!qr) return;
    setCargando(true);
    const res = await fetch("/api/acceso", { method: "POST", headers: cabeceras(), body: JSON.stringify({ codigo: qr.codigo }) });
    const json = await res.json().catch(() => ({}));
    setDecision(res.ok ? json : { permitido: false, mensaje: json.error ?? "No se pudo validar." });
    setCargando(false);
    onCambio();
  }

  return (
    <section aria-labelledby="t-recepcion" className="rounded-2xl border border-salvia-borde bg-white p-4">
      <h2 id="t-recepcion" className="text-xl font-bold text-bosque">Recepción · acceso con QR</h2>
      <p className="text-sm text-tinta-suave">El QR del socio cambia cada minuto: una captura de pantalla no sirve.</p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col text-sm font-medium">
          Socio
          <select value={socioId} onChange={(e) => { setSocioId(e.target.value); setQr(null); setDecision(null); }} className="mt-1 rounded-lg border border-salvia-borde bg-papel px-3 py-2">
            {socios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </label>
        <button type="button" onClick={mostrarQr} className="rounded-lg border border-bosque px-3 py-2 text-sm font-semibold text-bosque hover:bg-salvia">Ver su QR</button>
      </div>
      {qr && (
        <div className="mt-3 flex items-center gap-4">
          {/* SVG generado en nuestro servidor por la librería qrcode a partir de un código firmado. */}
          <div className="h-32 w-32 shrink-0 rounded-lg border border-salvia-borde bg-white p-1" aria-label={`Código QR de ${qr.nombre}`} role="img" dangerouslySetInnerHTML={{ __html: qr.svg }} />
          <div className="space-y-2 text-sm">
            <a href={`/socio/${encodeURIComponent(socioId)}`} target="_blank" className="block text-jacaranda underline-offset-2 hover:underline">Abrir la vista del socio</a>
            <button type="button" onClick={escanear} disabled={cargando} className="rounded-lg bg-bosque px-4 py-2 font-semibold text-papel hover:bg-bosque-claro disabled:opacity-70">
              {cargando ? "Validando…" : "Escanear en la entrada"}
            </button>
          </div>
        </div>
      )}
      <div aria-live="assertive">
        {decision && (
          <div className={`aparece mt-3 rounded-xl p-4 text-center text-lg font-bold ${decision.permitido ? "bg-[#1f7a4d] text-white" : "bg-alerta text-white"}`}>
            <span aria-hidden className="mr-2">{decision.permitido ? "✓" : "✕"}</span>
            {decision.mensaje}
          </div>
        )}
      </div>
    </section>
  );
}

function ClaveAcceso({ token, onCambio, onGuardar }: { token: string; onCambio: (t: string) => void; onGuardar: () => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        try { sessionStorage.setItem("gymos-token", token); } catch { /* sin almacenamiento: no pasa nada */ }
        onGuardar();
      }}
      className="mt-4 flex flex-wrap items-end gap-2"
    >
      <label className="flex flex-col text-sm font-medium">
        Clave de acceso
        <input type="password" autoComplete="current-password" value={token} onChange={(e) => onCambio(e.target.value)} className="mt-1 rounded-lg border border-salvia-borde bg-white px-3 py-2" />
      </label>
      <button type="submit" className="rounded-lg bg-bosque px-4 py-2 font-semibold text-papel">Entrar</button>
    </form>
  );
}
