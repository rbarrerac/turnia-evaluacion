/**
 * Módulo: Pruebas de integración de /api/autenticacion
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 * Modificado por: Luis — 07/10/2026 (Incremento 7B: errores esperados de registro, inicio de
 *   sesión, token, perfil, cambio de correo y de contraseña)
 */

import request from 'supertest';
import aplicacion from '../../src/aplicacion.js';
import prisma from '../../src/configuracion/baseDeDatos.js';
import { generarToken } from '../../src/utilidades/generadorDeTokens.js';

const MARCA_DE_TIEMPO = Date.now();
const CORREO_NUEVO = `clienta.prueba.${MARCA_DE_TIEMPO}@turnia.gt`;
const CORREO_DUPLICADO = `clienta.duplicada.${MARCA_DE_TIEMPO}@turnia.gt`;
const CONTRASENA_VALIDA = 'ClaveSegura123';

const correosDeUsuariosCreados = [CORREO_NUEVO, CORREO_DUPLICADO];

afterAll(async () => {
  await prisma.usuarios.deleteMany({ where: { correo: { in: correosDeUsuariosCreados } } });
  await prisma.$disconnect();
});

describe('POST /api/autenticacion/registro', () => {
  test('registrar una usuaria nueva devuelve 201 y el usuario sin contrasena_hash', async () => {
    const respuesta = await request(aplicacion).post('/api/autenticacion/registro').send({
      nombre: 'Clienta de prueba',
      correo: CORREO_NUEVO,
      telefono: '12345678',
      contrasena: CONTRASENA_VALIDA,
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.exito).toBe(true);
    expect(respuesta.body.datos.correo).toBe(CORREO_NUEVO);
    expect(respuesta.body.datos.rol).toBe('clienta');
    expect(respuesta.body.datos.contrasena_hash).toBeUndefined();
  });

  test('registrar con correo duplicado devuelve 409', async () => {
    await request(aplicacion).post('/api/autenticacion/registro').send({
      nombre: 'Primera Clienta',
      correo: CORREO_DUPLICADO,
      contrasena: CONTRASENA_VALIDA,
    });

    const respuesta = await request(aplicacion).post('/api/autenticacion/registro').send({
      nombre: 'Segunda Clienta',
      correo: CORREO_DUPLICADO,
      contrasena: CONTRASENA_VALIDA,
    });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.exito).toBe(false);
    expect(respuesta.body.error.codigo).toBe('CORREO_DUPLICADO');
  });

  test('registrar con contraseña corta devuelve 400', async () => {
    const respuesta = await request(aplicacion).post('/api/autenticacion/registro').send({
      nombre: 'Clienta con clave corta',
      correo: `clienta.clave.corta.${MARCA_DE_TIEMPO}@turnia.gt`,
      contrasena: '123',
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.exito).toBe(false);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
  });
});

describe('POST /api/autenticacion/inicio-sesion', () => {
  test('iniciar sesión con credenciales correctas devuelve 200 y un token', async () => {
    const respuesta = await request(aplicacion).post('/api/autenticacion/inicio-sesion').send({
      correo: CORREO_NUEVO,
      contrasena: CONTRASENA_VALIDA,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.exito).toBe(true);
    expect(typeof respuesta.body.datos.token).toBe('string');
    expect(respuesta.body.datos.token.length).toBeGreaterThan(0);
    expect(respuesta.body.datos.usuario.correo).toBe(CORREO_NUEVO);
    expect(respuesta.body.datos.usuario.contrasena_hash).toBeUndefined();
  });

  test('iniciar sesión con contraseña incorrecta devuelve 401', async () => {
    const respuesta = await request(aplicacion).post('/api/autenticacion/inicio-sesion').send({
      correo: CORREO_NUEVO,
      contrasena: 'ContrasenaIncorrecta1',
    });

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.exito).toBe(false);
    expect(respuesta.body.error.codigo).toBe('CREDENCIALES_INVALIDAS');
  });
});

describe('GET /api/autenticacion/perfil', () => {
  test('acceder sin token devuelve 401', async () => {
    const respuesta = await request(aplicacion).get('/api/autenticacion/perfil');

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.exito).toBe(false);
  });

  test('acceder con un token válido devuelve el perfil de la usuaria', async () => {
    const inicioSesion = await request(aplicacion).post('/api/autenticacion/inicio-sesion').send({
      correo: CORREO_NUEVO,
      contrasena: CONTRASENA_VALIDA,
    });
    const token = inicioSesion.body.datos.token;

    const respuesta = await request(aplicacion)
      .get('/api/autenticacion/perfil')
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.correo).toBe(CORREO_NUEVO);
  });
});

