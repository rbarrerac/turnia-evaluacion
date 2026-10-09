/**
 * Módulo: Pruebas unitarias de la carga de variables de entorno y del endpoint de salud
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 07/10/2026
 */

import path from 'node:path';
import request from 'supertest';
import aplicacion from '../../src/aplicacion.js';
import prisma from '../../src/configuracion/baseDeDatos.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('configuracion/entorno.js', () => {
  test('si falta una variable obligatoria, falla al cargar e indica cuál falta y qué hacer', async () => {
    const jwtOriginal = process.env.JWT_SECRET;
    // Cadena vacía (no `delete`): dotenv no sobreescribe una variable ya definida,
    // así que el .env de la máquina no puede volver a completarla.
    process.env.JWT_SECRET = '';
    try {
      // El parámetro de consulta obliga a evaluar el módulo de nuevo (otra instancia
      // en la caché de módulos ES), sin afectar al que ya usa la aplicación.
      await expect(import('../../src/configuracion/entorno.js?sin-jwt')).rejects.toThrow(
        /Faltan variables de entorno obligatorias: JWT_SECRET\..*api\/\.env\.example/,
      );
    } finally {
      process.env.JWT_SECRET = jwtOriginal;
    }
  });

  test('con todas las variables obligatorias carga sin error y expone sus valores', async () => {
    const { entorno } = await import('../../src/configuracion/entorno.js?completo');

    expect(entorno.jwtSecret).toBe(process.env.JWT_SECRET);
    expect(entorno.puertoApi).toBe(process.env.PUERTO_API);
    expect(entorno.directorioSubidas.endsWith('trabajos')).toBe(true);
  });

  test('sin DIRECTORIO_SUBIDAS usa almacenamiento/trabajos dentro de la carpeta actual', async () => {
    const directorioOriginal = process.env.DIRECTORIO_SUBIDAS;
    process.env.DIRECTORIO_SUBIDAS = '';
    try {
      const { entorno } = await import('../../src/configuracion/entorno.js?sin-directorio');

      expect(entorno.directorioSubidas).toBe(path.resolve(process.cwd(), 'almacenamiento', 'trabajos'));
    } finally {
      if (directorioOriginal === undefined) delete process.env.DIRECTORIO_SUBIDAS;
      else process.env.DIRECTORIO_SUBIDAS = directorioOriginal;
    }
  });

  test('con DIRECTORIO_SUBIDAS relativo lo convierte en ruta absoluta', async () => {
    const directorioOriginal = process.env.DIRECTORIO_SUBIDAS;
    process.env.DIRECTORIO_SUBIDAS = path.join('otra-carpeta', 'fotos');
    try {
      const { entorno } = await import('../../src/configuracion/entorno.js?directorio-relativo');

      expect(path.isAbsolute(entorno.directorioSubidas)).toBe(true);
      expect(entorno.directorioSubidas).toBe(path.resolve('otra-carpeta', 'fotos'));
    } finally {
      if (directorioOriginal === undefined) delete process.env.DIRECTORIO_SUBIDAS;
      else process.env.DIRECTORIO_SUBIDAS = directorioOriginal;
    }
  });
});

describe('GET /api/salud', () => {
  test('es público y responde 200 con estado "activo"', async () => {
    const respuesta = await request(aplicacion).get('/api/salud');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ exito: true, datos: { estado: 'activo' } });
  });
});
