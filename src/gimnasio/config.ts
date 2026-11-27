/**
 * Configuración del gimnasio: lo ÚNICO que cambia al adaptar GymOS a otro cliente.
 * Gimnasio ficticio (Forja Gym, Ciudad de México) para la demo.
 */
import type { Plan } from "./tipos";

export const gimnasio = {
  nombre: "Forja Gym",
  ciudad: "Ciudad de México",
  moneda: { codigo: "MXN", simbolo: "$" },
  /** Quién firma los mensajes (se puede sobrescribir con GYMOS_REMITENTE_NOMBRE). */
  remitente: "el equipo de Forja Gym",
};

export const planes: Plan[] = [
  { id: "mensual", nombre: "Mensual", precio: 650, duracionDias: 30 },
  { id: "plus", nombre: "Plus (con clases)", precio: 850, duracionDias: 30 },
  { id: "estudiante", nombre: "Estudiante", precio: 500, duracionDias: 30 },
];

export const acceso = {
  /** El QR del socio cambia cada tantos segundos: una captura de pantalla caduca. */
  qrValidezSegundos: 60,
  /** Días tras el vencimiento en que aún se deja entrar avisando. */
  diasGracia: 3,
  /** Avisar de que la cuota vence en estos días o menos. */
  diasAvisoVencimiento: 5,
  maxDiasCongelacion: 30,
};

/** Radar de bajas: qué mide y cuánto pesa cada señal (suman como máximo 100). */
export const riesgo = {
  ventanaRecienteDias: 21,
  ventanaBaseDias: 56,
  /** Para hablar de "lo habitual" hacen falta datos: antigüedad y visitas mínimas. */
  minAntiguedadDias: 35,
  minVisitas: 6,
  /** Ritmo habitual mínimo (visitas/semana) para poder hablar de caída. */
  minRitmoHabitual: 1,
  diasSinArranque: 14,
  pesos: { ausencia: 40, caidaRitmo: 25, cuotaVencida: 30, renovacionCercana: 15, sinArranque: 50 },
  umbrales: { alto: 60, medio: 35 },
};

export const contacto = {
  maxMensajesPorDia: 10,
  /** No volver a escribir a un socio antes de estos días. */
  diasEntreMensajes: 14,
};

export const ranking = {
  puntosPorVisita: 10,
  /** Visitas por semana para contar la semana como "cumplida". */
  metaSemanal: 3,
  bonusSemanaCumplida: 20,
  bonusPorSemanaDeRacha: 5,
  maxBonusRacha: 25,
};
