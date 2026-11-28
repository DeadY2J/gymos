"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Panel as DatosPanel } from "@/gimnasio/vista";
import type { Rutina } from "@/gimnasio/rutinas";
import { DURACION_GUION, guion, textoEn, type AccionGuion } from "@/gimnasio/guion";
import { Cronometro } from "./cronometro";
import { Rutinas } from "./rutinas";

type FilaRadar = DatosPanel["radar"][number];
type Decision = { permitido: boolean; mensaje: string; estado?: string; socio?: { nombre: string } };
type Qr = { codigo: string; svg: string; caducaEnSeg: number; nombre: string };
type Orden = { tipo: "escanear" | "limpiar"; n: number };

const SEMANAS = [0, 1, 2, 3, 4, 5, 6];
const VALIDEZ_QR = 60;

const estiloNivel: Record<FilaRadar["nivel"], { franja: string; barra: string; texto: string; cifra: string }> = {
  alto: { franja: "bg-naranja", barra: "bg-naranja", texto: "Riesgo alto", cifra: "text-naranja-texto" },
  medio: { franja: "bg-naranja/45", barra: "bg-naranja/60", texto: "Riesgo medio", cifra: "text-tinta" },
  bajo: { franja: "bg-azul", barra: "bg-azul", texto: "Constante", cifra: "text-tinta-suave" },
  sin_datos: { franja: "bg-hormigon-medio", barra: "bg-hormigon-medio", texto: "Sin datos", cifra: "text-tinta-suave" },
  congelado: { franja: "bg-azul-claro", barra: "bg-azul-claro", texto: "Congelado", cifra: "text-tinta-suave" },
};

const textoCuota: Record<string, string> = { al_dia: "Al día", por_vencer: "Por vencer", en_gracia: "En gracia", vencida: "Vencida", congelada: "Congelada" };

