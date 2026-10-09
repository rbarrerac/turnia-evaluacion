/**
 * Módulo: Pruebas unitarias del middleware centralizado de manejo de errores
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 07/10/2026
 */

import { jest } from '@jest/globals';
import { manejadorErrores } from '../../src/middlewares/manejadorErrores.js';

// Respuesta de Express mínima: guarda el código y el cuerpo para poder comprobarlos.
function crearRespuestaSimulada() {
  const respuesta = { codigo: null, cuerpo: null };
  respuesta.status = (codigo) => {
    respuesta.codigo = codigo;
    return respuesta;
  };
  respuesta.json = (cuerpo) => {
    respuesta.cuerpo = cuerpo;
    return respuesta;
  };
  return respuesta;
}

function errorDeNegocio(codigo, mensaje, codigoHttp, detalles) {
  const error = new Error(mensaje);
  Object.assign(error, { codigo, mensaje, codigoHttp });
  if (detalles !== undefined) error.detalles = detalles;
  return error;
}

describe('manejadorErrores', () => {
  let espiaDeErrores;

  beforeEach(() => {
    espiaDeErrores = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    espiaDeErrores.mockRestore();
  });

  test('un error inesperado responde 500 ERROR_INTERNO con mensaje genérico y se registra en consola', () => {
    const respuesta = crearRespuestaSimulada();
    const inesperado = new Error('Cannot read properties of undefined (detalle interno)');

    manejadorErrores(inesperado, {}, respuesta, () => {});

    expect(respuesta.codigo).toBe(500);
    expect(respuesta.cuerpo).toEqual({
      exito: false,
      error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado en el servidor.' },
    });
    // El mensaje interno nunca llega al cliente, pero sí queda en el registro del servidor.
    expect(JSON.stringify(respuesta.cuerpo)).not.toContain('detalle interno');
    expect(espiaDeErrores).toHaveBeenCalledWith(inesperado);
  });

  test('un error de negocio responde con su código HTTP, su código y sus detalles, sin registrarse', () => {
    const respuesta = crearRespuestaSimulada();
    const detalles = { citas: [{ id: 'cita-1' }] };

    manejadorErrores(
      errorDeNegocio('CONFLICTO_CON_CITAS', 'Hay citas afectadas.', 409, detalles),
      {},
      respuesta,
      () => {},
    );

    expect(respuesta.codigo).toBe(409);
    expect(respuesta.cuerpo).toEqual({
      exito: false,
      error: { codigo: 'CONFLICTO_CON_CITAS', mensaje: 'Hay citas afectadas.', detalles },
    });
    expect(espiaDeErrores).not.toHaveBeenCalled();
  });

  test('un error de negocio sin detalles no agrega la propiedad "detalles"', () => {
    const respuesta = crearRespuestaSimulada();

    manejadorErrores(errorDeNegocio('DATOS_INVALIDOS', 'Dato inválido.', 400), {}, respuesta, () => {});

    expect(respuesta.codigo).toBe(400);
    expect(respuesta.cuerpo.error).not.toHaveProperty('detalles');
  });

  test('el código P2023 de Prisma (id mal formado) se traduce a 400 DATOS_INVALIDOS sin detalles', () => {
    const respuesta = crearRespuestaSimulada();
    const errorPrisma = new Error('Inconsistent column data: Error creating UUID');
    errorPrisma.code = 'P2023';
    errorPrisma.detalles = 'no debe exponerse';

    manejadorErrores(errorPrisma, {}, respuesta, () => {});

    expect(respuesta.codigo).toBe(400);
    expect(respuesta.cuerpo.error).toEqual({
      codigo: 'DATOS_INVALIDOS',
      mensaje: 'El identificador recibido no tiene un formato válido.',
    });
    expect(espiaDeErrores).not.toHaveBeenCalled();
  });

  test('otros códigos de Prisma no se traducen: se tratan como error interno (500)', () => {
    const respuesta = crearRespuestaSimulada();
    const errorPrisma = new Error('Unique constraint failed');
    errorPrisma.code = 'P2002';

    manejadorErrores(errorPrisma, {}, respuesta, () => {});

    expect(respuesta.codigo).toBe(500);
    expect(respuesta.cuerpo.error.codigo).toBe('ERROR_INTERNO');
  });
});
