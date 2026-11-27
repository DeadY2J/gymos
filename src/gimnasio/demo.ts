/**
 * Datos de demo: socios ficticios con perfiles de comportamiento y su historial de visitas,
 * generado de forma determinista para cualquier "hoy". Así la máquina del tiempo de la demo
 * enseña siempre lo mismo: los que se van a ir empiezan a faltar y el radar los detecta.
 * Los teléfonos usan el rango 555-0100…0199, reservado para ficción.
 */
import { type Dia, diasEntre, sumarDias } from "./fechas";
import type { Nivel, Objetivo, Socio } from "./tipos";

export const DIA_BASE_DEMO: Dia = "2026-11-27";

type Perfil = {
  /** Visitas por semana mientras viene con normalidad. */
  frecuencia: number;
  /** Alta relativa al día base (negativo = antes). */
  alta: number;
  /** A partir de este día (relativo al base) cambia su comportamiento. */
  corte?: number;
  /** Frecuencia tras el corte (0 = deja de venir). */
  frecuenciaTras?: number;
  /** Si deja de pagar al cortar. */
  dejaDePagar?: boolean;
  congelado?: boolean;
};

type FichaDemo = { id: string; nombre: string; apodo?: string; plan: string; objetivo: Objetivo; nivel: Nivel; perfil: Perfil; noContactar?: boolean };

const fichas: FichaDemo[] = [
  // En fuga desde hace semanas: ya rojos el día base.
  { id: "lucia-herrera", nombre: "Lucía Herrera", apodo: "Lu", plan: "plus", objetivo: "ganar_musculo", nivel: "intermedio", perfil: { frecuencia: 3.5, alta: -200, corte: -24, frecuenciaTras: 0, dejaDePagar: true } },
  { id: "diego-salazar", nombre: "Diego Salazar", plan: "mensual", objetivo: "perder_grasa", nivel: "principiante", perfil: { frecuencia: 3, alta: -120, corte: -16, frecuenciaTras: 0 } },
  // Se irán durante la máquina del tiempo (semanas 1 a 4).
  { id: "valentina-rios", nombre: "Valentina Ríos", apodo: "Vale", plan: "mensual", objetivo: "salud_general", nivel: "intermedio", perfil: { frecuencia: 4, alta: -300, corte: 2, frecuenciaTras: 0, dejaDePagar: true } },
  { id: "mateo-quiroga", nombre: "Mateo Quiroga", apodo: "Mate", plan: "plus", objetivo: "ganar_musculo", nivel: "avanzado", perfil: { frecuencia: 5, alta: -400, corte: 8, frecuenciaTras: 0.5 } },
  { id: "camila-ortega", nombre: "Camila Ortega", plan: "estudiante", objetivo: "perder_grasa", nivel: "principiante", perfil: { frecuencia: 3, alta: -150, corte: 15, frecuenciaTras: 0, dejaDePagar: true } },
  { id: "andres-pineda", nombre: "Andrés Pineda", apodo: "Pine", plan: "mensual", objetivo: "ganar_musculo", nivel: "intermedio", perfil: { frecuencia: 4, alta: -250, corte: 22, frecuenciaTras: 0 } },
  // Caída gradual: sigue viniendo, pero mucho menos.
  { id: "sofia-mendez", nombre: "Sofía Méndez", apodo: "Sofi", plan: "plus", objetivo: "salud_general", nivel: "intermedio", perfil: { frecuencia: 4, alta: -180, corte: -14, frecuenciaTras: 1 } },
  { id: "javier-castro", nombre: "Javier Castro", plan: "mensual", objetivo: "ganar_musculo", nivel: "principiante", perfil: { frecuencia: 3, alta: -90, corte: 5, frecuenciaTras: 1 } },
  // Altas que no arrancan y novatos sin historial (sin datos).
  { id: "paula-guzman", nombre: "Paula Guzmán", plan: "mensual", objetivo: "perder_grasa", nivel: "principiante", perfil: { frecuencia: 0, alta: -20 } },
  { id: "tomas-vera", nombre: "Tomás Vera", plan: "estudiante", objetivo: "salud_general", nivel: "principiante", perfil: { frecuencia: 0, alta: -5 } },
  { id: "renata-flores", nombre: "Renata Flores", apodo: "Rena", plan: "mensual", objetivo: "ganar_musculo", nivel: "principiante", perfil: { frecuencia: 3, alta: -9 } },
  // Congelada por viaje: no cuenta como riesgo.
  { id: "ines-campos", nombre: "Inés Campos", plan: "plus", objetivo: "salud_general", nivel: "intermedio", perfil: { frecuencia: 3, alta: -220, corte: -6, frecuenciaTras: 0, congelado: true } },
  // Ocasional por costumbre: viene poco, pero siempre igual.
  { id: "hugo-navarro", nombre: "Hugo Navarro", plan: "mensual", objetivo: "salud_general", nivel: "principiante", perfil: { frecuencia: 0.6, alta: -260 } },
  // Pidió no recibir mensajes (en fuga, pero no se le escribe).
  { id: "ernesto-luna", nombre: "Ernesto Luna", plan: "mensual", objetivo: "perder_grasa", nivel: "principiante", perfil: { frecuencia: 3, alta: -140, corte: -20, frecuenciaTras: 0 }, noContactar: true },
];