const fecha = (iso: string) => iso.split("-").reverse().join("/");

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
  const [socioPuerta, setSocioPuerta] = useState("martina-rojas");
  const [orden, setOrden] = useState<Orden>({ tipo: "limpiar", n: 0 });
  const [pedidoRutina, setPedidoRutina] = useState(0);

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

  const [enlacePago, setEnlacePago] = useState<{ id: string; url: string } | null>(null);
  async function linkDePago(id: string, planId: string) {
    const r = await pedir("/api/pagos/enlace", { socioId: id, planId });
    if (r?.url) setEnlacePago({ id, url: r.url });
  }

  async function accion(ruta: string, cuerpo: unknown = {}) {
    const p = await pedir(ruta, cuerpo);
    if (p) aplicar(p);
  }

  // Modo presentación: ejecuta el guion de 60 s de PROSPECCION.md sobre los datos de la demo.
  const [presentando, setPresentando] = useState(false);
  const [segundo, setSegundo] = useState(0);
  const hechos = useRef(-1);
  const ejecutar = useRef<(a: AccionGuion) => void>(() => {});
  ejecutar.current = (a: AccionGuion) => {
    const suave: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    const ir = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: suave, block: "start" });
    if (a.tipo === "ir") return a.destino === "inicio" ? window.scrollTo({ top: 0, behavior: suave }) : ir(a.destino);
    if (a.tipo === "socio") return setSocioPuerta(a.id);
    if (a.tipo === "escanear" || a.tipo === "limpiar") return setOrden((o) => ({ tipo: a.tipo as Orden["tipo"], n: o.n + 1 }));
    if (a.tipo === "semana") return viajar(a.n);
    if (a.tipo === "rutina") return setPedidoRutina((n) => n + 1);
    if (a.tipo === "mensaje") {
      setVerTodos(false);
      setAbierto(a.id);
      setTimeout(() => ir(`socio-${a.id}`), 120);
    }
  };

  useEffect(() => {
    if (!presentando) return;
    const inicio = Date.now();
    const t = setInterval(() => {
      const s = (Date.now() - inicio) / 1000;
      setSegundo(Math.min(s, DURACION_GUION));
      while (hechos.current + 1 < guion.length && guion[hechos.current + 1].seg <= s) {
        hechos.current += 1;
        ejecutar.current(guion[hechos.current].accion);
      }
      if (s >= DURACION_GUION) {
        clearInterval(t);
        setPresentando(false);
      }
    }, 200);
    return () => clearInterval(t);
  }, [presentando]);

  async function prepararEscena() {
    setPresentando(false);
    setReproduciendo(false);
    setAbierto(null);
    setVerTodos(false);
    setSocioPuerta("martina-rojas");
    setOrden((o) => ({ tipo: "limpiar", n: o.n + 1 }));
    hechos.current = -1;
    setSegundo(0);
    await accion("/api/demo/reiniciar");
  }

  async function presentar() {
    await prepararEscena();
    setPresentando(true);
  }

  if (!datos) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="marcador text-6xl">GymOS</p>
        <p role="status" aria-live="polite" className="mt-4 text-tinta-suave">{error ?? "Cargando el panel…"}</p>
        {error && <ClaveAcceso token={token} onCambio={setToken} onGuardar={cargar} />}
      </main>
    );
  }

  const semanaActual = Math.round(datos.desplazamiento / 7);
  const enRiesgo = datos.radar.filter((r) => r.nivel === "alto" || r.nivel === "medio");
  const visibles = verTodos ? datos.radar : enRiesgo;

  return (
    <main id="inicio" className={`mx-auto max-w-7xl px-4 sm:px-6 ${presentando || segundo > 0 ? "pb-48" : "pb-10"}`}>
      {/* Cabecera: el nombre del gimnasio a tamaño de rótulo de nave industrial. */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-[6px] border-tinta pb-3 pt-5">
        <div>
          <p className="text-sm font-semibold text-tinta-suave">
            <span className="marcador-fino mr-2 text-lg text-azul">GymOS</span>
            {datos.gimnasio.ciudad}, {datos.hoyTexto}
          </p>
          <h1 className="marcador mt-1 text-[clamp(3.5rem,11vw,8.5rem)]">{datos.gimnasio.nombre}</h1>
        </div>
        {datos.modoDemo && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-tinta-suave">Modo demo con socios ficticios</span>
            <button type="button" onClick={presentar} disabled={presentando} className="bg-tinta px-4 py-2 font-bold text-hormigon-claro hover:bg-azul disabled:opacity-60">
              Modo presentación (60 s)
            </button>
          </div>
        )}
      </header>

      {!datos.modoDemo && <ClaveAcceso token={token} onCambio={setToken} onGuardar={cargar} />}

      {/* Héroe: la puerta del gimnasio. QR que gira con su cronómetro y el marcador del día. */}
      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]" aria-label="Acceso y marcador del día">
        <Recepcion socios={datos.socios} cabeceras={cabeceras} onCambio={cargar} socioId={socioPuerta} onSocio={setSocioPuerta} orden={orden} />
        <dl className="grid grid-cols-2 content-start gap-x-6 gap-y-5">
          <div className="col-span-2 border-b-2 border-tinta/25 pb-4">
            <dt className="font-semibold text-tinta-suave">Socios activos</dt>
            <dd className="marcador text-[clamp(6rem,18vw,13rem)]">{datos.resumen.socios}</dd>
          </div>
          <div>
            <dt className="font-semibold text-tinta-suave">Visitas hoy</dt>
            <dd className="marcador text-[clamp(4rem,9vw,7rem)] text-azul">{datos.resumen.visitasHoy}</dd>
          </div>
          <div className={`px-3 pb-1 pt-2 ${datos.resumen.riesgoAlto > 0 ? "bg-naranja" : ""}`}>
            <dt className="font-semibold">Riesgo alto de baja</dt>
            <dd className="marcador text-[clamp(4rem,9vw,7rem)]">{datos.resumen.riesgoAlto}</dd>
          </div>
          <div className="col-span-2 flex items-baseline gap-3 border-t-2 border-tinta/25 pt-3">
            <dd className="marcador order-2 text-5xl">{datos.resumen.riesgoMedio}</dd>
            <dt className="order-1 font-semibold text-tinta-suave">Riesgo medio</dt>
          </div>
        </dl>
      </section>

      {datos.modoDemo && (
        <section aria-labelledby="t-tiempo" className="sobre-oscuro mt-8 bg-asfalto px-4 py-5 text-hormigon-claro sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <h2 id="t-tiempo" className="scroll-mt-10 marcador text-5xl">Máquina del tiempo</h2>
              <p className="mt-2 text-hormigon">Avanza el calendario y observa cómo el radar detecta a quien empieza a faltar.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setReproduciendo((r) => !r)} className="bg-naranja px-5 py-3 font-bold text-tinta hover:bg-hormigon-claro" aria-pressed={reproduciendo}>
                {reproduciendo ? "Pausar" : semanaActual >= 6 ? "Fin del recorrido" : "Avanzar semanas"}
              </button>
              <button type="button" onClick={() => { setReproduciendo(false); accion("/api/demo/reiniciar"); }} className="border-2 border-hormigon-medio px-5 py-3 font-bold hover:bg-asfalto-claro">
                Reiniciar demo
              </button>
            </div>
          </div>
          {/* Pista de atletismo: siete calles, una por semana. */}
          <div className="mt-5 grid grid-cols-7" role="group" aria-label="Semana de la demo">
            {SEMANAS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setReproduciendo(false); viajar(s); }}
                aria-current={s === semanaActual}
                className={`group relative border-l-2 border-hormigon-medio/40 px-2 pb-2 pt-6 text-left first:border-l-0 ${s <= semanaActual ? "text-hormigon-claro" : "text-hormigon-medio hover:text-hormigon-claro"}`}
              >
                <span className={`absolute inset-x-0 top-0 h-2 transition-all duration-500 ${s < semanaActual ? "bg-azul" : s === semanaActual ? "bg-naranja" : "bg-asfalto-claro"}`} aria-hidden />
                <span className="marcador block text-3xl sm:text-5xl">{s === 0 ? "Hoy" : `+${s}`}</span>
                <span className="sr-only text-xs sm:not-sr-only sm:block">{s === 0 ? " " : s === 1 ? "semana" : "semanas"}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <p role="status" aria-live="polite" className="mt-3 min-h-6 font-semibold text-naranja-texto">{error}</p>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="t-radar">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b-[6px] border-tinta pb-2">
            <h2 id="t-radar" className="scroll-mt-6 marcador text-6xl">Radar de bajas</h2>
            <button type="button" onClick={() => setVerTodos((v) => !v)} className="font-semibold text-azul underline decoration-2 underline-offset-4 hover:text-tinta">
              {verTodos ? "Ver solo en riesgo" : `Ver a todos (${datos.radar.length})`}
            </button>
          </div>
          <p className="mt-2 max-w-prose text-tinta-suave">Quién está dejando de venir, por qué, y un mensaje listo para escribirle uno a uno.</p>
          {visibles.length === 0 && <p className="mt-6 text-lg font-semibold">Nadie en riesgo esta semana.</p>}
          <ul className="mt-3">
            {visibles.map((r) => (
              <FilaSocio
                key={r.socioId}
                r={r}
                abierto={abierto === r.socioId}
                recien={cambiados.has(r.socioId)}
                onAbrir={() => setAbierto(abierto === r.socioId ? null : r.socioId)}
                onEnviado={() => accion(`/api/socios/${encodeURIComponent(r.socioId)}/contacto`)}
                onPlantilla={datos.integraciones.whatsapp ? () => accion(`/api/socios/${encodeURIComponent(r.socioId)}/whatsapp`) : undefined}
              />
            ))}
          </ul>
        </section>

        <div className="space-y-8">
          <section aria-labelledby="t-cobros" className="losa p-4">
            <h2 id="t-cobros" className="marcador text-4xl">Cuotas por cobrar</h2>
            {datos.porCobrar.length === 0 && <p className="mt-2 text-tinta-suave">No hay cuotas por vencer.</p>}
            <ul className="mt-2 divide-y-2 divide-hormigon">
              {datos.porCobrar.slice(0, 8).map((c) => {
                const urgente = c.estado === "vencida" || c.estado === "en_gracia";
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span className="flex min-w-0 flex-col">
                      <span className="font-semibold">{c.nombre}</span>
                      <span className={`text-sm font-medium ${urgente ? "text-naranja-texto" : "text-tinta-suave"}`}>{textoCuota[c.estado]}, vence el {fecha(c.vencimiento)}</span>
                    </span>
                    <button type="button" onClick={() => accion(`/api/socios/${encodeURIComponent(c.id)}/renovar`, { planId: c.planId })} className="shrink-0 border-2 border-tinta px-3 py-1.5 text-sm font-bold hover:bg-tinta hover:text-hormigon-claro">
                      Cobrar y renovar
                    </button>
                    {datos.integraciones.mercadoPago && (
                      <button type="button" onClick={() => linkDePago(c.id, c.planId)} className="shrink-0 bg-azul px-3 py-1.5 text-sm font-bold text-white hover:bg-tinta">
                        Link de pago
                      </button>
                    )}
                    {enlacePago?.id === c.id && (
                      <a href={enlacePago.url} target="_blank" rel="noopener noreferrer" className="basis-full break-all text-xs text-azul underline">{enlacePago.url}</a>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="t-ranking">
            <h2 id="t-ranking" className="scroll-mt-6 marcador border-b-[6px] border-tinta pb-2 text-4xl">Ranking del mes</h2>
            <p className="mt-2 text-sm text-tinta-suave">Por constancia, no por fuerza. Solo quien aceptó salir, con su apodo.</p>
            <ol className="mt-3">
              {datos.ranking.map((f) => (
                <li key={f.socioId} className={`flex items-center gap-3 border-b border-tinta/15 py-1.5 ${f.posicion === 1 ? "bg-azul px-2 text-white" : ""}`}>
                  <span className={`marcador w-10 shrink-0 text-right ${f.posicion <= 3 ? "text-5xl" : "text-3xl text-tinta-suave"} ${f.posicion === 1 ? "text-white" : ""}`}>{f.posicion}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{f.apodo}</span>
                    <span className={`text-xs ${f.posicion === 1 ? "text-white/85" : "text-tinta-suave"}`}>{f.visitas} visitas{f.mejorRacha > 1 ? `, racha de ${f.mejorRacha} semanas` : ""}</span>
                  </span>
                  <span className="marcador-fino text-3xl" aria-label={`${f.puntos} puntos`}>{f.puntos}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <Rutinas pedido={pedidoRutina} cabeceras={cabeceras} alGenerar={(r: Rutina | null, e?: string) => (e ? setError(e) : r && setError(null))} />

      {datos.modoDemo && (presentando || segundo > 0) && (
        <Presentacion segundo={segundo} presentando={presentando} onDetener={() => setPresentando(false)} onReiniciar={prepararEscena} onSalir={() => { setPresentando(false); setSegundo(0); }} />
      )}

      <footer className="mt-12 border-t-2 border-tinta/25 pt-4 text-sm text-tinta-suave">
        GymOS, de la Fábrica. Los mensajes se envían a mano, de uno en uno. {datos.modoDemo ? "Datos ficticios de demostración." : ""}
      </footer>
    </main>
  );
}

function FilaSocio({ r, abierto, recien, onAbrir, onEnviado, onPlantilla }: { r: FilaRadar; abierto: boolean; recien: boolean; onAbrir: () => void; onEnviado: () => void; onPlantilla?: () => void }) {
  const e = estiloNivel[r.nivel];
  const idDetalle = `detalle-${r.socioId}`;
  return (
    <li id={`socio-${r.socioId}`} className={`relative scroll-mt-4 border-b-2 border-tinta/15 py-3 pl-5 ${recien ? "recien" : ""}`}>
      <span className={`absolute inset-y-2 left-0 w-2 ${e.franja}`} aria-hidden />
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-lg font-bold">{r.nombre}</span>
            <span className="text-sm font-semibold">{e.texto}</span>
          </p>
          <p className="text-sm text-tinta-suave">{r.plan}, cuota {textoCuota[r.estadoCuota].toLowerCase()}</p>
          {r.senales.length > 0 && <p className="mt-1">{r.senales[0].texto}</p>}
          {r.nivel === "sin_datos" && <p className="mt-1 text-tinta-suave">Aún no hay historial suficiente para saber qué es lo habitual en este socio.</p>}
        </div>
        <span className={`marcador shrink-0 text-6xl ${e.cifra}`} aria-label={`Riesgo ${r.score} de 100`}>{r.score}</span>
      </div>
      <div className="mt-2 h-1.5 bg-tinta/10" aria-hidden>
        <div className={`h-full ${e.barra} transition-all duration-700`} style={{ width: `${Math.max(r.score, 2)}%` }} />
      </div>
      {(r.nivel === "alto" || r.nivel === "medio") && (
        <div className="mt-3">
          {r.mensaje ? (
            <button type="button" onClick={onAbrir} aria-expanded={abierto} aria-controls={idDetalle} className="bg-tinta px-4 py-2 text-sm font-bold text-hormigon-claro hover:bg-azul">
              {abierto ? "Ocultar mensaje" : "Preparar WhatsApp"}
            </button>
          ) : (
            <p className="text-sm text-tinta-suave">{r.ultimoContacto ? `Mensaje enviado el ${fecha(r.ultimoContacto)}.` : !r.permiso.ok ? r.permiso.motivo : ""}</p>
          )}
        </div>
      )}
      {abierto && r.mensaje && (
        <div id={idDetalle} className="aparece mt-3 bg-asfalto p-4 text-hormigon-claro sobre-oscuro">
          {r.senales.length > 1 && (
            <ul className="mb-3 space-y-0.5 text-sm text-hormigon">
              {r.senales.map((s) => <li key={s.id}><span className="marcador-fino mr-2 text-xl text-naranja">+{s.puntos}</span>{s.texto}</li>)}
            </ul>
          )}
          <p className="max-w-prose border-l-4 border-naranja bg-asfalto-claro p-3">{r.mensaje.texto}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={r.mensaje.enlace} target="_blank" rel="noopener noreferrer" className="bg-acceso px-4 py-2 text-sm font-bold text-white hover:bg-white hover:text-tinta">
              Abrir WhatsApp
            </a>
            <button type="button" onClick={onEnviado} className="border-2 border-hormigon-medio px-4 py-2 text-sm font-bold hover:bg-asfalto-claro">
              Marcar como enviado
            </button>
            {onPlantilla && (
              <button type="button" onClick={onPlantilla} className="border-2 border-hormigon-medio px-4 py-2 text-sm font-bold hover:bg-asfalto-claro">
                Enviar plantilla aprobada por la API
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/** La puerta del gimnasio: QR del socio que gira cada minuto con su cronómetro, y el escáner de la entrada. */
function Recepcion({ socios, cabeceras, onCambio, socioId, onSocio, orden }: { socios: { id: string; nombre: string }[]; cabeceras: () => HeadersInit; onCambio: () => void; socioId: string; onSocio: (id: string) => void; orden: Orden }) {
  const [qr, setQr] = useState<Qr | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const [restante, setRestante] = useState(0);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [cargando, setCargando] = useState(false);

  // Carga el QR del socio elegido y lo renueva solo cuando caduca (cada 60 s).
  useEffect(() => {
    let vivo = true;
    let temporizador: ReturnType<typeof setTimeout>;
    async function cargarQr() {
      const res = await fetch(`/api/socios/${encodeURIComponent(socioId)}/qr`, { headers: cabeceras() });
      const json = await res.json().catch(() => ({}));
      if (!vivo) return;
      if (!res.ok) {
        setQr(null);
        setDecision({ permitido: false, mensaje: json.error ?? "No se pudo generar el QR." });
        return;
      }
      setQr(json);
      setVuelta((v) => v + 1);
      setRestante(json.caducaEnSeg);
      temporizador = setTimeout(cargarQr, json.caducaEnSeg * 1000 + 300);
    }
    cargarQr();
    return () => {
      vivo = false;
      clearTimeout(temporizador);
    };
  }, [socioId, cabeceras]);

  useEffect(() => {
    const t = setInterval(() => setRestante((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // Órdenes del modo presentación: escanear el QR que se ve o volver a mostrarlo.
  const escanearRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (orden.n === 0) return;
    if (orden.tipo === "escanear") escanearRef.current();
    else setDecision(null);
  }, [orden]);
  useEffect(() => setDecision(null), [socioId]);

  async function escanear() {
    if (!qr) return;
    setCargando(true);
    const res = await fetch("/api/acceso", { method: "POST", headers: cabeceras(), body: JSON.stringify({ codigo: qr.codigo }) });
    const json = await res.json().catch(() => ({}));
    setDecision(res.ok ? json : { permitido: false, mensaje: json.error ?? "No se pudo validar." });
    setCargando(false);
    onCambio();
  }
  escanearRef.current = escanear;

  return (
    <section aria-labelledby="t-recepcion" className="sobre-oscuro bg-asfalto p-4 text-hormigon-claro sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="t-recepcion" className="marcador text-4xl">Acceso con QR</h2>
        <p className="text-sm text-hormigon">Cambia cada minuto: una captura no sirve.</p>
      </div>
      <div className="mt-4 grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <div className="relative mx-auto w-full max-w-[22rem]">
          <Cronometro restante={qr ? restante : 0} total={VALIDEZ_QR}>
            {qr ? (
              /* SVG generado en nuestro servidor por la librería qrcode a partir de un código firmado. */
              <div key={vuelta} className="gira aspect-square w-full bg-white p-2" role="img" aria-label={`Código QR de ${qr.nombre}`} dangerouslySetInnerHTML={{ __html: qr.svg }} />
            ) : (
              <div className="aspect-square w-full bg-asfalto-claro" />
            )}
          </Cronometro>
          {decision && (
            <div aria-hidden className={`golpe absolute inset-[13%] grid place-items-center ${decision.permitido ? "bg-acceso" : "bg-naranja text-tinta"}`}>
              <span className="marcador text-[clamp(4rem,14vw,8rem)]">{decision.permitido ? "Pasa" : "Alto"}</span>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <p aria-live="off">
            <span className="marcador block text-8xl tabular-nums">{qr ? restante : "--"}</span>
            <span className="text-sm text-hormigon">segundos para que el código cambie</span>
          </p>
          <label className="flex flex-col text-sm font-semibold">
            Socio en la puerta
            <select value={socioId} onChange={(e) => onSocio(e.target.value)} className="mt-1 border-2 border-hormigon-medio bg-asfalto-claro px-3 py-2 text-base text-hormigon-claro">
              {socios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </label>
          <button type="button" onClick={escanear} disabled={cargando || !qr} className="w-full bg-azul px-4 py-3 text-lg font-bold text-white hover:bg-hormigon-claro hover:text-tinta disabled:opacity-60">
            {cargando ? "Validando…" : "Escanear en la entrada"}
          </button>
          {decision && <button type="button" onClick={() => setDecision(null)} className="w-full border-2 border-hormigon-medio px-4 py-2 text-sm font-bold hover:bg-asfalto-claro">Volver a ver el QR</button>}
          <a href={`/socio/${encodeURIComponent(socioId)}`} target="_blank" className="inline-block text-sm font-semibold text-azul-claro underline decoration-2 underline-offset-4 hover:text-white">Abrir la vista del socio en el móvil</a>
        </div>
      </div>
      <div aria-live="assertive">
        {decision && (
          <p className={`golpe mt-4 px-4 py-3 text-lg font-bold ${decision.permitido ? "bg-acceso text-white" : "bg-naranja text-tinta"}`}>
            {decision.mensaje}
          </p>
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
      <label className="flex flex-col text-sm font-semibold">
        Clave de acceso
        <input type="password" autoComplete="current-password" value={token} onChange={(e) => onCambio(e.target.value)} className="mt-1 border-2 border-tinta bg-hormigon-claro px-3 py-2" />
      </label>
      <button type="submit" className="bg-tinta px-4 py-2.5 font-bold text-hormigon-claro">Entrar</button>
    </form>
  );
}

/** Barra del modo presentación: el texto del guion, el tiempo y los controles. */
function Presentacion({ segundo, presentando, onDetener, onReiniciar, onSalir }: { segundo: number; presentando: boolean; onDetener: () => void; onReiniciar: () => void; onSalir: () => void }) {
  const texto = textoEn(segundo);
  return (
    <section aria-label="Modo presentación" className="sobre-oscuro fixed inset-x-0 bottom-0 z-20 bg-tinta text-hormigon-claro">
      <div className="h-2 bg-asfalto-claro" aria-hidden>
        <div className="h-full bg-naranja" style={{ width: `${(segundo / DURACION_GUION) * 100}%` }} />
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
        <span className="marcador w-20 shrink-0 text-6xl tabular-nums" aria-label={`Segundo ${Math.floor(segundo)} de ${DURACION_GUION}`}>{Math.floor(segundo)}</span>
        <p aria-live="polite" className="min-w-0 flex-1 basis-64 text-xl font-semibold sm:text-2xl">{presentando || segundo < DURACION_GUION ? texto : "Fin de la presentación."}</p>
        <div className="flex flex-wrap gap-2">
          {presentando && <button type="button" onClick={onDetener} className="border-2 border-hormigon-medio px-4 py-2 font-bold hover:bg-asfalto-claro">Detener</button>}
          <button type="button" onClick={onReiniciar} className="bg-naranja px-4 py-2 font-bold text-tinta hover:bg-hormigon-claro">Reiniciar</button>
          {!presentando && <button type="button" onClick={onSalir} className="border-2 border-hormigon-medio px-4 py-2 font-bold hover:bg-asfalto-claro">Cerrar</button>}
        </div>
      </div>
    </section>
  );
}
