/**
 * Módulo: Utilidades de cálculo de fechas y rangos horarios
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 * Modificado por: Ronald — 07/10/2026 (Incremento 7A: helpers de día/hora en UTC compartidos
 *   por GestorDeReservas y GestorDeHorarios, movidos aquí sin cambiar su comportamiento)
 */

const MILISEGUNDOS_POR_MINUTO = 60000;
export const UN_DIA_EN_MS = 24 * 60 * MILISEGUNDOS_POR_MINUTO;

export function calcularFin(iniciaEn, duracionMinutos) {
  return new Date(new Date(iniciaEn).getTime() + duracionMinutos * MILISEGUNDOS_POR_MINUTO);
}

export function generarIntervalos(horaInicio, horaFin, duracionMinutos) {
  const intervalos = [];
  const finJornada = new Date(horaFin).getTime();
  let inicioCandidato = new Date(horaInicio).getTime();

  while (inicioCandidato + duracionMinutos * MILISEGUNDOS_POR_MINUTO <= finJornada) {
    intervalos.push(new Date(inicioCandidato));
    inicioCandidato += duracionMinutos * MILISEGUNDOS_POR_MINUTO;
  }

  return intervalos;
}

export function haySuperposicion(inicioA, finA, inicioB, finB) {
  return new Date(inicioA).getTime() < new Date(finB).getTime()
    && new Date(inicioB).getTime() < new Date(finA).getTime();
}

// Todos los cálculos de horario se hacen en UTC de forma consistente en todo el proyecto
// (así se sembraron horarios_atencion y así se envían las fechas desde el frontend).
// Estas dos funciones vivían dentro de GestorDeReservas; se movieron aquí, idénticas,
// para que GestorDeHorarios (RN-09) use exactamente la misma convención.
export function descomponerFecha(fecha) {
  const texto = new Date(fecha).toISOString().slice(0, 10);
  const [anio, mes, dia] = texto.split('-').map(Number);
  const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia));
  return { fechaUtc, diaSemana: fechaUtc.getUTCDay() };
}

export function combinarFechaConHora(fechaUtc, horaDeReferencia) {
  const hora = new Date(horaDeReferencia);
  return new Date(Date.UTC(
    fechaUtc.getUTCFullYear(),
    fechaUtc.getUTCMonth(),
    fechaUtc.getUTCDate(),
    hora.getUTCHours(),
    hora.getUTCMinutes(),
    hora.getUTCSeconds(),
  ));
}

// Conversión entre "HH:MM" y el valor que Prisma usa para columnas @db.Time
// (un Date del 1970-01-01 en UTC), igual que hace prisma/semilla.js.
export function textoAHora(textoHora) {
  return new Date(`1970-01-01T${textoHora}:00.000Z`);
}

export function horaATexto(hora) {
  return new Date(hora).toISOString().slice(11, 16);
}

// Fecha de calendario (columna @db.Date o medianoche UTC) como "AAAA-MM-DD".
export function fechaATexto(fecha) {
  return new Date(fecha).toISOString().slice(0, 10);
}