describe('PATCH /api/autenticacion/perfil, /correo y /contrasena', () => {
  const correoPerfil = `clienta.perfil.${MARCA_DE_TIEMPO}@turnia.gt`;
  const correoExistente = `clienta.correo.existente.${MARCA_DE_TIEMPO}@turnia.gt`;
  const contrasenaOriginal = 'ClaveOriginal123';
  const contrasenaNueva = 'ClaveNueva456';
  let tokenPerfil;

  beforeAll(async () => {
    correosDeUsuariosCreados.push(correoPerfil, correoExistente);

    await request(aplicacion).post('/api/autenticacion/registro').send({
      nombre: 'Clienta Perfil',
      correo: correoPerfil,
      contrasena: contrasenaOriginal,
    });
    await request(aplicacion).post('/api/autenticacion/registro').send({
      nombre: 'Clienta Correo Existente',
      correo: correoExistente,
      contrasena: contrasenaOriginal,
    });

    const inicioSesion = await request(aplicacion).post('/api/autenticacion/inicio-sesion').send({
      correo: correoPerfil,
      contrasena: contrasenaOriginal,
    });
    tokenPerfil = inicioSesion.body.datos.token;
  });

  test('PATCH /perfil actualiza nombre y teléfono', async () => {
    const respuesta = await request(aplicacion)
      .patch('/api/autenticacion/perfil')
      .set('Authorization', `Bearer ${tokenPerfil}`)
      .send({ nombre: 'Clienta Perfil Actualizada', telefono: '55501234' });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.nombre).toBe('Clienta Perfil Actualizada');
    expect(respuesta.body.datos.telefono).toBe('55501234');
  });

  test('PATCH /perfil sin token devuelve 401', async () => {
    const respuesta = await request(aplicacion)
      .patch('/api/autenticacion/perfil')
      .send({ nombre: 'Sin token' });

    expect(respuesta.status).toBe(401);
  });

  test('PATCH /correo a uno que ya existe devuelve 409', async () => {
    const respuesta = await request(aplicacion)
      .patch('/api/autenticacion/correo')
      .set('Authorization', `Bearer ${tokenPerfil}`)
      .send({ correoNuevo: correoExistente, contrasenaActual: contrasenaOriginal });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('CORREO_DUPLICADO');
  });

  test('PATCH /contrasena con la contraseña actual incorrecta devuelve 401', async () => {
    const respuesta = await request(aplicacion)
      .patch('/api/autenticacion/contrasena')
      .set('Authorization', `Bearer ${tokenPerfil}`)
      .send({ contrasenaActual: 'ContrasenaIncorrecta', contrasenaNueva });

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error.codigo).toBe('CREDENCIALES_INVALIDAS');
  });

  test('PATCH /contrasena con la contraseña actual correcta funciona y permite iniciar sesión con la nueva', async () => {
    const respuesta = await request(aplicacion)
      .patch('/api/autenticacion/contrasena')
      .set('Authorization', `Bearer ${tokenPerfil}`)
      .send({ contrasenaActual: contrasenaOriginal, contrasenaNueva });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.exito).toBe(true);

    const inicioSesionConNueva = await request(aplicacion)
      .post('/api/autenticacion/inicio-sesion')
      .send({ correo: correoPerfil, contrasena: contrasenaNueva });

    expect(inicioSesionConNueva.status).toBe(200);
  });
});

