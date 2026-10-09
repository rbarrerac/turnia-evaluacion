/**
 * Módulo: Pruebas unitarias de utilidades de fechas
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 */

import { calcularFin, generarIntervalos, haySuperposicion } from '../../src/utilidades/fechas.js';

function hora(horas, minutos = 0) {
  return new Date(Date.UTC(1970, 0, 1, horas, minutos));
}

describe('calcularFin', () => {
  test('suma la duración en minutos a la hora de inicio', () => {
    const inicio = new Date('2026-09-21T09:00:00.000Z');
    const fin = calcularFin(inicio, 45);
    expect(fin.toISOString()).toBe('2026-09-21T09:45:00.000Z');
  });

  test('cruza la hora si la duración lo requiere', () => {
    const inicio = new Date('2026-09-21T23:30:00.000Z');
    const fin = calcularFin(inicio, 90);
    expect(fin.toISOString()).toBe('2026-09-22T01:00:00.000Z');
  });

  test('no modifica la fecha original (no muta el argumento)', () => {
    const inicio = new Date('2026-09-21T09:00:00.000Z');
    calcularFin(inicio, 60);
    expect(inicio.toISOString()).toBe('2026-09-21T09:00:00.000Z');
  });
});

describe('generarIntervalos', () => {
  test('genera los horarios de inicio posibles dentro de la jornada (ejemplo 9:00–12:00, 60 min)', () => {
    const intervalos = generarIntervalos(hora(9), hora(12), 60);
    expect(intervalos.map((fecha) => fecha.getUTCHours())).toEqual([9, 10, 11]);
  });

  test('el último intervalo del día no excede la hora de cierre', () => {
    const intervalos = generarIntervalos(hora(9), hora(10, 30), 45);
    const ultimo = intervalos[intervalos.length - 1];
    const finDelUltimo = calcularFin(ultimo, 45);
    expect(finDelUltimo.getTime()).toBeLessThanOrEqual(hora(10, 30).getTime());
    expect(intervalos.map((fecha) => `${fecha.getUTCHours()}:${fecha.getUTCMinutes()}`)).toEqual([
      '9:0',
      '9:45',
    ]);
  });

  test('devuelve lista vacía si la duración no cabe ni una vez en la jornada', () => {
    const intervalos = generarIntervalos(hora(9), hora(9, 30), 60);
    expect(intervalos).toEqual([]);
  });

  test('devuelve lista vacía si la hora de inicio es igual o posterior a la de cierre', () => {
    expect(generarIntervalos(hora(18), hora(18), 30)).toEqual([]);
    expect(generarIntervalos(hora(19), hora(18), 30)).toEqual([]);
  });
});

describe('haySuperposicion', () => {
  test('dos rangos que no se tocan no se superponen', () => {
    expect(haySuperposicion(hora(9), hora(10), hora(11), hora(12))).toBe(false);
  });

  test('una cita que termina exactamente cuando empieza otra NO se superpone (límite)', () => {
    expect(haySuperposicion(hora(9), hora(10), hora(10), hora(11))).toBe(false);
  });

  test('una cita que invade un minuto de otra SÍ se superpone (límite)', () => {
    expect(haySuperposicion(hora(9), hora(10), hora(9, 59), hora(11))).toBe(true);
  });

  test('un rango contenido por completo dentro de otro se superpone', () => {
    expect(haySuperposicion(hora(9), hora(12), hora(10), hora(11))).toBe(true);
  });

  test('es simétrica: el orden de los argumentos A y B no cambia el resultado', () => {
    const a = [hora(9), hora(10)];
    const b = [hora(9, 30), hora(10, 30)];
    expect(haySuperposicion(...a, ...b)).toBe(haySuperposicion(...b, ...a));
  });
});
