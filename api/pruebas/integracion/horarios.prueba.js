/**
 * Módulo: Pruebas de integración de /api/horarios (CU-10 y RN-09)
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 07/10/2026
 * Modificado por: Ronald — 07/10/2026 (Incremento 7B: validación de entradas de PUT, POST y DELETE)
 */

import request from 'supertest';
import aplicacion from '../../src/aplicacion.js';
import prisma from '../../src/configuracion/baseDeDatos.js';
import { generarToken } from '../../src/utilidades/generadorDeTokens.js';

// Estas pruebas modifican datos globales (el horario semanal), por eso la suite
// completa corre con --runInBand: ninguna otra suite se ejecuta mientras tanto, y
// afterAll restaura el horario original de la semilla.
const HORARIO_ORIGINAL = [0, 1, 2, 3, 4, 5, 6].map((diaSemana) => ({
  dia_semana: diaSemana,
  activo: diaSemana !== 0,
  hora_inicio: new Date('1970-01-01T09:00:00.000Z'),
  hora_fin: new Date('1970-01-01T18:00:00.000Z'),
}));

const UN_DIA_EN_MS = 24 * 60 * 60000;

// Fechas lejanas (más de un año en el futuro) y exclusivas de esta suite, para no
// chocar con citas ni días no laborables de otras suites ni de la base de desarrollo.
function diaSemanaLejano(diaSemanaDeseado, diasMinimos) {
  const hoy = new Date();
  let candidato = new Date(
    Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()) + diasMinimos * UN_DIA_EN_MS,
  );
  while (candidato.getUTCDay() !== diaSemanaDeseado) {
    candidato = new Date(candidato.getTime() + UN_DIA_EN_MS);
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

const domingoLejano = diaSemanaLejano(0, 400);
const sabadoLejano = diaSemanaLejano(6, 410);
const miercolesLejano = diaSemanaLejano(3, 420);
const juevesLejano = diaSemanaLejano(4, 430);
const fechasDeLaSuite = [miercolesLejano, juevesLejano];

let servicioPrueba;
let clientaPrueba;
let tokenAdministradora;
let tokenClienta;
const idsDeCitasCreadas = [];

function consultarDisponibilidad(fechaUtc) {
  return request(aplicacion)
    .get('/api/citas/disponibilidad')
    .query({ servicioId: servicioPrueba.id, fecha: comoFechaTexto(fechaUtc) })
    .set('Authorization', `Bearer ${tokenClienta}`);
}

async function crearCitaActiva(inicio, duracionMinutos = 30) {
  const cita = await prisma.citas.create({
    data: {
      clienta_id: clientaPrueba.id,
      servicio_id: servicioPrueba.id,
      inicia_en: inicio,
      termina_en: new Date(inicio.getTime() + duracionMinutos * 60000),
      estado: 'pendiente',
    },
  });
  idsDeCitasCreadas.push(cita.id);
  return cita;
}

beforeAll(async () => {
  servicioPrueba = await prisma.servicios.create({
    data: {
      nombre: `Servicio integración horarios ${Date.now()}`,
      duracion_minutos: 30,
      precio: 10,
      activo: true,
    },
  });

  clientaPrueba = await prisma.usuarios.create({
    data: {
      nombre: 'Clienta integración horarios',
      correo: `clienta.horarios.${Date.now()}@turnia.gt`,
      contrasena_hash: 'hash-no-usado-en-esta-prueba',
      rol: 'clienta',
    },
  });

  tokenClienta = generarToken({ id: clientaPrueba.id, rol: 'clienta' });
  tokenAdministradora = generarToken({
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    rol: 'administradora',
  });

  // Por si una corrida anterior se interrumpió antes de su afterAll.
  await prisma.dias_no_laborables.deleteMany({ where: { fecha: { in: fechasDeLaSuite } } });
});

afterAll(async () => {
  if (idsDeCitasCreadas.length > 0) {
    await prisma.notificaciones.deleteMany({ where: { cita_id: { in: idsDeCitasCreadas } } });
    await prisma.citas.deleteMany({ where: { id: { in: idsDeCitasCreadas } } });
  }
  await prisma.dias_no_laborables.deleteMany({ where: { fecha: { in: fechasDeLaSuite } } });

  // Restaura el horario semanal original: lunes a sábado 9:00–18:00, domingo inactivo.
  for (const dia of HORARIO_ORIGINAL) {
    // eslint-disable-next-line no-await-in-loop
    const existente = await prisma.horarios_atencion.findFirst({ where: { dia_semana: dia.dia_semana } });
    if (existente) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.horarios_atencion.update({ where: { id: existente.id }, data: dia });
    } else {
      // eslint-disable-next-line no-await-in-loop
      await prisma.horarios_atencion.create({ data: dia });
    }
  }

  await prisma.usuarios.delete({ where: { id: clientaPrueba.id } });
  await prisma.servicios.delete({ where: { id: servicioPrueba.id } });
  await prisma.$disconnect();
});

