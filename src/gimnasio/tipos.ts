import type { Dia } from "./fechas";

export type Plan = { id: string; nombre: string; precio: number; duracionDias: number };

export type Objetivo = "perder_grasa" | "ganar_musculo" | "salud_general";
export type Nivel = "principiante" | "intermedio" | "avanzado";

export type Socio = {
  id: string;
  nombre: string;
  /** Nombre público en el ranking. Solo existe si el socio lo aceptó. */
  apodo?: string;
  telefono: string;
  planId: string;
  alta: Dia;
  /** Último día con cuota pagada (inclusive). */
  vencimiento: Dia;
  /** Si está congelado, hasta qué día (inclusive). */
  congeladoHasta?: Dia;
  /** Pidió no recibir mensajes. Se respeta siempre. */
  noContactar: boolean;
  rankingVisible: boolean;
  objetivo?: Objetivo;
  nivel?: Nivel;
};

/** Una visita = un día con acceso permitido (varios escaneos el mismo día cuentan una vez). */
export type Visita = { socioId: string; dia: Dia };

export type Pago = { socioId: string; dia: Dia; importe: number; medio: "efectivo" | "transferencia" | "mercadopago" };
