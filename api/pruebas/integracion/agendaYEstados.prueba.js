/**
 * Módulo: Pruebas de integración de la agenda (CU-08), cambio de estado (CU-09, RN-04),
 *   confirmación al reservar (RN-05) y liberación de horario al cancelar (RN-03)
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 07/10/2026
 */

import request from 'supertest';
import aplicacion from '../../src/aplicacion.js';
import prisma from '../../src/configuracion/baseDeDatos.js';
import { generarToken } from '../../src/utilidades/generadorDeTokens.js';

const UN_DIA_EN_MS = 24 * 60 * 60000;

// Próximo miércoles a 8 días o más: día laborable de la semilla (lun–sáb 9:00–18:00)
// y distinto del lunes que usa citas.prueba.js, para no compartir horarios con esa suite.
function proximoMiercoles(diasMinimos) {
  const hoy = new Date();
  let candidato = new Date(
    Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()) + diasMinimos * UN_DIA_EN_MS,
  );
  while (candidato.getUTCDay() !== 3) {
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

const diaDePrueba = proximoMiercoles(8);
const ID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

let servicioPrueba;
let clientaPrueba;
let tokenClienta;
let tokenAdministradora;

beforeAll(async () => {
  servicioPrueba = await prisma.servicios.create({
    data: {
      nombre: `Servicio agenda y estados ${Date.now()}`,
      duracion_minutos: 30,
      precio: 20,
      activo: true,
    },
  });

  clientaPrueba = await prisma.usuarios.create({
    data: {
      nombre: 'Clienta agenda y estados',
      correo: `clienta.agenda.${Date.now()}@turnia.gt`,
      contrasena_hash: 'hash-no-usado-en-esta-prueba',
      rol: 'clienta',
    },
  });

  tokenClienta = generarToken({ id: clientaPrueba.id, rol: 'clienta' });
  tokenAdministradora = generarToken({
    id: 'abababab-abab-abab-abab-abababababab',
    rol: 'administradora',
  });
});

afterAll(async () => {
  const citas = await prisma.citas.findMany({ where: { clienta_id: clientaPrueba.id } });
  const idsDeCitas = citas.map((cita) => cita.id);
  await prisma.notificaciones.deleteMany({ where: { cita_id: { in: idsDeCitas } } });
  await prisma.citas.deleteMany({ where: { id: { in: idsDeCitas } } });
  await prisma.usuarios.delete({ where: { id: clientaPrueba.id } });
  await prisma.servicios.delete({ where: { id: servicioPrueba.id } });
  await prisma.$disconnect();
});

function reservar(iniciaEn) {
  return request(aplicacion)
    .post('/api/citas')
    .set('Authorization', `Bearer ${tokenClienta}`)
    .send({ servicioId: servicioPrueba.id, iniciaEn: iniciaEn.toISOString() });
}

function cambiarEstado(citaId, estado, token = tokenAdministradora) {
  return request(aplicacion)
    .patch(`/api/citas/${citaId}/estado`)
    .set('Authorization', `Bearer ${token}`)
    .send({ estado });
}

// Cita creada directamente en la base (no por la API) para poder tener una cita ya
// completada: por la API, RN-08 exige que hayan pasado 10 minutos desde su inicio.
async function crearCitaDirecta(inicio, estado) {
  return prisma.citas.create({
    data: {
      clienta_id: clientaPrueba.id,
      servicio_id: servicioPrueba.id,
      inicia_en: inicio,
      termina_en: new Date(inicio.getTime() + 30 * 60000),
      estado,
    },
  });
}

describe('CU-08 — GET /api/citas/agenda', () => {
  let citaManana;
  let citaTarde;

  beforeAll(async () => {
    citaManana = (await reservar(horaEn(diaDePrueba, 10, 0))).body.datos;
    citaTarde = (await reservar(horaEn(diaDePrueba, 15, 0))).body.datos;
  });

  test('como administradora para un día devuelve 200 con las citas de ese día, en orden', async () => {
    const respuesta = await request(aplicacion)
      .get('/api/citas/agenda')
      .query({
        desde: diaDePrueba.toISOString(),
        hasta: new Date(diaDePrueba.getTime() + UN_DIA_EN_MS).toISOString(),
      })
      .set('Authorization', `Bearer ${tokenAdministradora}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.exito).toBe(true);
    const ids = respuesta.body.datos.map((cita) => cita.id);
    expect(ids).toEqual(expect.arrayContaining([citaManana.id, citaTarde.id]));
    expect(ids.indexOf(citaManana.id)).toBeLessThan(ids.indexOf(citaTarde.id));

    const finDelDia = diaDePrueba.getTime() + UN_DIA_EN_MS;
    for (const cita of respuesta.body.datos) {
      const inicio = new Date(cita.inicia_en).getTime();
      expect(inicio).toBeGreaterThanOrEqual(diaDePrueba.getTime());
      expect(inicio).toBeLessThan(finDelDia);
    }

    const encontrada = respuesta.body.datos.find((cita) => cita.id === citaManana.id);
    expect(encontrada.servicio.id).toBe(servicioPrueba.id);
    expect(encontrada.clienta.id).toBe(clientaPrueba.id);
    expect(encontrada.clienta.contrasena_hash).toBeUndefined();
  });

  test('como administradora para una semana devuelve 200 e incluye las citas creadas', async () => {
    const inicioSemana = new Date(diaDePrueba.getTime() - 2 * UN_DIA_EN_MS);
    const respuesta = await request(aplicacion)
      .get('/api/citas/agenda')
      .query({
        desde: inicioSemana.toISOString(),
        hasta: new Date(inicioSemana.getTime() + 7 * UN_DIA_EN_MS).toISOString(),
      })
      .set('Authorization', `Bearer ${tokenAdministradora}`);

    expect(respuesta.status).toBe(200);
    const ids = respuesta.body.datos.map((cita) => cita.id);
    expect(ids).toEqual(expect.arrayContaining([citaManana.id, citaTarde.id]));
  });

  test('un rango que no incluye el día de las citas no las devuelve', async () => {
    const respuesta = await request(aplicacion)
      .get('/api/citas/agenda')
      .query({
        desde: new Date(diaDePrueba.getTime() + UN_DIA_EN_MS).toISOString(),
        hasta: new Date(diaDePrueba.getTime() + 2 * UN_DIA_EN_MS).toISOString(),
      })
      .set('Authorization', `Bearer ${tokenAdministradora}`);

    expect(respuesta.status).toBe(200);
    const ids = respuesta.body.datos.map((cita) => cita.id);
    expect(ids).not.toContain(citaManana.id);
    expect(ids).not.toContain(citaTarde.id);
  });

  test('sin desde/hasta devuelve por defecto solo citas de los próximos 7 días desde hoy', async () => {
    const respuesta = await request(aplicacion)
      .get('/api/citas/agenda')
      .set('Authorization', `Bearer ${tokenAdministradora}`);

    expect(respuesta.status).toBe(200);
    const ahora = new Date();
    const hoyUtc = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate());
    for (const cita of respuesta.body.datos) {
      const inicio = new Date(cita.inicia_en).getTime();
      expect(inicio).toBeGreaterThanOrEqual(hoyUtc);
      expect(inicio).toBeLessThan(hoyUtc + 7 * UN_DIA_EN_MS);
    }
    // El día de prueba está a 8 días o más: queda fuera del rango por defecto.
    expect(respuesta.body.datos.map((cita) => cita.id)).not.toContain(citaManana.id);
  });

  test('con un "desde" que no es fecha devuelve 400 DATOS_INVALIDOS', async () => {
    const respuesta = await request(aplicacion)
      .get('/api/citas/agenda')
      .query({ desde: 'no-es-fecha' })
      .set('Authorization', `Bearer ${tokenAdministradora}`);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
  });

  test('con token de clienta devuelve 403', async () => {
    const respuesta = await request(aplicacion)
      .get('/api/citas/agenda')
      .set('Authorization', `Bearer ${tokenClienta}`);

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.exito).toBe(false);
  });

  test('sin token devuelve 401', async () => {
    const respuesta = await request(aplicacion).get('/api/citas/agenda');

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error.codigo).toBe('TOKEN_FALTANTE');
  });
});

describe('CU-09 — PATCH /api/citas/:id/estado', () => {
  let citaPendiente;

  beforeAll(async () => {
    citaPendiente = (await reservar(horaEn(diaDePrueba, 11, 0))).body.datos;
  });

  test('como administradora, pendiente -> confirmada devuelve 200 y el cambio persiste', async () => {
    const respuesta = await cambiarEstado(citaPendiente.id, 'confirmada');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.estado).toBe('confirmada');
    const enBase = await prisma.citas.findUnique({ where: { id: citaPendiente.id } });
    expect(enBase.estado).toBe('confirmada');
  });

  test('una transición inválida (confirmada -> pendiente) devuelve 400 TRANSICION_INVALIDA', async () => {
    const respuesta = await cambiarEstado(citaPendiente.id, 'pendiente');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('TRANSICION_INVALIDA');
    const enBase = await prisma.citas.findUnique({ where: { id: citaPendiente.id } });
    expect(enBase.estado).toBe('confirmada');
  });

  test('un estado que no existe devuelve 400 DATOS_INVALIDOS', async () => {
    const respuesta = await cambiarEstado(citaPendiente.id, 'archivada');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
  });

  test('con token de clienta devuelve 403 y no cambia la cita', async () => {
    const respuesta = await cambiarEstado(citaPendiente.id, 'cancelada', tokenClienta);

    expect(respuesta.status).toBe(403);
    const enBase = await prisma.citas.findUnique({ where: { id: citaPendiente.id } });
    expect(enBase.estado).toBe('confirmada');
  });

  test('con un id inexistente devuelve 404 CITA_NO_ENCONTRADA', async () => {
    const respuesta = await cambiarEstado(ID_INEXISTENTE, 'confirmada');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.codigo).toBe('CITA_NO_ENCONTRADA');
  });
});

describe('RN-04 — transiciones de estado completas', () => {
  test('pendiente -> completada se rechaza (debe pasar antes por confirmada)', async () => {
    const cita = (await reservar(horaEn(diaDePrueba, 13, 0))).body.datos;
    expect(cita.estado).toBe('pendiente');

    const respuesta = await cambiarEstado(cita.id, 'completada');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('TRANSICION_INVALIDA');
    const enBase = await prisma.citas.findUnique({ where: { id: cita.id } });
    expect(enBase.estado).toBe('pendiente');
  });

  test('una cita completada no puede pasar a ningún otro estado', async () => {
    const haceUnAnio = new Date(horaEn(diaDePrueba, 10, 0).getTime() - 364 * UN_DIA_EN_MS);
    const completada = await crearCitaDirecta(haceUnAnio, 'completada');

    for (const estado of ['pendiente', 'confirmada', 'cancelada', 'completada']) {
      // eslint-disable-next-line no-await-in-loop
      const respuesta = await cambiarEstado(completada.id, estado);
      expect(respuesta.status).toBe(400);
      expect(respuesta.body.error.codigo).toBe('TRANSICION_INVALIDA');
    }

    const enBase = await prisma.citas.findUnique({ where: { id: completada.id } });
    expect(enBase.estado).toBe('completada');
  });
});

describe('RN-05 — confirmación de punta a punta', () => {
  test('un POST /api/citas exitoso deja registrada una notificación "confirmacion" de esa cita', async () => {
    const respuesta = await reservar(horaEn(diaDePrueba, 16, 0));
    expect(respuesta.status).toBe(201);

    const notificaciones = await prisma.notificaciones.findMany({
      where: { cita_id: respuesta.body.datos.id },
    });
    expect(notificaciones).toHaveLength(1);
    expect(notificaciones[0].tipo).toBe('confirmacion');
    // Durante las pruebas el modo es consola (SMTP_* vacías): imprimir cuenta como éxito.
    expect(notificaciones[0].exitoso).toBe(true);
    expect(notificaciones[0].enviado_en).not.toBeNull();
  });
});

describe('RN-03 — cancelar libera el horario', () => {
  test('tras cancelar, el horario vuelve a la disponibilidad y se puede reservar de nuevo (201)', async () => {
    const inicio = horaEn(diaDePrueba, 12, 0);
    const fecha = diaDePrueba.toISOString().slice(0, 10);

    async function horariosDisponibles() {
      const respuesta = await request(aplicacion)
        .get('/api/citas/disponibilidad')
        .query({ servicioId: servicioPrueba.id, fecha })
        .set('Authorization', `Bearer ${tokenClienta}`);
      expect(respuesta.status).toBe(200);
      return respuesta.body.datos.map((valor) => new Date(valor).getTime());
    }

    const primera = await reservar(inicio);
    expect(primera.status).toBe(201);
    expect(await horariosDisponibles()).not.toContain(inicio.getTime());

    const cancelacion = await request(aplicacion)
      .patch(`/api/citas/${primera.body.datos.id}/cancelar`)
      .set('Authorization', `Bearer ${tokenClienta}`);
    expect(cancelacion.status).toBe(200);

    expect(await horariosDisponibles()).toContain(inicio.getTime());

    const segunda = await reservar(inicio);
    expect(segunda.status).toBe(201);
    expect(segunda.body.datos.id).not.toBe(primera.body.datos.id);
    expect(segunda.body.datos.estado).toBe('pendiente');
  });

  test('cancelar una cita inexistente devuelve 404 CITA_NO_ENCONTRADA', async () => {
    const respuesta = await request(aplicacion)
      .patch(`/api/citas/${ID_INEXISTENTE}/cancelar`)
      .set('Authorization', `Bearer ${tokenClienta}`);

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.codigo).toBe('CITA_NO_ENCONTRADA');
  });

  test('reservar un servicio inexistente devuelve 404 SERVICIO_NO_ENCONTRADO', async () => {
    const respuesta = await request(aplicacion)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenClienta}`)
      .send({ servicioId: ID_INEXISTENTE, iniciaEn: horaEn(diaDePrueba, 14, 0).toISOString() });

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.codigo).toBe('SERVICIO_NO_ENCONTRADO');
  });
});