describe('Errores esperados de registro, inicio de sesión y perfil (Incremento 7B)', () => {
  const correoErrores = `clienta.errores.${MARCA_DE_TIEMPO}@turnia.gt`;
  const correoCambiado = `clienta.errores.nuevo.${MARCA_DE_TIEMPO}@turnia.gt`;
  const correoInactiva = `clienta.inactiva.${MARCA_DE_TIEMPO}@turnia.gt`;
  const contrasena = 'ClaveErrores123';
  let tokenErrores;

  function iniciarSesion(correo, clave) {
    return request(aplicacion)
      .post('/api/autenticacion/inicio-sesion')
      .send({ correo, contrasena: clave });
  }

  beforeAll(async () => {
    correosDeUsuariosCreados.push(correoErrores, correoCambiado, correoInactiva);

    await request(aplicacion).post('/api/autenticacion/registro').send({
      nombre: 'Clienta Errores',
      correo: correoErrores,
      telefono: '55555555',
      contrasena,
    });
    tokenErrores = (await iniciarSesion(correoErrores, contrasena)).body.datos.token;
  });

  test('registrar sin nombre y con correo inválido devuelve 400 con ambos motivos', async () => {
    const respuesta = await request(aplicacion).post('/api/autenticacion/registro').send({
      nombre: '  ',
      correo: 'no-es-un-correo',
      contrasena: CONTRASENA_VALIDA,
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
    expect(respuesta.body.error.mensaje).toContain('nombre');
    expect(respuesta.body.error.mensaje).toContain('correo');
  });

  test('iniciar sesión sin correo ni contraseña devuelve 401', async () => {
    const respuesta = await request(aplicacion).post('/api/autenticacion/inicio-sesion').send({});

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error.codigo).toBe('CREDENCIALES_INVALIDAS');
  });

  test('un correo no registrado responde igual que una contraseña incorrecta (no revela cuentas)', async () => {
    const noRegistrado = await iniciarSesion(`nadie.${MARCA_DE_TIEMPO}@turnia.gt`, contrasena);
    const claveIncorrecta = await iniciarSesion(correoErrores, 'OtraClave999');

    expect(noRegistrado.status).toBe(401);
    expect(claveIncorrecta.status).toBe(401);
    expect(noRegistrado.body.error).toEqual(claveIncorrecta.body.error);
  });

  test('una usuaria desactivada no puede iniciar sesión aunque la contraseña sea correcta', async () => {
    await request(aplicacion).post('/api/autenticacion/registro').send({
      nombre: 'Clienta Inactiva',
      correo: correoInactiva,
      contrasena,
    });
    await prisma.usuarios.update({ where: { correo: correoInactiva }, data: { activo: false } });

    const respuesta = await iniciarSesion(correoInactiva, contrasena);

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error.codigo).toBe('CREDENCIALES_INVALIDAS');
  });

  test('un token mal firmado devuelve 401 TOKEN_INVALIDO', async () => {
    const respuesta = await request(aplicacion)
      .get('/api/autenticacion/perfil')
      .set('Authorization', `Bearer ${tokenErrores}manipulado`);

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error.codigo).toBe('TOKEN_INVALIDO');
  });

  test('el perfil de una usuaria que ya no existe devuelve 404 USUARIO_NO_ENCONTRADO', async () => {
    const tokenHuerfano = generarToken({ id: '00000000-0000-4000-8000-000000000000', rol: 'clienta' });

    const respuesta = await request(aplicacion)
      .get('/api/autenticacion/perfil')
      .set('Authorization', `Bearer ${tokenHuerfano}`);

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.codigo).toBe('USUARIO_NO_ENCONTRADO');
  });

  test('PATCH /perfil sin nombre devuelve 400 y un teléfono vacío se guarda como null', async () => {
    const sinNombre = await request(aplicacion)
      .patch('/api/autenticacion/perfil')
      .set('Authorization', `Bearer ${tokenErrores}`)
      .send({ nombre: '' });
    expect(sinNombre.status).toBe(400);
    expect(sinNombre.body.error.codigo).toBe('DATOS_INVALIDOS');

    const telefonoVacio = await request(aplicacion)
      .patch('/api/autenticacion/perfil')
      .set('Authorization', `Bearer ${tokenErrores}`)
      .send({ nombre: 'Clienta Errores', telefono: '   ' });
    expect(telefonoVacio.status).toBe(200);
    expect(telefonoVacio.body.datos.telefono).toBeNull();
    expect(telefonoVacio.body.datos.contrasena_hash).toBeUndefined();
  });

  test('PATCH /correo sin contraseña actual o con una incorrecta devuelve 401', async () => {
    const sinContrasena = await request(aplicacion)
      .patch('/api/autenticacion/correo')
      .set('Authorization', `Bearer ${tokenErrores}`)
      .send({ correoNuevo: correoCambiado });
    const incorrecta = await request(aplicacion)
      .patch('/api/autenticacion/correo')
      .set('Authorization', `Bearer ${tokenErrores}`)
      .send({ correoNuevo: correoCambiado, contrasenaActual: 'OtraClave999' });

    expect(sinContrasena.status).toBe(401);
    expect(incorrecta.status).toBe(401);
    expect(incorrecta.body.error.codigo).toBe('CREDENCIALES_INVALIDAS');
  });

  test('PATCH /correo con un correo inválido devuelve 400', async () => {
    const respuesta = await request(aplicacion)
      .patch('/api/autenticacion/correo')
      .set('Authorization', `Bearer ${tokenErrores}`)
      .send({ correoNuevo: 'correo-sin-arroba', contrasenaActual: contrasena });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
  });

  test('PATCH /correo válido cambia el correo: se inicia sesión con el nuevo y no con el anterior', async () => {
    const respuesta = await request(aplicacion)
      .patch('/api/autenticacion/correo')
      .set('Authorization', `Bearer ${tokenErrores}`)
      .send({ correoNuevo: `  ${correoCambiado.toUpperCase()} `, contrasenaActual: contrasena });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.correo).toBe(correoCambiado);
    expect((await iniciarSesion(correoCambiado, contrasena)).status).toBe(200);
    expect((await iniciarSesion(correoErrores, contrasena)).status).toBe(401);
  });

  test('PATCH /contrasena sin contraseña actual devuelve 401 y con una nueva corta devuelve 400', async () => {
    const sinActual = await request(aplicacion)
      .patch('/api/autenticacion/contrasena')
      .set('Authorization', `Bearer ${tokenErrores}`)
      .send({ contrasenaNueva: 'ClaveNueva12345' });
    const nuevaCorta = await request(aplicacion)
      .patch('/api/autenticacion/contrasena')
      .set('Authorization', `Bearer ${tokenErrores}`)
      .send({ contrasenaActual: contrasena, contrasenaNueva: 'corta' });

    expect(sinActual.status).toBe(401);
    expect(nuevaCorta.status).toBe(400);
    expect(nuevaCorta.body.error.codigo).toBe('DATOS_INVALIDOS');
    // La contraseña no cambió: la original sigue sirviendo.
    expect((await iniciarSesion(correoCambiado, contrasena)).status).toBe(200);
  });
});