describe('GET /api/horarios', () => {
  test('es público y devuelve los 7 días con horas en formato HH:MM', async () => {
    const respuesta = await request(aplicacion).get('/api/horarios');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.exito).toBe(true);
    expect(respuesta.body.datos.dias).toHaveLength(7);
    expect(respuesta.body.datos.dias.map((dia) => dia.dia_semana)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    for (const dia of respuesta.body.datos.dias) {
      expect(typeof dia.activo).toBe('boolean');
      expect(dia.hora_inicio).toMatch(/^\d{2}:\d{2}$/);
      expect(dia.hora_fin).toMatch(/^\d{2}:\d{2}$/);
    }
    expect(Array.isArray(respuesta.body.datos.dias_no_laborables)).toBe(true);
  });
});

describe('PUT /api/horarios', () => {
  test('con administradora guarda el cambio, GET lo refleja y la disponibilidad cambia', async () => {
    const antes = await consultarDisponibilidad(domingoLejano);
    expect(antes.status).toBe(200);
    expect(antes.body.datos).toEqual([]);

    const respuesta = await request(aplicacion)
      .put('/api/horarios')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({ dias: [{ dia_semana: 0, activo: true, hora_inicio: '10:00', hora_fin: '14:00' }] });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.exito).toBe(true);
    expect(respuesta.body.datos.dias[0]).toEqual({
      dia_semana: 0,
      activo: true,
      hora_inicio: '10:00',
      hora_fin: '14:00',
    });

    const consulta = await request(aplicacion).get('/api/horarios');
    expect(consulta.body.datos.dias[0]).toEqual({
      dia_semana: 0,
      activo: true,
      hora_inicio: '10:00',
      hora_fin: '14:00',
    });
    // Los días no enviados no cambian.
    expect(consulta.body.datos.dias[1]).toEqual({
      dia_semana: 1,
      activo: true,
      hora_inicio: '09:00',
      hora_fin: '18:00',
    });

    const despues = await consultarDisponibilidad(domingoLejano);
    expect(despues.status).toBe(200);
    // 10:00 a 14:00 con un servicio de 30 min: 8 intervalos, de 10:00 a 13:30.
    expect(despues.body.datos).toHaveLength(8);
    expect(despues.body.datos[0]).toBe(horaEn(domingoLejano, 10, 0).toISOString());
    expect(despues.body.datos[7]).toBe(horaEn(domingoLejano, 13, 30).toISOString());
  });

  test('con hora_inicio >= hora_fin devuelve 400', async () => {
    const respuesta = await request(aplicacion)
      .put('/api/horarios')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({ dias: [{ dia_semana: 2, activo: true, hora_inicio: '18:00', hora_fin: '09:00' }] });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
  });

  test('con dia_semana 7 devuelve 400', async () => {
    const respuesta = await request(aplicacion)
      .put('/api/horarios')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({ dias: [{ dia_semana: 7, activo: true, hora_inicio: '09:00', hora_fin: '18:00' }] });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
  });

  test('sin token devuelve 401', async () => {
    const respuesta = await request(aplicacion)
      .put('/api/horarios')
      .send({ dias: [{ dia_semana: 1, activo: true, hora_inicio: '09:00', hora_fin: '18:00' }] });

    expect(respuesta.status).toBe(401);
  });

  test('con token de clienta devuelve 403', async () => {
    const respuesta = await request(aplicacion)
      .put('/api/horarios')
      .set('Authorization', `Bearer ${tokenClienta}`)
      .send({ dias: [{ dia_semana: 1, activo: true, hora_inicio: '09:00', hora_fin: '18:00' }] });

    expect(respuesta.status).toBe(403);
  });

  test('RN-09: si dejaría fuera una cita activa futura devuelve 409 CONFLICTO_CON_CITAS y no guarda', async () => {
    const cita = await crearCitaActiva(horaEn(sabadoLejano, 16, 0));

    const respuesta = await request(aplicacion)
      .put('/api/horarios')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({ dias: [{ dia_semana: 6, activo: true, hora_inicio: '09:00', hora_fin: '12:00' }] });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('CONFLICTO_CON_CITAS');
    const afectada = respuesta.body.error.detalles.citas.find((c) => c.id === cita.id);
    expect(afectada).toMatchObject({
      id: cita.id,
      inicia_en: horaEn(sabadoLejano, 16, 0).toISOString(),
      servicio: servicioPrueba.nombre,
      clienta: clientaPrueba.nombre,
    });

    const consulta = await request(aplicacion).get('/api/horarios');
    expect(consulta.body.datos.dias[6].hora_fin).toBe('18:00');
  });
});

