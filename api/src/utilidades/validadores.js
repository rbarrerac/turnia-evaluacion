/**
 * Módulo: Funciones de validación de datos de entrada
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 * Modificado por: Ronald — 07/10/2026 (Incremento 7A: validadores de UUID, fecha, instante y hora)
 */

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LONGITUD_MINIMA_CONTRASENA = 8;

export function esCorreoValido(correo) {
  return typeof correo === 'string' && PATRON_CORREO.test(correo.trim());
}

export function esContrasenaValida(contrasena) {
  return typeof contrasena === 'string' && contrasena.length >= LONGITUD_MINIMA_CONTRASENA;
}

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const PATRON_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function esUuidValido(valor) {
  return typeof valor === 'string' && PATRON_UUID.test(valor);
}

// Fecha de calendario "AAAA-MM-DD" que existe de verdad (rechaza, p. ej., 2026-02-30).
// Se interpreta en UTC, igual que el resto del proyecto (ver GestorDeReservas).
export function esFechaTextoValida(valor) {
  if (typeof valor !== 'string') return false;
  const coincidencia = PATRON_FECHA.exec(valor);
  if (!coincidencia) return false;
  const [, anio, mes, dia] = coincidencia.map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio
    && fecha.getUTCMonth() === mes - 1
    && fecha.getUTCDate() === dia;
}

// Instante (Date válida o texto que Date entienda, p. ej. ISO 8601 "2026-10-12T13:00:00.000Z").
export function esInstanteValido(valor) {
  if (valor instanceof Date) return !Number.isNaN(valor.getTime());
  if (typeof valor !== 'string' || valor.trim().length === 0) return false;
  return !Number.isNaN(new Date(valor).getTime());
}

// Hora "HH:MM" en formato de 24 horas (00:00 a 23:59).
export function esHoraValida(valor) {
  return typeof valor === 'string' && PATRON_HORA.test(valor);
}
