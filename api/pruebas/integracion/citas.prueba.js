/**
 * Módulo: Pruebas de integración de /api/citas
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 * Modificado por: Ronald — 07/10/2026 (Incremento 7A: FECHA_PASADA, SERVICIO_INACTIVO y DATOS_INVALIDOS)
 */

import request from 'supertest';
import aplicacion from '../../src/aplicacion.js';
import prisma from '../../src/configuracion/baseDeDatos.js';
import { generarToken } from '../../src/utilidades/generadorDeTokens.js';

function proximoLunes(diasMinimos = 1) {
  const hoy = new Date();
  const hoyUtc = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
  let candidato = new Date(hoyUtc.getTime() + diasMinimos * 24 * 60 * 60000);
  while (candidato.getUTCDay() !== 1) {
    candidato = new Date(candidato.getTime() + 24 * 60 * 60000);
  }
  return candidato;
}

function horaEn(fechaUtc, horas, minutos = 0) {
  return new Date(Date.UTC(
    fechaUtc.getUTCFullYear(),
    fechaUtc.getUTCMonth(),
    fechaUtc.getUTCDate(),
    horas,
    minutos,
  ));
}

function comoFechaTexto(fechaUtc) {
  return fechaUtc.toISOString().slice(0, 10);
}

// Próximo lunes: día laborable garantizado por la semilla (lun–sáb 9:00–18:00).
// Usa horas (13:00, 14:00, 16:00) distintas de las que usan las pruebas unitarias
// de GestorDeReservas (9:00 y 10:00) en el mismo día, para que ambas suites puedan
// correr en paralelo sin chocar entre sí contra la restricción EXCLUDE compartida.
const diaLaborable = proximoLunes(1);

let servicioPrueba;
let servicioInactivo;
let clientaPrueba;
let tokenClienta;
let tokenAdministradora;
const idsDeCitasCreadas = [];

beforeAll(async () => {
  servicioPrueba = await prisma.servicios.create({
    data: {
      nombre: `Servicio integración citas ${Date.now()}`,
      duracion_minutos: 20,
      precio: 15,
      activo: true,
    },
  });

  servicioInactivo = await prisma.servicios.create({
    data: {
      nombre: `Servicio inactivo integración citas ${Date.now()}`,
      duracion_minutos: 20,
      precio: 15,
      activo: false,
    },
  });

  clientaPrueba = await prisma.usuarios.create({
    data: {
      nombre: 'Clienta integración citas',
      correo: `clienta.citas.${Date.now()}@turnia.gt`,
      contrasena_hash: 'hash-no-usado-en-esta-prueba',
      rol: 'clienta',
    },
  });

  tokenClienta = generarToken({ id: clientaPrueba.id, rol: 'clienta' });
  // Rol administradora únicamente para probar el 403 de la ruta de reservar
  // (el middleware de rol no consulta la base de datos), no se crea usuaria real.
  tokenAdministradora = generarToken({
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    rol: 'administradora',
  });
});

afterAll(async () => {
  const idsValidos = idsDeCitasCreadas.filter(Boolean);
  if (idsValidos.length > 0) {
    await prisma.notificaciones.deleteMany({ where: { cita_id: { in: idsValidos } } });
    await prisma.citas.deleteMany({ where: { id: { in: idsValidos } } });
  }
  await prisma.citas.deleteMany({ where: { clienta_id: clientaPrueba.id } });
  await prisma.usuarios.delete({ where: { id: clientaPrueba.id } });
  await prisma.servicios.deleteMany({ where: { id: { in: [servicioPrueba.id, servicioInactivo.id] } } });
  await prisma.$disconnect();
});