// Constantes: la mayoría del gimnasio.
const constantes: [string, string | undefined, number][] = [
  ["Martina Rojas", "Tina", 4], ["Santiago Paredes", "Santi", 5], ["Isabella Cruz", "Isa", 3], ["Nicolás Duarte", "Nico", 4],
  ["Gabriela Soto", "Gaby", 3], ["Daniel Acosta", "Dani", 5], ["Mariana Vega", undefined, 3], ["Sebastián Ibarra", "Sebas", 6],
  ["Fernanda Lara", "Fer", 4], ["Emiliano Reyes", undefined, 3], ["Carolina Medina", "Caro", 4], ["Joaquín Fuentes", "Joaco", 3],
  ["Ximena Cordero", "Xime", 5], ["Ricardo Peña", undefined, 3], ["Daniela Morales", "Dany", 4], ["Alejandro Ruiz", "Alex", 3],
  ["Victoria Salas", "Vicky", 4], ["Gonzalo Ávila", undefined, 3], ["Natalia Bravo", "Naty", 4], ["Felipe Aguirre", "Pipe", 5],
];
constantes.forEach(([nombre, apodo, frecuencia], i) => {
  fichas.push({
    id: nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-"),
    nombre,
    apodo,
    plan: ["mensual", "plus", "estudiante"][i % 3],
    objetivo: (["ganar_musculo", "perder_grasa", "salud_general"] as const)[i % 3],
    nivel: (["principiante", "intermedio", "avanzado"] as const)[i % 3],
    perfil: { frecuencia, alta: -90 - ((i * 37) % 300) },
  });
});

/** Número pseudoaleatorio estable en [0, 1) para una clave (FNV-1a). */
function azar(clave: string): number {
  let h = 2166136261;
  for (let i = 0; i < clave.length; i++) {
    h ^= clave.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

const relativo = (n: number) => sumarDias(DIA_BASE_DEMO, n);

/** Fin del ciclo de 30 días que contiene `dia`, contando desde el alta. */
function finDeCiclo(alta: Dia, dia: Dia): Dia {
  const ciclos = Math.floor(Math.max(0, diasEntre(alta, dia)) / 30) + 1;
  return sumarDias(alta, ciclos * 30 - 1);
}

function frecuenciaEn(p: Perfil, dia: Dia): number {
  return p.corte !== undefined && diasEntre(relativo(p.corte), dia) >= 0 ? (p.frecuenciaTras ?? 0) : p.frecuencia;
}

export function visitasDemo(ficha: FichaDemo, hasta: Dia): Dia[] {
  const alta = relativo(ficha.perfil.alta);
  const dias: Dia[] = [];
  for (let d = sumarDias(alta, 1); d <= hasta; d = sumarDias(d, 1)) {
    if (azar(`${ficha.id}:${d}`) < frecuenciaEn(ficha.perfil, d) / 7) dias.push(d);
  }
  return dias;
}

export function socioDemo(ficha: FichaDemo, hoy: Dia): Socio {
  const p = ficha.perfil;
  const alta = relativo(p.alta);
  // Quien sigue pagando renueva cada ciclo; quien deja de pagar se queda con el último ciclo antes del corte.
  const pagaHasta = p.dejaDePagar && p.corte !== undefined && relativo(p.corte) < hoy ? relativo(p.corte) : hoy;
  return {
    id: ficha.id,
    nombre: ficha.nombre,
    apodo: ficha.apodo,
    telefono: `+52 55 555 01${String(fichas.indexOf(ficha)).padStart(2, "0")}`,
    planId: ficha.plan,
    alta,
    vencimiento: finDeCiclo(alta, pagaHasta),
    congeladoHasta: p.congelado && p.corte !== undefined ? sumarDias(relativo(p.corte), 40) : undefined,
    noContactar: ficha.noContactar ?? false,
    rankingVisible: Boolean(ficha.apodo),
    objetivo: ficha.objetivo,
    nivel: ficha.nivel,
  };
}

/** Socios dados de alta hasta `hoy` y su historial de visitas. */
export function datosDemo(hoy: Dia): { socios: Socio[]; visitas: Map<string, Dia[]> } {
  const activas = fichas.filter((f) => relativo(f.perfil.alta) <= hoy);
  return {
    socios: activas.map((f) => socioDemo(f, hoy)),
    visitas: new Map(activas.map((f) => [f.id, visitasDemo(f, hoy)])),
  };
}

export const fichasDemo: readonly FichaDemo[] = fichas;