describe('POST /api/horarios/dias-no-laborables', () => {
  test('con administradora devuelve 201 y la disponibilidad de ese día queda vacía', async () => {
    const antes = await consultarDisponibilidad(miercolesLejano);
    expect(antes.body.datos.length).toBeGreaterThan(0);

    const respuesta = await request(aplicacion)
      .post('/api/horarios/dias-no-laborables')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({ fecha: comoFechaTexto(miercolesLejano), motivo: 'Capacitación (prueba)' });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.datos).toMatchObject({
      fecha: comoFechaTexto(miercolesLejano),
      motivo: 'Capacitación (prueba)',
    });

    const despues = await consultarDisponibilidad(miercolesLejano);
    expect(despues.status).toBe(200);
    expect(despues.body.datos).toEqual([]);

    const consulta = await request(aplicacion).get('/api/horarios');
    const fechas = consulta.body.datos.dias_no_laborables.map((dia) => dia.fecha);
    expect(fechas).toContain(comoFechaTexto(miercolesLejano));
  });

  test('si la fecha ya está registrada devuelve 409 DIA_YA_REGISTRADO', async () => {
    const respuesta = await request(aplicacion)
      .post('/api/horarios/dias-no-laborables')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({ fecha: comoFechaTexto(miercolesLejano) });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('DIA_YA_REGISTRADO');
  });

  test('RN-09: si ese día tiene una cita activa devuelve 409 CONFLICTO_CON_CITAS', async () => {
    const cita = await crearCitaActiva(horaEn(juevesLejano, 11, 0));

    const respuesta = await request(aplicacion)
      .post('/api/horarios/dias-no-laborables')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({ fecha: comoFechaTexto(juevesLejano) });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('CONFLICTO_CON_CITAS');
    expect(respuesta.body.error.detalles.citas.map((c) => c.id)).toEqual([cita.id]);
    expect(await prisma.dias_no_laborables.findUnique({ where: { fecha: juevesLejano } })).toBeNull();
  });

  test('con una fecha pasada devuelve 400', async () => {
    const respuesta = await request(aplicacion)
      .post('/api/horarios/dias-no-laborables')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({ fecha: '2020-01-15' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
  });

  test('sin token devuelve 401', async () => {
    const respuesta = await request(aplicacion)
      .post('/api/horarios/dias-no-laborables')
      .send({ fecha: comoFechaTexto(juevesLejano) });

    expect(respuesta.status).toBe(401);
  });

  test('con token de clienta devuelve 403', async () => {
    const respuesta = await request(aplicacion)
      .post('/api/horarios/dias-no-laborables')
      .set('Authorization', `Bearer ${tokenClienta}`)
      .send({ fecha: comoFechaTexto(juevesLejano) });

    expect(respuesta.status).toBe(403);
  });
});

describe('DELETE /api/horarios/dias-no-laborables/:id', () => {
  test('sin token devuelve 401', async () => {
    const dia = await prisma.dias_no_laborables.findUnique({ where: { fecha: miercolesLejano } });
    const respuesta = await request(aplicacion).delete(`/api/horarios/dias-no-laborables/${dia.id}`);

    expect(respuesta.status).toBe(401);
  });

  test('con token de clienta devuelve 403', async () => {
    const dia = await prisma.dias_no_laborables.findUnique({ where: { fecha: miercolesLejano } });
    const respuesta = await request(aplicacion)
      .delete(`/api/horarios/dias-no-laborables/${dia.id}`)
      .set('Authorization', `Bearer ${tokenClienta}`);

    expect(respuesta.status).toBe(403);
  });

  test('con administradora devuelve 200 y la disponibilidad vuelve', async () => {
    const dia = await prisma.dias_no_laborables.findUnique({ where: { fecha: miercolesLejano } });
    const respuesta = await request(aplicacion)
      .delete(`/api/horarios/dias-no-laborables/${dia.id}`)
      .set('Authorization', `Bearer ${tokenAdministradora}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.id).toBe(dia.id);
    expect(await prisma.dias_no_laborables.findUnique({ where: { id: dia.id } })).toBeNull();

    const despues = await consultarDisponibilidad(miercolesLejano);
    expect(despues.body.datos.length).toBeGreaterThan(0);
  });

  test('con id inexistente devuelve 404 DIA_NO_ENCONTRADO', async () => {
    const respuesta = await request(aplicacion)
      .delete('/api/horarios/dias-no-laborables/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${tokenAdministradora}`);

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.codigo).toBe('DIA_NO_ENCONTRADO');
  });
});