describe('GET /api/citas/disponibilidad', () => {
  test('devuelve horarios para un servicio y una fecha laborable', async () => {
    const respuesta = await request(aplicacion)
      .get('/api/citas/disponibilidad')
      .query({ servicioId: servicioPrueba.id, fecha: comoFechaTexto(diaLaborable) })
      .set('Authorization', `Bearer ${tokenClienta}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.exito).toBe(true);
    expect(Array.isArray(respuesta.body.datos)).toBe(true);
    expect(respuesta.body.datos.length).toBeGreaterThan(0);
  });
});

describe('POST /api/citas', () => {
  test('sin token devuelve 401', async () => {
    const respuesta = await request(aplicacion).post('/api/citas').send({
      servicioId: servicioPrueba.id,
      iniciaEn: horaEn(diaLaborable, 13, 0).toISOString(),
    });

    expect(respuesta.status).toBe(401);
  });

  test('con token de administradora (no clienta) devuelve 403 — la reserva la hace la clienta', async () => {
    const respuesta = await request(aplicacion)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({ servicioId: servicioPrueba.id, iniciaEn: horaEn(diaLaborable, 13, 0).toISOString() });

    expect(respuesta.status).toBe(403);
  });

  test('con clienta y horario libre devuelve 201', async () => {
    const respuesta = await request(aplicacion)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenClienta}`)
      .send({
        servicioId: servicioPrueba.id,
        iniciaEn: horaEn(diaLaborable, 13, 0).toISOString(),
        notas: 'Prueba de integración',
      });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.exito).toBe(true);
    expect(respuesta.body.datos.estado).toBe('pendiente');
    idsDeCitasCreadas.push(respuesta.body.datos.id);
  });

  test('en un horario ya reservado devuelve 409', async () => {
    const respuesta = await request(aplicacion)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenClienta}`)
      .send({
        servicioId: servicioPrueba.id,
        iniciaEn: horaEn(diaLaborable, 13, 10).toISOString(),
      });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('DISPONIBILIDAD_OCUPADA');
  });
});

describe('PATCH /api/citas/:id/cancelar', () => {
  test('cancelar una cita propia con más de 2 horas de anticipación devuelve 200', async () => {
    const creada = await request(aplicacion)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenClienta}`)
      .send({ servicioId: servicioPrueba.id, iniciaEn: horaEn(diaLaborable, 14, 0).toISOString() });
    idsDeCitasCreadas.push(creada.body.datos.id);

    const respuesta = await request(aplicacion)
      .patch(`/api/citas/${creada.body.datos.id}/cancelar`)
      .set('Authorization', `Bearer ${tokenClienta}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.estado).toBe('cancelada');
  });
});

describe('GET /api/citas/mias', () => {
  test('devuelve las citas de la clienta autenticada', async () => {
    const respuesta = await request(aplicacion)
      .get('/api/citas/mias')
      .set('Authorization', `Bearer ${tokenClienta}`);

    expect(respuesta.status).toBe(200);
    expect(Array.isArray(respuesta.body.datos)).toBe(true);
    expect(respuesta.body.datos.length).toBeGreaterThan(0);
    expect(respuesta.body.datos.every((cita) => cita.clienta_id === clientaPrueba.id)).toBe(true);
  });
});

describe('Concurrencia — dos reservas simultáneas para el mismo horario', () => {
  test('de dos POST simultáneos, uno tiene éxito (201) y el otro es rechazado (409)', async () => {
    const inicioConcurrencia = horaEn(diaLaborable, 16, 0).toISOString();

    const [respuestaA, respuestaB] = await Promise.all([
      request(aplicacion)
        .post('/api/citas')
        .set('Authorization', `Bearer ${tokenClienta}`)
        .send({ servicioId: servicioPrueba.id, iniciaEn: inicioConcurrencia }),
      request(aplicacion)
        .post('/api/citas')
        .set('Authorization', `Bearer ${tokenClienta}`)
        .send({ servicioId: servicioPrueba.id, iniciaEn: inicioConcurrencia }),
    ]);

    const estados = [respuestaA.status, respuestaB.status].sort();
    expect(estados).toEqual([201, 409]);

    const exitosa = respuestaA.status === 201 ? respuestaA : respuestaB;
    const fallida = respuestaA.status === 409 ? respuestaA : respuestaB;

    idsDeCitasCreadas.push(exitosa.body.datos.id);
    expect(fallida.body.error.codigo).toBe('DISPONIBILIDAD_OCUPADA');
  });
});

describe('RN-02 ampliada y validación de entradas (Incremento 7A)', () => {
  function reservar(cuerpo) {
    return request(aplicacion)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenClienta}`)
      .send(cuerpo);
  }

  function disponibilidad(query) {
    return request(aplicacion)
      .get('/api/citas/disponibilidad')
      .query(query)
      .set('Authorization', `Bearer ${tokenClienta}`);
  }

  test('reservar en el pasado devuelve 400 FECHA_PASADA', async () => {
    // Lunes de hace dos semanas a las 13:00: era día y hora laborables, pero ya pasó.
    const lunesPasado = new Date(diaLaborable.getTime() - 21 * 24 * 60 * 60000);
    const respuesta = await reservar({
      servicioId: servicioPrueba.id,
      iniciaEn: horaEn(lunesPasado, 13, 0).toISOString(),
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('FECHA_PASADA');
  });

  test('reservar un servicio desactivado devuelve 400 SERVICIO_INACTIVO', async () => {
    const respuesta = await reservar({
      servicioId: servicioInactivo.id,
      iniciaEn: horaEn(diaLaborable, 15, 0).toISOString(),
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('SERVICIO_INACTIVO');
  });

  test('reservar con un servicioId que no es UUID devuelve 400 DATOS_INVALIDOS', async () => {
    const respuesta = await reservar({ servicioId: 'abc', iniciaEn: horaEn(diaLaborable, 15, 0).toISOString() });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
  });

  test('reservar con un iniciaEn inválido devuelve 400 DATOS_INVALIDOS', async () => {
    const respuesta = await reservar({ servicioId: servicioPrueba.id, iniciaEn: 'no-es-una-fecha' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
  });

  test('disponibilidad sin fecha devuelve 400 DATOS_INVALIDOS', async () => {
    const respuesta = await disponibilidad({ servicioId: servicioPrueba.id });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
  });

  test('disponibilidad con fecha mal formada devuelve 400 DATOS_INVALIDOS', async () => {
    for (const fecha of ['abc', '2026-13-45', '2026-02-30', '12/10/2026']) {
      // eslint-disable-next-line no-await-in-loop
      const respuesta = await disponibilidad({ servicioId: servicioPrueba.id, fecha });
      expect(respuesta.status).toBe(400);
      expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
    }
  });

  test('disponibilidad con servicioId que no es UUID devuelve 400 DATOS_INVALIDOS', async () => {
    const respuesta = await disponibilidad({ servicioId: 'abc', fecha: comoFechaTexto(diaLaborable) });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
  });

  test('disponibilidad de un servicio desactivado devuelve 400 SERVICIO_INACTIVO', async () => {
    const respuesta = await disponibilidad({ servicioId: servicioInactivo.id, fecha: comoFechaTexto(diaLaborable) });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('SERVICIO_INACTIVO');
  });

  test('cancelar una cita con id mal formado devuelve 400 DATOS_INVALIDOS (no 500)', async () => {
    const respuesta = await request(aplicacion)
      .patch('/api/citas/abc/cancelar')
      .set('Authorization', `Bearer ${tokenClienta}`);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
  });
});