describe('Validación de entradas de /api/horarios (Incremento 7B)', () => {
  function configurar(cuerpo) {
    return request(aplicacion)
      .put('/api/horarios')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send(cuerpo);
  }

  function agregarDia(cuerpo) {
    return request(aplicacion)
      .post('/api/horarios/dias-no-laborables')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send(cuerpo);
  }

  test('PUT con configuraciones inválidas devuelve 400 en cada caso y no cambia el horario', async () => {
    const antes = await request(aplicacion).get('/api/horarios');
    const lunes = { dia_semana: 1, activo: true, hora_inicio: '09:00', hora_fin: '18:00' };
    const casosInvalidos = [
      {},
      { dias: [] },
      { dias: [lunes, lunes, lunes, lunes, lunes, lunes, lunes, lunes] },
      { dias: [null] },
      { dias: [lunes, { ...lunes }] },
      { dias: [{ ...lunes, activo: 'si' }] },
      { dias: [{ ...lunes, hora_inicio: '9:00' }] },
      { dias: [{ ...lunes, hora_fin: '24:00' }] },
      { dias: [{ dia_semana: 2, activo: false, hora_inicio: '10:00' }] },
    ];

    for (const cuerpo of casosInvalidos) {
      // eslint-disable-next-line no-await-in-loop
      const respuesta = await configurar(cuerpo);
      expect(respuesta.status).toBe(400);
      expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
    }

    const despues = await request(aplicacion).get('/api/horarios');
    expect(despues.body.datos).toEqual(antes.body.datos);
  });

  test('POST de día no laborable con fecha o motivo inválidos devuelve 400', async () => {
    const fecha = juevesLejano.toISOString().slice(0, 10);
    const casosInvalidos = [
      {},
      { fecha: '2026-02-30' },
      { fecha, motivo: 123 },
      { fecha, motivo: 'x'.repeat(161) },
    ];

    for (const cuerpo of casosInvalidos) {
      // eslint-disable-next-line no-await-in-loop
      const respuesta = await agregarDia(cuerpo);
      expect(respuesta.status).toBe(400);
      expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
    }

    expect(await prisma.dias_no_laborables.findUnique({ where: { fecha: juevesLejano } })).toBeNull();
  });

  test('DELETE de día no laborable con id mal formado devuelve 400 DATOS_INVALIDOS', async () => {
    const respuesta = await request(aplicacion)
      .delete('/api/horarios/dias-no-laborables/abc')
      .set('Authorization', `Bearer ${tokenAdministradora}`);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
  });
});
